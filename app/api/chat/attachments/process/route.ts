import { NextRequest, NextResponse } from 'next/server';
import type { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { getAuthenticatedConvexClient, ConvexServerAuthError } from '@/lib/convex/server';
import { logger } from '@/lib/logger.server';
import { processChatAttachmentTask } from '@/trigger/process-chat-attachment';

const log = logger.child({ file: 'app/api/chat/attachments/process/route.ts' });

export async function POST(request: NextRequest) {
  let userId = 'unknown';
  let attachmentId = 'unknown';
  try {
    const body = await request.json();
    attachmentId = typeof body.attachmentId === 'string' ? body.attachmentId : '';
    if (!attachmentId) return NextResponse.json({ error: 'Attachment ID is required' }, { status: 400 });
    const authenticated = await getAuthenticatedConvexClient('trigger_chat_attachment_processing');
    userId = authenticated.userId;
    const attachment = await authenticated.convex.query(api.scriptChatAttachments.getOwned, {
      attachmentId: attachmentId as Id<'script_chat_attachments'>,
    });
    if (attachment.processing_status === 'quarantined') {
      return NextResponse.json({ error: 'Quarantined files cannot be retried' }, { status: 409 });
    }
    const handle = await processChatAttachmentTask.trigger({ userId, attachmentId });
    log.info('Triggered attachment processing task', {
      userId,
      action: 'trigger_chat_attachment_processing',
      attachmentId,
      runId: handle.id,
      statusCode: 202,
    });
    return NextResponse.json({ runId: handle.id }, { status: 202 });
  } catch (error) {
    const statusCode = error instanceof ConvexServerAuthError ? error.statusCode : 500;
    log.error('Failed to trigger attachment processing', {
      userId,
      action: 'trigger_chat_attachment_processing',
      attachmentId,
      statusCode,
      error,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process attachment' },
      { status: statusCode },
    );
  }
}
