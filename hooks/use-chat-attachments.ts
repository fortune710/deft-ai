'use client';

import { useMutation as useAsyncMutation } from '@tanstack/react-query';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { useAuth } from '@/hooks/use-clerk-auth';
import { logger } from '@/lib/logger';
import {
  CHAT_ATTACHMENT_ALLOWED_EXTENSIONS,
  CHAT_ATTACHMENT_ALLOWED_MIME_TYPES,
  CHAT_ATTACHMENT_MAX_BYTES,
  CHAT_ATTACHMENT_MAX_FILES,
} from '@/lib/ai/attachments/constants';
import type { ChatAttachment } from '@/types/chat-attachments';

const log = logger.child({ file: 'hooks/use-chat-attachments.ts' });
type ParentId = Id<'script_chat_sessions'> | Id<'content_items'>;

function resolveAttachmentMimeType(file: File, userId: string) {
  const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
  const fallbackByExtension: Record<string, string> = {
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
  const mimeType = file.type || fallbackByExtension[extension] || 'application/octet-stream';
  log.debug('Resolved chat attachment MIME type', {
    userId,
    action: 'resolve_chat_attachment_mime_type',
    fileName: file.name,
    mimeType,
  });
  return mimeType;
}

function toChatAttachment(document: Doc<'script_chat_attachments'> & { preview_url?: string | null }, userId: string): ChatAttachment {
  log.debug('Mapped Convex chat attachment', {
    userId,
    action: 'map_chat_attachment',
    attachmentId: document._id,
    processingStatus: document.processing_status,
  });
  return {
    id: document._id,
    parentId: document.parent_id,
    userId: document.user_id,
    fileName: document.file_name,
    mimeType: document.mime_type,
    sizeBytes: document.size_bytes,
    isSelected: document.is_selected,
    processingStatus: document.processing_status,
    securityStatus: document.security_status,
    securityFindings: document.security_findings.map((finding) => ({
      chunkIndex: finding.chunk_index,
      category: finding.category,
      reason: finding.reason,
      contentHash: finding.content_hash,
      confidence: finding.confidence,
    })),
    processingError: document.processing_error ?? undefined,
    previewUrl: document.preview_url ?? undefined,
    chunkCount: document.chunk_count,
    createdAt: document.created_at,
    updatedAt: document.updated_at,
  };
}

export function validateChatAttachmentFile(file: File, currentCount: number, userId = 'unknown') {
  const extension = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
  const mimeType = resolveAttachmentMimeType(file, userId);
  const allowedMime = CHAT_ATTACHMENT_ALLOWED_MIME_TYPES.includes(mimeType as (typeof CHAT_ATTACHMENT_ALLOWED_MIME_TYPES)[number]);
  const allowedExtension = CHAT_ATTACHMENT_ALLOWED_EXTENSIONS.includes(extension as (typeof CHAT_ATTACHMENT_ALLOWED_EXTENSIONS)[number]);
  const extensionMimeMatches = resolveAttachmentMimeType(new File([], file.name), userId) === mimeType;
  let error: string | null = null;
  if (currentCount >= CHAT_ATTACHMENT_MAX_FILES) error = `A chat can contain at most ${CHAT_ATTACHMENT_MAX_FILES} files`;
  else if (file.size <= 0) error = 'The selected file is empty';
  else if (file.size > CHAT_ATTACHMENT_MAX_BYTES) error = 'Each file must be 50 MB or smaller';
  else if (!allowedMime || !allowedExtension || !extensionMimeMatches)
    error = 'The file extension and type do not match a supported format';
  log.debug('Validated chat attachment before upload', {
    userId,
    action: 'validate_chat_attachment_upload',
    fileName: file.name,
    fileSize: file.size,
    fileType: mimeType,
    valid: error === null,
  });
  return error;
}

async function startProcessing(attachmentId: string, userId: string) {
  const response = await fetch('/api/chat/attachments/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attachmentId }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    log.error('Failed to start chat attachment processing', {
      userId,
      action: 'start_chat_attachment_processing',
      attachmentId,
      statusCode: response.status,
      error: body.error || 'Unknown processing error',
    });
    throw new Error(body.error || 'Failed to start file processing');
  }
  log.info('Started chat attachment processing', {
    userId,
    action: 'start_chat_attachment_processing',
    attachmentId,
    statusCode: response.status,
  });
}

export function useChatAttachments(parentId: string) {
  const { userId } = useAuth();
  const documents = useQuery(api.scriptChatAttachments.listByParent, userId && parentId ? { parentId: parentId as ParentId } : 'skip');
  log.debug('Resolved chat attachments', {
    userId: userId || 'signed_out',
    action: 'list_chat_attachments',
    parentId,
    attachmentCount: documents?.length,
  });
  return {
    data: documents?.map((document) => toChatAttachment(document, userId || 'unknown')) ?? [],
    isLoading: Boolean(userId && parentId) && documents === undefined,
  };
}

