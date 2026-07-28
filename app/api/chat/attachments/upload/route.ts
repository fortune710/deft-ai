import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import {
  CHAT_ATTACHMENT_ALLOWED_EXTENSIONS,
  CHAT_ATTACHMENT_ALLOWED_MIME_TYPES,
  CHAT_ATTACHMENT_MAX_BYTES,
} from '@/lib/ai/attachments/constants';
import { validateFileSignature } from '@/lib/ai/attachments/ingestion';
import { ConvexServerAuthError, getAuthenticatedConvexClient } from '@/lib/convex/server';
import { logger } from '@/lib/logger.server';

const log = logger.child({ file: 'app/api/chat/attachments/upload/route.ts' });
type ParentId = Id<'script_chat_sessions'> | Id<'content_items'>;

const mimeByExtension: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

export async function POST(request: NextRequest) {
  let userId = 'unknown';
  let parentId = 'unknown';
  let fileName = 'unknown';
  let storageId: Id<'_storage'> | null = null;
  let registrationStarted = false;
  try {
    const authenticated = await getAuthenticatedConvexClient('upload_chat_attachment');
    userId = authenticated.userId;
    const workerSecret = process.env.TRIGGER_CONVEX_SECRET;
    if (!workerSecret) throw new Error('TRIGGER_CONVEX_SECRET is not configured');

    const formData = await request.formData();
    const parentValue = formData.get('parentId');
    const fileValue = formData.get('file');
    parentId = typeof parentValue === 'string' ? parentValue : '';
    if (!parentId || !(fileValue instanceof File)) {
      log.warn('Rejected an incomplete chat attachment upload', {
        userId,
        action: 'upload_chat_attachment',
        parentId,
        statusCode: 400,
      });
      return NextResponse.json({ error: 'A chat and file are required' }, { status: 400 });
    }

    fileName = fileValue.name.split(/[\\/]/).pop()?.trim() || 'attachment';
    const extension = `.${fileName.split('.').pop()?.toLowerCase() ?? ''}`;
    const normalizedMimeType = fileValue.type || mimeByExtension[extension] || '';
    const validExtension = CHAT_ATTACHMENT_ALLOWED_EXTENSIONS.includes(
      extension as (typeof CHAT_ATTACHMENT_ALLOWED_EXTENSIONS)[number],
    );
    const validMimeType = CHAT_ATTACHMENT_ALLOWED_MIME_TYPES.includes(
      normalizedMimeType as (typeof CHAT_ATTACHMENT_ALLOWED_MIME_TYPES)[number],
    );
    if (fileValue.size <= 0 || fileValue.size > CHAT_ATTACHMENT_MAX_BYTES) {
      log.warn('Rejected chat attachment outside the size boundary', {
        userId,
        action: 'upload_chat_attachment',
        parentId,
        fileName,
        fileSize: fileValue.size,
        statusCode: 413,
      });
      return NextResponse.json({ error: 'Each file must be 50 MB or smaller' }, { status: 413 });
    }
    if (!validExtension || !validMimeType || mimeByExtension[extension] !== normalizedMimeType) {
      log.warn('Rejected unsupported chat attachment metadata', {
        userId,
        action: 'upload_chat_attachment',
        parentId,
        fileName,
        mimeType: normalizedMimeType,
        statusCode: 415,
      });
      return NextResponse.json(
        { error: 'The file extension and type do not match a supported format' },
        { status: 415 },
      );
    }

    const buffer = Buffer.from(await fileValue.arrayBuffer());
    if (!validateFileSignature(buffer, normalizedMimeType, userId, 'pending-upload')) {
      log.warn('Rejected a chat attachment with a mismatched signature', {
        userId,
        action: 'upload_chat_attachment',
        parentId,
        fileName,
        mimeType: normalizedMimeType,
        statusCode: 415,
      });
      return NextResponse.json({ error: 'The file contents do not match its declared format' }, { status: 415 });
    }

    const uploadUrl = await authenticated.convex.mutation(
      api.triggerWorkers.generateChatAttachmentUploadUrl,
      { workerSecret, userId, parentId: parentId as ParentId },
    );
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': normalizedMimeType },
      body: buffer,
    });
    if (!uploadResponse.ok) throw new Error(`Convex Storage rejected the upload with status ${uploadResponse.status}`);
    const uploadResult = await uploadResponse.json() as { storageId?: Id<'_storage'> };
    if (!uploadResult.storageId) throw new Error('Convex Storage did not return a storage ID');
    storageId = uploadResult.storageId;

    registrationStarted = true;
    const attachment = await authenticated.convex.mutation(
      api.triggerWorkers.finalizeChatAttachmentUpload,
      {
        workerSecret,
        userId,
        parentId: parentId as ParentId,
        storageId,
        fileName,
        mimeType: normalizedMimeType,
        sizeBytes: fileValue.size,
      },
    ) as Doc<'script_chat_attachments'> | null;
    if (!attachment) throw new Error('Convex did not register the uploaded file');
    log.info('Uploaded and registered a chat attachment', {
      userId,
      action: 'upload_chat_attachment',
      parentId,
      attachmentId: attachment._id,
      fileName,
      fileSize: fileValue.size,
      statusCode: 201,
    });
    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    if (storageId && !registrationStarted) {
      const workerSecret = process.env.TRIGGER_CONVEX_SECRET;
      if (workerSecret) {
        try {
          const authenticated = await getAuthenticatedConvexClient('cleanup_chat_attachment_upload');
          await authenticated.convex.mutation(api.triggerWorkers.deleteFile, { workerSecret, storageId });
        } catch (cleanupError) {
          log.error('Failed to clean up an unregistered chat attachment upload', {
            userId,
            action: 'cleanup_chat_attachment_upload',
            parentId,
            storageId,
            statusCode: 500,
            error: cleanupError,
          });
        }
      }
    }
    const statusCode = error instanceof ConvexServerAuthError ? error.statusCode : 500;
    log.error('Failed to upload a chat attachment', {
      userId,
      action: 'upload_chat_attachment',
      parentId,
      fileName,
      storageId,
      statusCode,
      error,
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload file' },
      { status: statusCode },
    );
  }
}
