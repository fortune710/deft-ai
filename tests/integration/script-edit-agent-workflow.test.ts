import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EditProposal } from '@/types/script-chat';

const generationFeedback = vi.hoisted(() => [] as string[]);
const generatedResponses = vi.hoisted(
  () => [] as Array<{ content: string; proposedChanges: EditProposal[] }>,
);
const verificationPrompts = vi.hoisted(() => [] as string[]);
const verificationResponses = vi.hoisted(
  () => [] as Array<{
    approved: boolean;
    summary: string;
    issues: string[];
    revisionInstructions: string;
  }>,
);

vi.mock('@/lib/ai/instant-execution-generator', () => ({
  generateEditProposal: async (
    _request: string,
    _content: unknown,
    _profile: unknown,
    _model: string,
    _userId: string,
    _sessionId: string,
    feedback: string,
  ) => {
    generationFeedback.push(feedback);
    const response = generatedResponses.shift();
    if (!response) throw new Error('Missing generated edit fixture');
    return response;
  },
}));

vi.mock('@/lib/ai/attachments/chat-agent', () => ({
  generateAttachmentAwareEdit: vi.fn(),
}));

vi.mock('@/lib/ai/models/get-model', () => ({
  getModel: () => ({
    withStructuredOutput: () => ({
      invoke: async (prompt: string) => {
        verificationPrompts.push(prompt);
        const response = verificationResponses.shift();
        if (!response) throw new Error('Missing verification fixture');
        return response;
      },
    }),
  }),
}));

import {
  runScriptEditAgent,
  ScriptEditQualityError,
} from '@/lib/ai/agents/script-edit-agent';

const originalScript = [
  'Weak opening paragraph.',
  '',
  'Obsolete aside that no longer supports the script.',
  '',
  'Weak closing paragraph.',
].join('\n');

const revisedSuggestions: EditProposal[] = [
  {
    section: 'Opening',
    scope: 'paragraph',
    before: 'Weak opening paragraph.',
    after: 'A focused opening establishes the new argument.',
    description: 'Strengthen and focus the opening.',
  },
  {
    section: 'Obsolete aside',
    scope: 'paragraph',
    before: 'Obsolete aside that no longer supports the script.',
    after: '',
    description: 'Remove material that no longer supports the edit.',
  },
  {
    section: 'Closing',
    scope: 'paragraph',
    before: 'Weak closing paragraph.',
    after: 'A decisive closing resolves the argument.',
    description: 'Make the ending support the revised direction.',
  },
];

describe('script edit LangGraph agent', () => {
  beforeEach(() => {
    generationFeedback.length = 0;
    generatedResponses.length = 0;
    verificationPrompts.length = 0;
    verificationResponses.length = 0;
  });

  it('reviews an insufficient edit and regenerates with deletion feedback', async () => {
    generatedResponses.push(
      {
        content: 'I strengthened the opening.',
        proposedChanges: [revisedSuggestions[0]],
      },
      {
        content: 'I revised the complete script and removed obsolete material.',
        proposedChanges: revisedSuggestions,
      },
    );
    verificationResponses.push(
      {
        approved: false,
        summary: 'The opening changed, but the script-level request is incomplete.',
        issues: ['The obsolete aside remains and the closing is still weak.'],
        revisionInstructions:
          'Delete the obsolete aside and revise the closing as independent suggestions.',
      },
      {
        approved: true,
        summary: 'The revised script is focused and complete.',
        issues: [],
        revisionInstructions: '',
      },
    );

    const result = await runScriptEditAgent({
      userId: 'test-user',
      sessionId: 'test-session',
      modelName: 'gemini-2.5-flash',
      editRequest:
        'Restructure the whole script around one focused argument and remove anything unnecessary.',
      currentContent: originalScript,
      userProfile: null,
    });

    expect(result.attemptCount).toBe(2);
    expect(result.verification.approved).toBe(true);
    expect(result.proposedChanges).toEqual(revisedSuggestions);
    expect(generationFeedback[0]).toBe('');
    expect(generationFeedback[1]).toContain('obsolete aside remains');
    expect(generationFeedback[1]).toContain('Delete the obsolete aside');

    const secondReview = verificationPrompts[1];
    const revisedPreview = secondReview
      .split('<resulting_revised_script>')[1]
      .split('</resulting_revised_script>')[0];
    expect(revisedPreview).not.toContain(
      'Obsolete aside that no longer supports the script.',
    );
    expect(revisedPreview).toContain(
      'A decisive closing resolves the argument.',
    );
  });

  it('refuses to return suggestions that fail every quality review', async () => {
    generatedResponses.push(
      ...Array.from({ length: 3 }, () => ({
        content: 'I changed only the opening.',
        proposedChanges: [revisedSuggestions[0]],
      })),
    );
    verificationResponses.push(
      ...Array.from({ length: 3 }, () => ({
        approved: false,
        summary: 'The script-level edit remains incomplete.',
        issues: ['Unnecessary material still remains.'],
        revisionInstructions: 'Remove obsolete material and finish the edit.',
      })),
    );

    await expect(
      runScriptEditAgent({
        userId: 'test-user',
        sessionId: 'quality-failure-session',
        modelName: 'gemini-2.5-flash',
        editRequest: 'Condense the whole script and remove unnecessary parts.',
        currentContent: originalScript,
        userProfile: null,
      }),
    ).rejects.toBeInstanceOf(ScriptEditQualityError);
    expect(generationFeedback).toHaveLength(3);
    expect(verificationPrompts).toHaveLength(3);
  });
});
