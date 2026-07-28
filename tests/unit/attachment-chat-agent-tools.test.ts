import { beforeEach, describe, expect, it, vi } from 'vitest';

const createdAgentOptions = vi.hoisted(
  () => [] as Array<Record<string, unknown>>,
);
const tavilyCalls = vi.hoisted(
  () => [] as Array<{ query: string; options: Record<string, unknown> }>,
);

vi.mock('langchain', () => ({
  createAgent: (options: Record<string, unknown>) => {
    createdAgentOptions.push(options);
    return {
      invoke: async () =>
        options.responseFormat
          ? {
              structuredResponse: {
                content: 'I grounded the edit in current web evidence.',
                proposedChanges: [
                  {
                    section: 'Evidence',
                    scope: 'paragraph',
                    before: 'Old evidence.',
                    after: 'Current, source-grounded evidence.',
                    description: 'Use verified current evidence.',
                  },
                ],
              },
            }
          : {
              messages: [{ content: 'A source-grounded answer.' }],
            },
    };
  },
}));

vi.mock('@/lib/ai/models/get-model', () => ({
  getModel: () => ({ model: 'test-model' }),
}));

vi.mock('@/lib/integrations/tavily', () => ({
  tavilySearch: async (
    query: string,
    options: Record<string, unknown>,
  ) => {
    tavilyCalls.push({ query, options });
    return {
      query,
      answer: 'Verified answer',
      results: [
        {
          title: 'Primary source',
          url: 'https://example.com/source',
          publishedDate: '2026-07-27',
          content: 'Current source evidence.',
        },
      ],
    };
  },
}));

import {
  createWebSearchTool,
  generateAttachmentAwareAnswer,
  generateAttachmentAwareEdit,
} from '@/lib/ai/attachments/chat-agent';
import type { Id } from '@/convex/_generated/dataModel';
import type { ConvexHttpClient } from 'convex/browser';

const baseInput = {
  request: 'Verify this claim with current web sources.',
  currentContent: 'Old evidence.',
  userProfile: null,
  modelName: 'gemini-2.5-flash' as const,
  userId: 'test-user',
  messageId: 'message-id' as Id<'script_chat_messages'>,
  convex: {} as ConvexHttpClient,
  history: [],
};

describe('attachment-aware script assistant tools', () => {
  beforeEach(() => {
    createdAgentOptions.length = 0;
    tavilyCalls.length = 0;
  });

  it('provides file and web search to answer and edit agents', async () => {
    const answer = await generateAttachmentAwareAnswer(baseInput);
    const edit = await generateAttachmentAwareEdit(baseInput);

    expect(answer).toBe('A source-grounded answer.');
    expect(edit.proposedChanges).toHaveLength(1);
    expect(createdAgentOptions).toHaveLength(2);

    for (const options of createdAgentOptions) {
      const tools = options.tools as Array<{ name: string }>;
      expect(tools.map((tool) => tool.name)).toEqual([
        'search_chat_files',
        'search_web',
      ]);
      expect(options.systemPrompt).toContain(
        'You MUST call search_web when the request asks for web research',
      );
    }
  });

  it('uses Tavily through WEB_SEARCH_API_KEY-backed search integration', async () => {
    const webSearchTool = createWebSearchTool('test-user');
    const result = await webSearchTool.invoke({
      query: 'latest creator economy research',
      topic: 'news',
    });

    expect(tavilyCalls).toEqual([
      {
        query: 'latest creator economy research',
        options: expect.objectContaining({
          topic: 'news',
          timeRange: 'week',
          searchDepth: 'advanced',
          maxResults: 5,
        }),
      },
    ]);
    expect(result).toContain('BEGIN_UNTRUSTED_WEB_SEARCH_RESULTS');
    expect(result).toContain('https://example.com/source');
  });
});
