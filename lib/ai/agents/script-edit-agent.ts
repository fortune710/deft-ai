import {
  Annotation,
  END,
  START,
  StateGraph,
} from '@langchain/langgraph';
import type { ConvexHttpClient } from 'convex/browser';
import { z } from 'zod';

import type { Id } from '@/convex/_generated/dataModel';
import {
  generateAttachmentAwareEdit,
  type AgentHistoryMessage,
} from '@/lib/ai/attachments/chat-agent';
import { generateEditProposal } from '@/lib/ai/instant-execution-generator';
import { getModel } from '@/lib/ai/models/get-model';
import { logger } from '@/lib/logger.server';
import {
  anchorEditProposalsToCurrentContent,
  isDocumentRewriteRequest,
  locateProposalSourceText,
} from '@/lib/script-editing/proposals';
import {
  AI_MODELS,
  getModelConfig,
  type AIModelName,
} from '@/types/ai-models';
import type { UserContentProfile } from '@/types/niche-mapping';
import type { EditorContent, EditProposal } from '@/types/script-chat';

const log = logger.child({ file: 'lib/ai/agents/script-edit-agent.ts' });
const MAX_EDIT_ATTEMPTS = 3;

const scriptEditVerificationSchema = z.object({
  approved: z.boolean().describe(
    'Whether the proposed changes fully satisfy the edit request at a production-quality level',
  ),
  summary: z.string().describe(
    'A concise assessment of the resulting revised script',
  ),
  issues: z.array(z.string()).describe(
    'Specific remaining problems; return an empty array when approved',
  ),
  revisionInstructions: z.string().describe(
    'Concrete instructions for the next edit attempt; return an empty string when approved',
  ),
});

export type ScriptEditVerification = z.infer<
  typeof scriptEditVerificationSchema
>;

export interface ScriptEditAttachmentContext {
  messageId: Id<'script_chat_messages'>;
  convex: ConvexHttpClient;
  history: AgentHistoryMessage[];
  hasAttachments: boolean;
}

export interface ScriptEditAgentInput {
  userId: string;
  sessionId: string;
  modelName: AIModelName;
  editRequest: string;
  currentContent: string | EditorContent;
  userProfile: UserContentProfile | null;
  attachmentContext?: ScriptEditAttachmentContext | null;
}

export interface ScriptEditAgentResult {
  content: string;
  proposedChanges: EditProposal[];
  verification: ScriptEditVerification;
  attemptCount: number;
}

export class ScriptEditQualityError extends Error {
  readonly issues: string[];

  constructor(issues: string[], userId: string, attemptCount: number) {
    super(
      issues.length > 0
        ? `Script edit quality verification failed: ${issues.join('; ')}`
        : 'Script edit quality verification failed',
    );
    this.name = 'ScriptEditQualityError';
    this.issues = issues;
    log.error('Script edit agent exhausted its quality repair attempts', {
      userId,
      action: 'reject_unverified_script_edit',
      attemptCount,
      issueCount: issues.length,
      issues,
      statusCode: 422,
    });
  }
}

export const ScriptEditState = Annotation.Root({
  userId: Annotation<string>(),
  sessionId: Annotation<string>(),
  modelName: Annotation<AIModelName>({
    reducer: (_left, right) => right,
    default: () => AI_MODELS.GOOGLE_PRO.model,
  }),
  editRequest: Annotation<string>(),
  currentContent: Annotation<string | EditorContent>(),
  userProfile: Annotation<UserContentProfile | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  attachmentContext: Annotation<ScriptEditAttachmentContext | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  content: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => '',
  }),
  proposedChanges: Annotation<EditProposal[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  verification: Annotation<ScriptEditVerification | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  verificationFeedback: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => '',
  }),
  attemptCount: Annotation<number>({
    reducer: (_left, right) => right,
    default: () => 0,
  }),
});

function replaceProposalRanges(
  target: string,
  proposals: EditProposal[],
  userId: string,
  targetName: string,
): string {
  const replacements = proposals.flatMap((proposal) => {
    const match = locateProposalSourceText(target, proposal.before, userId);
    return match
      ? [{
          start: match.index,
          end: match.index + match.length,
          after: proposal.after,
        }]
      : [];
  }).sort((left, right) => right.start - left.start);
  const preview = replacements.reduce(
    (content, replacement) =>
      `${content.slice(0, replacement.start)}${replacement.after}${content.slice(replacement.end)}`,
    target,
  );
  log.debug('Applied proposal ranges to a verification preview target', {
    userId,
    action: 'build_script_edit_verification_preview',
    targetName,
    proposalCount: proposals.length,
    appliedRangeCount: replacements.length,
    originalLength: target.length,
    previewLength: preview.length,
  });
  return preview;
}

