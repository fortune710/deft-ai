import { z } from 'zod';
import { getModel } from './models/get-model';
import { AI_MODELS, AIModelName, getModelConfig } from '@/types/ai-models';
import type { UserContentProfile } from '@/types/niche-mapping';
import type { InstantExecutionOutput, EditProposal } from '@/types/script-chat';
import { logger } from '@/lib/logger.server';

/**
 * Zod schemas for structured outputs
 */
const HookOptionSchema = z.object({
  id: z.string(),
  text: z.string().describe("First 3-5 second hook (under 10 words)"),
  psychologyType: z.string().describe("Psychology principle (e.g., Curiosity Gap, Social Proof, Pattern Interrupt, etc.)")
});

const VisualSceneSchema = z.object({
  timeRange: z.string(),
  contentDescription: z.string(),
  bRollSuggestions: z.array(z.string()),
  onScreenText: z.array(z.string()),
  transitionNotes: z.string().optional()
});

const InstantExecutionOutputSchema = z.object({
  hookOptions: z.array(HookOptionSchema),
  selectedHook: z.string(),
  fullScript: z.string().describe("Complete script with timing markers"),
  visualDirection: z.array(VisualSceneSchema),
  platformMetadata: z.object({
    captions: z.string().optional(),
    hashtags: z.array(z.string()).optional(),
    platformSpecificNotes: z.string().optional()
  }),
  thumbnailStrategy: z.object({
    imagePrompt: z.string(),
    overlayTextOptions: z.array(z.string())
  }),
  goalAlignedCTA: z.string(),
  estimatedDuration: z.string()
});

const EditProposalSchema = z.object({
  content: z.string().describe("A brief explanation of the proposed changes"),
  proposedChanges: z.array(z.object({
    section: z.string().describe("A short label for the exact script section being edited"),
    scope: z.enum(["sentence", "paragraph", "section"]).describe("The size of this independent replacement"),
    before: z.string().describe("An exact contiguous substring copied verbatim from the current script"),
    after: z.string().describe("Only the replacement for before; use an empty string when deleting that passage"),
    description: z.string().describe("Why this change was made")
  }))
});

const HookVariationSchema = z.object({
  text: z.string(),
  psychologyType: z.string()
});

/**
 * Generates an initial complete video script.
 */
