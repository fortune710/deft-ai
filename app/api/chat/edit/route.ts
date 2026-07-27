import { NextRequest, NextResponse } from 'next/server';
import { generateEditProposal } from '@/lib/ai/instant-execution-generator';
import { logger } from '@/lib/logger.server';
import { ScriptGenerationError } from '@/lib/errors/content-generation/scripts';
import { api } from '@/convex/_generated/api';
import { ConvexServerAuthError, getAuthenticatedConvexClient, toUserContentProfile } from '@/lib/convex/server';
import type { Id } from '@/convex/_generated/dataModel';
import { generateAttachmentAwareEdit } from '@/lib/ai/attachments/chat-agent';
import { anchorEditProposalsToCurrentContent } from '@/lib/script-editing/proposals';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let log = logger.child({ endpoint: 'api/chat/edit' });

  try {
    const body = await req.json();
    const { editRequest = '', currentContent, sessionId = 'unknown', model = 'unknown', messageId = '' } = body;

    const authenticated = await getAuthenticatedConvexClient('edit_script');
    const userId = authenticated.userId;

    log = log.child({ sessionId, model, userId });
    log.info('Processing edit request', { editRequestLength: editRequest?.length });

    if (!editRequest || !messageId) {
      throw new ScriptGenerationError(
        'Edit request and message ID are required',
        model,
        editRequest,
        userId,
        sessionId
      );
    }



    const profileDocument = await authenticated.convex.query(api.userContentProfiles.getCurrent, {});
    const profile = toUserContentProfile(profileDocument);
    const messageContext = await authenticated.convex.query(api.scriptChats.getMessageContext, {
      messageId: messageId as Id<'script_chat_messages'>,
    });
    if (messageContext.message.content !== editRequest) {
      return NextResponse.json({ error: 'Message content does not match the saved chat message' }, { status: 409 });
    }

    let result;
    try {
      result = messageContext.message.attachment_refs?.length
        ? await generateAttachmentAwareEdit({
            request: editRequest,
            currentContent,
            userProfile: profile,
            modelName: model,
            userId,
            messageId: messageId as Id<'script_chat_messages'>,
            convex: authenticated.convex,
            history: messageContext.history.map((message) => ({ role: message.role, content: message.content })),
          })
        : await generateEditProposal(
            editRequest,
            currentContent,
            profile,
            model,
            userId,
            sessionId,
          );
    } catch (genError) {
      throw new ScriptGenerationError(
        genError instanceof Error ? genError.message : 'Failed to generate edit proposal',
        model,
        editRequest,
        userId,
        sessionId
      );
    }

    const anchoredChanges = anchorEditProposalsToCurrentContent(
      result.proposedChanges ?? [],
      currentContent,
      userId,
    );
    if (!anchoredChanges.length) {
      log.warn('Generated edit proposals did not match the current script snapshot', {
        userId,
        action: 'validate_edit_proposals_against_current_script',
        sessionId,
        generatedProposalCount: result.proposedChanges?.length ?? 0,
        statusCode: 422,
      });
      return NextResponse.json(
        {
          error:
            'The assistant could not anchor its suggestions to the current script. Please try again.',
        },
        { status: 422 },
      );
    }
    result = { ...result, proposedChanges: anchoredChanges };

    log.info('Generated edit proposal successfully', {
      content: result.content,
      proposedChangesCount: result.proposedChanges?.length || 0,
      proposedChanges: result.proposedChanges,
      duration: Date.now() - startTime
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ConvexServerAuthError) {
      log.error('Convex authentication failed for script edit', {
        userId: 'signed_out',
        action: 'edit_script',
        statusCode: error.statusCode,
        error,
      });
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    if (error instanceof ScriptGenerationError) {
      log.error('Script generation error encountered', {
        err: error,
        duration: Date.now() - startTime,
        model: error.model,
        userId: error.userId,
        sessionId: error.sessionId,
      });

      const status = error.message === 'Edit request and message ID are required' ? 400 :
        error.message === 'Unauthorized' ? 401 : 500;

      return NextResponse.json({ error: error.message }, { status });
    }

    log.error('Unexpected error generating edit proposal', {
      err: error instanceof Error ? error : new Error(String(error)),
      duration: Date.now() - startTime,
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}
