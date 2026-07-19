import { task } from '@trigger.dev/sdk/v3';
import { ConvexHttpClient } from 'convex/browser';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { logger } from '@/lib/logger.server';
import {
  buildAttachmentChunks,
  embedSafeAttachmentChunks,
  extractAttachmentSections,
  scanAttachmentSecurity,
} from '@/lib/ai/attachments/ingestion';
import { CHAT_ATTACHMENT_MAX_BYTES } from '@/lib/ai/attachments/constants';

const log = logger.child({ file: 'trigger/process-chat-attachment.ts' });
const pdfWorkerPath = path.join(
  process.cwd(),
  'node_modules/pdf-parse/dist/worker/pdf.worker.mjs',
);

PDFParse.setWorker(pdfWorkerPath);
log.debug('Configured the packaged PDF.js worker for Trigger.dev', {
  userId: 'system',
  action: 'configure_trigger_pdf_worker',
  workerPath: pdfWorkerPath,
});

interface ProcessChatAttachmentPayload {
  userId: string;
  attachmentId: string;
}

export const processChatAttachmentTask = task({
  id: 'process-chat-attachment',
  retry: { maxAttempts: 3, minTimeoutInMs: 1_000, maxTimeoutInMs: 10_000, factor: 2 },
  run: async (payload: ProcessChatAttachmentPayload) => {
    const { userId } = payload;
    const attachmentId = payload.attachmentId as Id<'script_chat_attachments'>;
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    const workerSecret = process.env.TRIGGER_CONVEX_SECRET;
    if (!convexUrl || !workerSecret) {
      log.error('Attachment worker configuration is missing', {
        userId,
        action: 'process_chat_attachment',
        attachmentId,
        statusCode: 500,
        error: 'Missing NEXT_PUBLIC_CONVEX_URL or TRIGGER_CONVEX_SECRET',
      });
      throw new Error('Attachment processing configuration is missing');
    }
    const convex = new ConvexHttpClient(convexUrl);
    try {
      await convex.mutation(api.triggerWorkers.markChatAttachmentProcessing, {
        workerSecret,
        userId,
        attachmentId,
      });
      const source = await convex.query(api.triggerWorkers.getChatAttachment, {
        workerSecret,
        userId,
        attachmentId,
      });
      if (!source.storageUrl || !source.storageMetadata) throw new Error('Attachment storage object is unavailable');
      if (source.storageMetadata.size > CHAT_ATTACHMENT_MAX_BYTES) throw new Error('Attachment exceeds the 10 MB processing limit');
      const response = await fetch(source.storageUrl);
      if (!response.ok) throw new Error(`Unable to download attachment (${response.status})`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength !== source.storageMetadata.size || buffer.byteLength > CHAT_ATTACHMENT_MAX_BYTES) {
        throw new Error('Attachment size does not match trusted storage metadata');
      }
      const sections = await extractAttachmentSections(
        buffer,
        source.attachment.mime_type,
        userId,
        attachmentId,
      );
      const chunks = buildAttachmentChunks(sections, userId, attachmentId);
      if (!chunks.length) throw new Error('No usable content could be extracted from this file');
      const findings = await scanAttachmentSecurity(sections, chunks, userId, attachmentId);
      if (findings.length) {
        await convex.mutation(api.triggerWorkers.quarantineChatAttachment, {
          workerSecret,
          userId,
          attachmentId,
          findings,
        });
        log.warn('Attachment was quarantined before embedding', {
          userId,
          action: 'process_chat_attachment',
          attachmentId,
          findingCount: findings.length,
          statusCode: 422,
        });
        return { success: false, quarantined: true, attachmentId };
      }
      const embeddings = await embedSafeAttachmentChunks(chunks, userId, attachmentId);
      await convex.mutation(api.triggerWorkers.completeChatAttachmentProcessing, {
        workerSecret,
        userId,
        attachmentId,
        chunks: chunks.map((chunk, index) => ({
          chunkIndex: chunk.chunkIndex,
          content: chunk.text,
          pageNumber: chunk.pageNumber,
          section: chunk.section,
          embedding: embeddings[index],
        })),
      });
      log.info('Attachment processing completed', {
        userId,
        action: 'process_chat_attachment',
        attachmentId,
        chunkCount: chunks.length,
        statusCode: 200,
      });
      return { success: true, quarantined: false, attachmentId, chunkCount: chunks.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown attachment processing error';
      log.error('Attachment processing failed', {
        userId,
        action: 'process_chat_attachment',
        attachmentId,
        statusCode: 500,
        error,
        message,
      });
      await convex.mutation(api.triggerWorkers.failChatAttachmentProcessing, {
        workerSecret,
        userId,
        attachmentId,
        error: message,
      }).catch(() => null);
      throw error;
    }
  },
});