export async function generateInitialScript(
  prompt: string,
  userProfile: UserContentProfile | null,
  platform?: string,
  modelName: AIModelName = AI_MODELS.GOOGLE_PRO.model
): Promise<InstantExecutionOutput> {
  const log = logger.child({ module: 'InstantExecutionGenerator', operation: 'generateInitialScript', model: modelName });
  const model = getModel(getModelConfig(modelName)).withStructuredOutput(InstantExecutionOutputSchema);

  const systemPrompt = buildInstantExecutionPrompt(userProfile, platform);

  try {
    log.info('Generating initial script');
    const result = await model.invoke([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `User Request: ${prompt}` }
    ]) as any;

    return result;
  } catch (error) {
    log.error('Failed to generate initial script', error);
    throw new Error(`Failed to generate initial script: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates a specific edit proposal based on user request.
 */
export async function generateEditProposal(
  editRequest: string,
  currentContent: unknown,
  userProfile: UserContentProfile | null,
  modelName: AIModelName = AI_MODELS.GOOGLE_PRO.model,
  userId = 'unknown',
  sessionId = 'unknown',
  verificationFeedback = '',
): Promise<{ content: string; proposedChanges: EditProposal[] }> {
  const log = logger.child({
    module: 'InstantExecutionGenerator',
    operation: 'generateEditProposal',
    model: modelName,
    userId,
    sessionId,
  });
  const model = getModel(getModelConfig(modelName)).withStructuredOutput(EditProposalSchema);

  const contextContext = buildProfileContext(userProfile);

  const serializedContent =
    typeof currentContent === 'string'
      ? currentContent
      : JSON.stringify(currentContent, null, 2);
  const fullPrompt = `
Edit the current script according to the user's request.

<current_script>
${serializedContent}
</current_script>

<creator_context>
${contextContext}
</creator_context>

<edit_request>
${editRequest}
</edit_request>

Return independently actionable edit suggestions.

SUGGESTION RULES:
1. Read the ENTIRE current script before proposing changes.
2. Identify every passage affected by the request, then create one suggestion per coherent sentence, paragraph, or section.
3. There is no limit on the number of suggestions or on how much of the draft their combined changes may affect.
4. Never return the entire script as one suggestion. Never copy the full script into "before" or "after".
5. For draft-wide requests such as expanding, condensing, restructuring, changing tone, or meeting a length target, split the work into multiple non-overlapping paragraph or section suggestions.
6. Each "before" must be one exact, contiguous, verbatim substring from <current_script>. Do not paraphrase it, normalize whitespace, or use a stale version.
7. Each "after" must contain only the replacement for its own "before" range, never the complete revised script.
8. Suggestions must not overlap. A character from the current script may belong to at most one suggestion.
9. Preserve untouched content. Preserve useful Markdown structure unless the request changes it.
10. Expansion and condensation are both allowed. To remove a passage, return its exact text in "before" and an empty string in "after".
11. Keep suggestions meaningful: prefer the smallest complete passage that can be accepted or rejected without depending on another suggestion.
12. For script-level changes, evaluate every existing passage for relevance. Delete obsolete, repetitive, contradictory, off-topic, or no-longer-needed passages instead of merely rewording them.
13. Do not preserve material just because it exists in the current draft. If it weakens the requested result, create a deletion suggestion with an empty "after".

QUALITY REVIEW FEEDBACK FROM A PRIOR ATTEMPT:
${verificationFeedback || 'This is the first attempt. No prior review feedback is available.'}

Before responding, verify that every "before" exists verbatim in the current script, no ranges overlap, no suggestion covers the complete script, and the combined suggestions fully address the request.
`.trim();

  try {
    log.info('Generating edit proposal', {
      userId,
      action: 'generate_edit_proposal',
      sessionId,
      editRequestLength: editRequest.length,
      currentContentType: typeof currentContent,
      currentContentLength: serializedContent.length,
      hasVerificationFeedback: Boolean(verificationFeedback),
    });
    const result = await model.invoke([
      {
        role: 'system',
        content:
          'You are a meticulous script editor. Return exact, independently actionable replacement ranges and never a whole-document replacement.',
      },
      { role: 'user', content: fullPrompt }
    ]) as any;

    return result;
  } catch (error) {
    log.error('Failed to generate edit proposal', {
      userId,
      action: 'generate_edit_proposal',
      sessionId,
      error,
    });
    throw new Error(`Failed to generate edit proposal: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Answers questions about the script or content strategy.
 */
export async function generateAskResponse(
  question: string,
  currentContent: any,
  userProfile: UserContentProfile | null,
  modelName: AIModelName = AI_MODELS.GOOGLE_FLASH.model
): Promise<string> {
  const log = logger.child({ module: 'InstantExecutionGenerator', operation: 'generateAskResponse', model: modelName });
  const model = getModel(getModelConfig(modelName));

  const contextContext = buildProfileContext(userProfile);

  const prompt = `
You are a helpful content creation assistant. The user has a question about their video script.

---
CURRENT SCRIPT CONTENT:
${typeof currentContent === 'string' ? currentContent : JSON.stringify(currentContent, null, 2)}

---
CONTEXT:
${contextContext}

---
USER'S QUESTION:
${question}

Provide a helpful, concise, and actionable answer.
`.trim();

  try {
    log.info('Generating ask response');
    const result = await model.invoke([
      { role: 'system', content: 'You are an expert content strategist and helper.' },
      { role: 'user', content: prompt }
    ]);

    return typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
  } catch (error) {
    log.error('Failed to generate ask response', error);
    throw new Error(`Failed to generate ask response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Regenerates a specific hook variation.
 */
export async function regenerateHook(
  hookIndex: number,
  currentHooks: any[],
  guidance: string,
  userProfile: UserContentProfile | null,
  modelName: AIModelName = AI_MODELS.GOOGLE_FLASH.model
): Promise<{ text: string; psychologyType: string }> {
  const log = logger.child({ module: 'InstantExecutionGenerator', operation: 'regenerateHook', model: modelName });
  const model = getModel(getModelConfig(modelName)).withStructuredOutput(HookVariationSchema);

  const contextContext = buildProfileContext(userProfile);

  const prompt = `
You are generating a new hook variation for a video script.

---
CURRENT HOOKS:
${JSON.stringify(currentHooks, null, 2)}

---
CONTEXT:
${contextContext}

---
USER GUIDANCE:
${guidance}

Generate ONE new hook that is catchy, under 10 words, and uses a different psychology principle than the existing ones.
`.trim();

  try {
    log.info('Regenerating hook');
    const result = await model.invoke([
      { role: 'system', content: 'You are an expert at writing viral video hooks.' },
      { role: 'user', content: prompt }
    ]) as any;

    return result;
  } catch (error) {
    log.error('Failed to regenerate hook', error);
    throw new Error(`Failed to regenerate hook: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Builds a descriptive prompt containing user niche, target audience, and goals.
 */
function buildInstantExecutionPrompt(
  userProfile: UserContentProfile | null,
  platform?: string
): string {
  const nicheContext = buildProfileContext(userProfile);

  return `
You are an expert short-form video script generator. Your goal is to generate a complete, production-ready script that is optimized for watch-time and conversion.

---
STRATEGY & NICHE:
${nicheContext}

${platform ? `TARGET PLATFORM: ${platform}` : ''}

INSTRUCTIONS:
1.  **High-Energy Hooks**: The first 3 seconds are crucial. Generate high-impact hook variations.
2.  **Fast-Paced Structure**: Keep things moving with timing markers for every few seconds.
3.  **Visual Direction**: Provide clear instructions for what should be on screen (Action, B-roll, Text Overlays).
4.  **Goal Alignment**: Ensure the Call-to-Action directly serves the user's primary goal.

Return a complete structured output.
`.trim();
}

/**
 * Extracts niche and strategy details from the user profile.
 */
function buildProfileContext(userProfile: UserContentProfile | null): string {
  if (!userProfile) return "No specific user context provided.";

  const niche = userProfile.question_1_niche;
  if (!niche) return "User is in the discovery phase. Stick to general best practices.";

  return `
Niche: ${niche.niche}
Sub-niche: ${niche.subNiche}
Target Audience: ${niche.targetAudience}
Content Tone: ${niche.tone}
Content Pillars: ${niche.contentPillars?.join(', ')}
User Goal: ${userProfile.question_2_goal || 'Growth'}
Experience Level: ${userProfile.question_4_experience || 'Not specified'}
`.trim();
}
