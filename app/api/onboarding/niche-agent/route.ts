import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Command } from '@langchain/langgraph';
import { nicheDiscoveryWorkflow } from '@/lib/ai/agents/niche-discovery-agent';
import { getCheckpointer } from '@/lib/ai/agents/checkpointer';
import type { NicheAgentStreamEvent } from '@/types/niche-agent';
import { logger } from '@/lib/logger.server';

export const runtime = 'nodejs';

const log = logger.child({ module: 'app/api/onboarding/niche-agent/route' });

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action, niche, answers, threadId: requestedThreadId } = await req.json();
  if (action !== 'start' && action !== 'resume') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
  if (action === 'start' && (typeof niche !== 'string' || !niche.trim())) {
    return NextResponse.json({ error: 'A niche is required' }, { status: 400 });
  }
  if (action === 'resume' && (!requestedThreadId || !requestedThreadId.startsWith(`${userId}:`))) {
    return NextResponse.json({ error: 'Invalid checkpoint thread' }, { status: 403 });
  }

  const threadId = requestedThreadId || `${userId}:${crypto.randomUUID()}`;
  const config = { configurable: { thread_id: threadId } };
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: NicheAgentStreamEvent) => {
        controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`));
      };

      try {
        const checkpointer = await getCheckpointer();
        const graph = nicheDiscoveryWorkflow.compile({ checkpointer });
        const input = action === 'start'
          ? { initialNiche: niche.trim() }
          : new Command({ resume: answers });
        const updates = await graph.stream(input as any, { ...config, streamMode: 'updates' });

        for await (const update of updates) {
          if (!update.analyze) continue;
          const { reasoningSteps, questions, isComplete, finalNicheDescription } = update.analyze;
          for (const step of reasoningSteps || []) {
            sendEvent({ type: 'reasoning_step', data: { content: step, id: crypto.randomUUID() } });
          }
          if (isComplete && finalNicheDescription) {
            sendEvent({
              type: 'final_result',
              data: { detailedNiche: finalNicheDescription, reasoningSummary: reasoningSteps?.join(' ') || '' },
            });
          } else if (questions?.length) {
            sendEvent({ type: 'questions', data: { questions, threadId } });
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Niche analysis failed';
        log.error('Niche agent checkpoint execution failed', {
          userId, action: 'run_niche_agent', threadId, error, message,
        });
        sendEvent({ type: 'error', data: { message } });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