export function buildScriptEditVerificationPreview(
  currentContent: string | EditorContent,
  proposedChanges: EditProposal[],
  userId: string,
): string {
  if (typeof currentContent === 'string') {
    const preview = replaceProposalRanges(
      currentContent,
      proposedChanges,
      userId,
      'markdown',
    );
    log.info('Built markdown script verification preview', {
      userId,
      action: 'build_script_edit_verification_preview',
      proposalCount: proposedChanges.length,
      previewLength: preview.length,
    });
    return preview;
  }

  const fullScriptChanges = proposedChanges.filter(
    (proposal) => proposal.section !== 'goalAlignedCTA',
  );
  const ctaChanges = proposedChanges.filter(
    (proposal) => proposal.section === 'goalAlignedCTA',
  );
  const preview = {
    ...currentContent,
    fullScript: replaceProposalRanges(
      currentContent.fullScript,
      fullScriptChanges,
      userId,
      'fullScript',
    ),
    goalAlignedCTA: replaceProposalRanges(
      currentContent.goalAlignedCTA,
      ctaChanges,
      userId,
      'goalAlignedCTA',
    ),
  };
  const serializedPreview = JSON.stringify(preview, null, 2);
  log.info('Built structured script verification preview', {
    userId,
    action: 'build_script_edit_verification_preview',
    proposalCount: proposedChanges.length,
    previewLength: serializedPreview.length,
  });
  return serializedPreview;
}

async function draftScriptEdit(state: typeof ScriptEditState.State) {
  const attemptCount = state.attemptCount + 1;
  log.info('Drafting script edit suggestions', {
    userId: state.userId,
    action: 'draft_script_edit_suggestions',
    sessionId: state.sessionId,
    model: state.modelName,
    attemptCount,
    hasAttachments: state.attachmentContext?.hasAttachments ?? false,
    hasVerificationFeedback: Boolean(state.verificationFeedback),
  });
  const generated = state.attachmentContext
    ? await generateAttachmentAwareEdit({
        request: state.editRequest,
        currentContent: state.currentContent,
        userProfile: state.userProfile,
        modelName: state.modelName,
        userId: state.userId,
        messageId: state.attachmentContext.messageId,
        convex: state.attachmentContext.convex,
        history: state.attachmentContext.history,
        verificationFeedback: state.verificationFeedback,
      })
    : await generateEditProposal(
        state.editRequest,
        state.currentContent,
        state.userProfile,
        state.modelName,
        state.userId,
        state.sessionId,
        state.verificationFeedback,
      );
  const proposedChanges = anchorEditProposalsToCurrentContent(
    generated.proposedChanges ?? [],
    state.currentContent,
    state.userId,
  );
  log.info('Drafted and anchored script edit suggestions', {
    userId: state.userId,
    action: 'draft_script_edit_suggestions',
    sessionId: state.sessionId,
    attemptCount,
    generatedProposalCount: generated.proposedChanges?.length ?? 0,
    anchoredProposalCount: proposedChanges.length,
  });
  return {
    content: generated.content,
    proposedChanges,
    attemptCount,
    verification: null,
  };
}

