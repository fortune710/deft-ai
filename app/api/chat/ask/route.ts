import { NextRequest } from 'next/server';
import { generateAskResponse } from '@/lib/ai/instant-execution-generator';
import { ScriptGeneratorServerTracking } from '@/lib/posthog/server';
import { logger } from '@/lib/logger.server';
import { api } from '@/convex/_generated/api';
import { ConvexServerAuthError, getAuthenticatedConvexClient, toUserContentProfile } from '@/lib/convex/server';
import type { Id } from '@/convex/_generated/dataModel';
import { generateAttachmentAwareAnswer } from '@/lib/ai/attachments/chat-agent';

const log = logger.child({ module: 'app/api/chat/ask/route' });

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;
  let questionLength: number | undefined;
  let model: string | undefined;

  try {
    const body = await req.json();
    const { question, currentContent, sessionId, messageId } = body;
    model = body.model;
    log.info('Processing ask request', {
      userId: 'pending_authentication',
      action: 'ask_script_question',
      sessionId,
      model,
      questionLength: question?.length,
    });
    questionLength = question?.length;

    if (!question || !messageId) {
      await ScriptGeneratorServerTracking.ask({
        status: 400,
        model,
        error: 'Question and message ID are required',
        duration: Date.now() - startTime,
      });
      return new Response(JSON.stringify({ error: 'Question and message ID are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const authenticated = await getAuthenticatedConvexClient('ask_script_question');
    userId = authenticated.userId;
    const profileDocument = await authenticated.convex.query(api.userContentProfiles.getCurrent, {});
    const profile = toUserContentProfile(profileDocument);
    const messageContext = await authenticated.convex.query(api.scriptChats.getMessageContext, {
      messageId: messageId as Id<'script_chat_messages'>,
    });
    if (messageContext.message.content !== question) {
      return new Response(JSON.stringify({ error: 'Message content does not match the saved chat message' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const response = messageContext.message.attachment_refs?.length
      ? await generateAttachmentAwareAnswer({
          request: question,
          currentContent,
          userProfile: profile,
          modelName: model as any,
          userId,
          messageId: messageId as Id<'script_chat_messages'>,
          convex: authenticated.convex,
          history: messageContext.history.map((message) => ({ role: message.role, content: message.content })),
        })
      : await generateAskResponse(question, currentContent, profile, model as any);

    await ScriptGeneratorServerTracking.ask({
      questionLength,
      userId,
      model,
      status: 200,
      duration: Date.now() - startTime,
    });

    return new Response(JSON.stringify({ response }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const status = error instanceof ConvexServerAuthError ? error.statusCode : 500;
    log.error('Failed to generate ask response', {
      userId: userId || 'unknown',
      action: 'ask_script_question',
      statusCode: status,
      error,
      message: error instanceof Error ? error.message : String(error),
    });
    await ScriptGeneratorServerTracking.ask({
      questionLength,
      userId,
      model,
      status,
      error: error instanceof Error ? error.message : 'Failed to generate response',
      duration: Date.now() - startTime,
    });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate response' }),
      {
        status,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