export function useUploadChatAttachments(parentId: string, currentCount: number) {
  const { userId } = useAuth();
  const markFailedToStart = useMutation(api.scriptChatAttachments.markFailedToStart);

  return useAsyncMutation({
    mutationFn: async (files: File[]) => {
      const effectiveUserId = userId || 'unknown';
      const availableSlots = Math.max(0, CHAT_ATTACHMENT_MAX_FILES - currentCount);
      if (files.length > availableSlots) throw new Error(`You can upload ${availableSlots} more file${availableSlots === 1 ? '' : 's'}`);
      const uploaded: ChatAttachment[] = [];
      for (const file of files) {
        const validationError = validateChatAttachmentFile(file, currentCount + uploaded.length, effectiveUserId);
        if (validationError) throw new Error(validationError);
        log.info('Uploading file through the authenticated attachment API', {
          userId: effectiveUserId,
          action: 'upload_chat_attachment',
          parentId,
          fileName: file.name,
          fileSize: file.size,
        });
        const formData = new FormData();
        formData.set('parentId', parentId);
        formData.set('file', file);
        const uploadResponse = await fetch('/api/chat/attachments/upload', {
          method: 'POST',
          body: formData,
        });
        const body = (await uploadResponse.json().catch(() => ({}))) as Partial<Doc<'script_chat_attachments'>> & { error?: string };
        if (!uploadResponse.ok) {
          log.error('Attachment upload API rejected the file', {
            userId: effectiveUserId,
            action: 'upload_chat_attachment',
            parentId,
            fileName: file.name,
            statusCode: uploadResponse.status,
            error: body.error || 'Unknown upload error',
          });
          throw new Error(body.error || `Failed to upload ${file.name}`);
        }
        const document = body as Doc<'script_chat_attachments'>;
        if (!document) throw new Error(`Failed to register ${file.name}`);
        const attachment = toChatAttachment(document, effectiveUserId);
        uploaded.push(attachment);
        try {
          await startProcessing(attachment.id, effectiveUserId);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to start file processing';
          await markFailedToStart({
            attachmentId: attachment.id as Id<'script_chat_attachments'>,
            error: message,
          });
          throw error;
        }
      }
      return uploaded;
    },
  });
}

export function useSelectChatAttachment() {
  const { userId } = useAuth();
  const setSelected = useMutation(api.scriptChatAttachments.setSelected).withOptimisticUpdate((store, args) => {
    for (const queryResult of store.getAllQueries(api.scriptChatAttachments.listByParent)) {
      if (!queryResult.value) continue;
      store.setQuery(
        api.scriptChatAttachments.listByParent,
        queryResult.args,
        queryResult.value.map((attachment) =>
          attachment._id === args.attachmentId ? { ...attachment, is_selected: args.isSelected } : attachment,
        ),
      );
    }
  });
  return useAsyncMutation({
    mutationFn: async ({ attachmentId, isSelected }: { attachmentId: string; isSelected: boolean }) => {
      log.info('Changing chat attachment selection', {
        userId: userId || 'unknown',
        action: 'select_chat_attachment',
        attachmentId,
        isSelected,
      });
      return await setSelected({
        attachmentId: attachmentId as Id<'script_chat_attachments'>,
        isSelected,
      });
    },
  });
}

export function useRemoveChatAttachment() {
  const { userId } = useAuth();
  const remove = useMutation(api.scriptChatAttachments.remove).withOptimisticUpdate((store, args) => {
    for (const queryResult of store.getAllQueries(api.scriptChatAttachments.listByParent)) {
      if (!queryResult.value) continue;
      store.setQuery(
        api.scriptChatAttachments.listByParent,
        queryResult.args,
        queryResult.value.filter((attachment) => attachment._id !== args.attachmentId),
      );
    }
  });
  return useAsyncMutation({
    mutationFn: async (attachmentId: string) => {
      log.info('Removing chat attachment', {
        userId: userId || 'unknown',
        action: 'remove_chat_attachment',
        attachmentId,
      });
      return await remove({
        attachmentId: attachmentId as Id<'script_chat_attachments'>,
      });
    },
  });
}

export function useRetryChatAttachment() {
  const { userId } = useAuth();
  const retry = useMutation(api.scriptChatAttachments.retry);
  const markFailedToStart = useMutation(api.scriptChatAttachments.markFailedToStart);
  return useAsyncMutation({
    mutationFn: async (attachmentId: string) => {
      const effectiveUserId = userId || 'unknown';
      await retry({
        attachmentId: attachmentId as Id<'script_chat_attachments'>,
      });
      try {
        await startProcessing(attachmentId, effectiveUserId);
      } catch (error) {
        await markFailedToStart({
          attachmentId: attachmentId as Id<'script_chat_attachments'>,
          error: error instanceof Error ? error.message : 'Failed to start file processing',
        });
        throw error;
      }
      log.info('Retried chat attachment processing', {
        userId: effectiveUserId,
        action: 'retry_chat_attachment',
        attachmentId,
      });
    },
  });
}