async function verifyScriptEdit(state: typeof ScriptEditState.State) {
  if (!state.proposedChanges.length) {
    const verification = {
      approved: false,
      summary: 'No independently actionable suggestions survived validation.',
      issues: [
        'Every suggestion was stale, overlapping, empty, or attempted to replace the complete script.',
      ],
      revisionInstructions:
        'Return multiple exact, non-overlapping passage replacements copied from the current script.',
    };
    log.warn('Rejected an empty script edit proposal set before model review', {
      userId: state.userId,
      action: 'verify_script_edit_suggestions',
      sessionId: state.sessionId,
      attemptCount: state.attemptCount,
      statusCode: 422,
    });
    return {
      verification,
      verificationFeedback: [
        verification.summary,
        ...verification.issues,
        verification.revisionInstructions,
      ].join('\n'),
    };
  }

  const currentScript =
    typeof state.currentContent === 'string'
      ? state.currentContent
      : JSON.stringify(state.currentContent, null, 2);
  const revisedScript = buildScriptEditVerificationPreview(
    state.currentContent,
    state.proposedChanges,
    state.userId,
  );
  const scriptLevelRequest = isDocumentRewriteRequest(
    state.editRequest,
    state.userId,
  );
  const model = getModel(
    getModelConfig(state.modelName),
  ).withStructuredOutput(scriptEditVerificationSchema);
  log.info('Reviewing the drafted script edits for request coverage and quality', {
    userId: state.userId,
    action: 'verify_script_edit_suggestions',
    sessionId: state.sessionId,
    attemptCount: state.attemptCount,
    proposalCount: state.proposedChanges.length,
    scriptLevelRequest,
    currentScriptLength: currentScript.length,
    revisedScriptLength: revisedScript.length,
  });
  const verification = await model.invoke(`You are the quality reviewer for a script editing agent. Review the resulting revised script, not merely the descriptions of the suggestions.

<user_request>
${state.editRequest}
</user_request>

<original_script>
${currentScript}
</original_script>

<proposed_changes>
${JSON.stringify(state.proposedChanges, null, 2)}
</proposed_changes>

<resulting_revised_script>
${revisedScript}
</resulting_revised_script>

REVIEW CONTRACT:
- Approve only when the resulting script fully and directly satisfies the user's request.
- Check coherence, completeness, structure, tone, pacing, clarity, and preservation of valuable unaffected material.
- Confirm every suggestion is independently useful and the combined result reads as one intentional script.
- For script-level requests, examine every original passage. Unnecessary, repetitive, contradictory, off-topic, or superseded material must be removed rather than cosmetically reworded.
- A request to condense, shorten, focus, restructure, or reduce should remove material when removal improves compliance.
- A request to expand should add substance without retaining weak repetition or obsolete material.
- Reject token edits that technically change words but do not sufficiently accomplish the requested transformation.
- Reject a result that leaves behind content made irrelevant by the requested edit.
- Do not require deletion when every original passage remains genuinely useful.
- Do not expose private chain-of-thought. Return only a concise assessment, specific issues, and actionable revision instructions.

REQUEST CLASSIFICATION:
This is ${scriptLevelRequest ? 'a script-level request, so whole-draft sufficiency and removal of unnecessary material are mandatory review criteria' : 'a targeted request, so unrelated passages should remain unchanged'}.
`) as ScriptEditVerification;
  const normalizedVerification = {
    ...verification,
    issues: verification.approved ? [] : verification.issues,
    revisionInstructions: verification.approved
      ? ''
      : verification.revisionInstructions,
  };
  log.info('Completed script edit quality review', {
    userId: state.userId,
    action: 'verify_script_edit_suggestions',
    sessionId: state.sessionId,
    attemptCount: state.attemptCount,
    approved: normalizedVerification.approved,
    issueCount: normalizedVerification.issues.length,
  });
  return {
    verification: normalizedVerification,
    verificationFeedback: normalizedVerification.approved
      ? ''
      : [
          normalizedVerification.summary,
          ...normalizedVerification.issues,
          normalizedVerification.revisionInstructions,
        ].join('\n'),
  };
}

function routeAfterVerification(state: typeof ScriptEditState.State) {
  const shouldRevise =
    !state.verification?.approved &&
    state.attemptCount < MAX_EDIT_ATTEMPTS;
  log.info('Routed script edit after quality verification', {
    userId: state.userId,
    action: 'route_verified_script_edit',
    sessionId: state.sessionId,
    attemptCount: state.attemptCount,
    approved: state.verification?.approved ?? false,
    shouldRevise,
    maximumAttempts: MAX_EDIT_ATTEMPTS,
  });
  return shouldRevise ? 'draft' : END;
}

export const scriptEditWorkflow = new StateGraph(ScriptEditState)
  .addNode('draft', draftScriptEdit)
  .addNode('verify', verifyScriptEdit)
  .addEdge(START, 'draft')
  .addEdge('draft', 'verify')
  .addConditionalEdges('verify', routeAfterVerification);

export async function runScriptEditAgent(
  input: ScriptEditAgentInput,
): Promise<ScriptEditAgentResult> {
  log.info('Running the script edit LangGraph agent', {
    userId: input.userId,
    action: 'run_script_edit_agent',
    sessionId: input.sessionId,
    model: input.modelName,
    requestLength: input.editRequest.length,
    hasAttachments: input.attachmentContext?.hasAttachments ?? false,
    maximumAttempts: MAX_EDIT_ATTEMPTS,
  });
  const result = await scriptEditWorkflow.compile().invoke({
    ...input,
    attachmentContext: input.attachmentContext ?? null,
  });
  if (!result.verification?.approved) {
    throw new ScriptEditQualityError(
      result.verification?.issues ?? [],
      input.userId,
      result.attemptCount,
    );
  }
  log.info('Completed the verified script edit LangGraph agent', {
    userId: input.userId,
    action: 'run_script_edit_agent',
    sessionId: input.sessionId,
    attemptCount: result.attemptCount,
    proposalCount: result.proposedChanges.length,
    approved: true,
  });
  return {
    content: result.content,
    proposedChanges: result.proposedChanges,
    verification: result.verification,
    attemptCount: result.attemptCount,
  };
}
