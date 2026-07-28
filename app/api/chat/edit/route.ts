import { NextRequest, NextResponse } from 'next/server';

import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import {
  runScriptEditAgent,
  ScriptEditQualityError,
} from '@/lib/ai/agents/script-edit-agent';
import {
  ConvexServerAuthError,
  getAuthenticatedConvexClient,
  toUserContentProfile,
} from '@/lib/convex/server';
import { ScriptGenerationError } from '@/lib/errors/content-generation/scripts';
import { logger } from '@/lib/logger.server';
import { materializeSuggestionsForGeneration } from '@/lib/script-editing/proposals';
import { AI_MODELS, type AIModelName } from '@/types/ai-models';
import type { EditorContent } from '@/types/script-chat';

const supportedModels = new Set<AIModelName>(
  Object.values(AI_MODELS).map((definition) => definition.model),
);

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  let requestUserId = 'unknown';
  let log = logger.child({
    module: 'app/api/chat/edit/route',
    userId: 'unknown',
  });

  try {
    const body = await request.json() as Record<string, unknown>;
    const editRequest =
      typeof body.editRequest === 'string' ? body.editRequest.trim() : '';
    const sessionId =
      typeof body.sessionId === 'string' ? body.sessionId : 'unknown';
    const messageId =
      typeof body.messageId === 'string' ? body.messageId : '';
    const requestedModel =
      typeof body.model === 'string' ? body.model : '';
    const model = supportedModels.has(requestedModel as AIModelName)
      ? requestedModel as AIModelName
      : AI_MODELS.GOOGLE_PRO.model;
    const currentContent = body.currentContent;
    const hasLegacyEditorContent =
      typeof currentContent === 'object' &&
      currentContent !== null &&
      'fullScript' in currentContent &&
      typeof currentContent.fullScript === 'string';

    const authenticated = await getAuthenticatedConvexClient('edit_script');
    const userId = authenticated.userId;
    requestUserId = userId;
    log = logger.child({
      module: 'app/api/chat/edit/route',
      userId,
      sessionId,
      model,
    });

    if (!editRequest || !messageId) {
      log.warn('Rejected an incomplete script edit request', {
        userId,
        action: 'validate_script_edit_request',
        statusCode: 400,
        hasEditRequest: Boolean(editRequest),
        hasMessageId: Boolean(messageId),
      });
      throw new ScriptGenerationError(
        'Edit request and message ID are required',
        model,
        editRequest,
        userId,
        sessionId,
      );
    }

    if (
      currentContent === null ||
      currentContent === undefined ||
      (typeof currentContent === 'string' && !currentContent.trim()) ||
      (typeof currentContent !== 'string' && !hasLegacyEditorContent)
    ) {
      log.warn('Rejected a script edit request without a current draft', {
        userId,
        action: 'validate_script_edit_request',
        statusCode: 400,
        currentContentType: typeof currentContent,
      });
      throw new ScriptGenerationError(
        'The current script is required',
        model,
        editRequest,
        userId,
        sessionId,
      );
    }

    const currentScript: string | EditorContent =
      typeof currentContent === 'string'
        ? materializeSuggestionsForGeneration(currentContent, userId)
        : currentContent as EditorContent;
    const serializedScript =
      typeof currentScript === 'string'
        ? currentScript
        : JSON.stringify(currentScript);

    log.info('Processing a full-context script edit request', {
      userId,
      action: 'generate_script_edit_suggestions',
      editRequestLength: editRequest.length,
      currentScriptLength: serializedScript.length,
      statusCode: 200,
    });

    const [profileDocument, messageContext] = await Promise.all([
      authenticated.convex.query(api.userContentProfiles.getCurrent, {}),
      authenticated.convex.query(api.scriptChats.getMessageContext, {
        messageId: messageId as Id<'script_chat_messages'>,
      }),
    ]);
    const profile = toUserContentProfile(profileDocument);

    if (messageContext.message.content.trim() !== editRequest) {
      log.warn('Rejected an edit request that did not match its saved message', {
        userId,
        action: 'validate_script_edit_message',
        messageId,
        statusCode: 409,
      });
      return NextResponse.json(
        { error: 'Message content does not match the saved chat message' },
        { status: 409 },
      );
    }

    let generated;
    try {
      generated = await runScriptEditAgent({
        userId,
        sessionId,
        modelName: model,
        editRequest,
        currentContent: currentScript,
        userProfile: profile,
        attachmentContext: {
          messageId: messageId as Id<'script_chat_messages'>,
          convex: authenticated.convex,
          history: messageContext.history.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          hasAttachments: Boolean(
            messageContext.message.attachment_refs?.length,
          ),
        },
      });
    } catch (error) {
      if (error instanceof ScriptEditQualityError) throw error;
      throw new ScriptGenerationError(
        error instanceof Error
          ? error.message
          : 'Failed to generate edit suggestions',
        model,
        editRequest,
        userId,
        sessionId,
      );
    }

    const proposedChanges = generated.proposedChanges ?? [];
    if (!proposedChanges.length) {
      log.warn('Generated suggestions did not contain a safe current-script range', {
        userId,
        action: 'validate_script_edit_suggestions',
        generatedProposalCount: generated.proposedChanges?.length ?? 0,
        statusCode: 422,
      });
      return NextResponse.json(
        {
          error:
            'The assistant could not create independent suggestions from the current script. Please try again.',
        },
        { status: 422 },
      );
    }

    log.info('Generated independent script edit suggestions', {
      userId,
      action: 'generate_script_edit_suggestions',
      proposalCount: proposedChanges.length,
      verificationAttemptCount: generated.attemptCount,
      usedAttachments: Boolean(
        messageContext.message.attachment_refs?.length,
      ),
      durationMs: Date.now() - startedAt,
      statusCode: 200,
    });

    return NextResponse.json({
      content: generated.content,
      proposedChanges,
    });
  } catch (error) {
    if (error instanceof ConvexServerAuthError) {
      log.error('Convex authentication failed for script editing', {
        userId: 'signed_out',
        action: 'generate_script_edit_suggestions',
        statusCode: error.statusCode,
        error,
      });
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }

    if (error instanceof ScriptEditQualityError) {
      log.warn('Script edits did not pass quality verification', {
        userId: requestUserId,
        action: 'verify_script_edit_suggestions',
        statusCode: 422,
        issueCount: error.issues.length,
        issues: error.issues,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        {
          error:
            'The assistant could not produce a sufficiently complete edit. Please try again.',
        },
        { status: 422 },
      );
    }

    if (error instanceof ScriptGenerationError) {
      const statusCode =
        error.message === 'Edit request and message ID are required' ||
        error.message === 'The current script is required'
          ? 400
          : 500;
      log.error('Script edit suggestion generation failed', {
        userId: error.userId ?? 'unknown',
        action: 'generate_script_edit_suggestions',
        statusCode,
        model: error.model,
        sessionId: error.sessionId,
        durationMs: Date.now() - startedAt,
        error,
      });
      return NextResponse.json(
        { error: error.message },
        { status: statusCode },
      );
    }

    log.error('Unexpected script edit suggestion error', {
      userId: 'unknown',
      action: 'generate_script_edit_suggestions',
      statusCode: 500,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error : new Error(String(error)),
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to process edit request',
      },
      { status: 500 },
    );
  }
}
