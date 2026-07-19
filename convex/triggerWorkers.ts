import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { logger as appLogger } from '../lib/logger';
import {
  CHAT_ATTACHMENT_ALLOWED_EXTENSIONS,
  CHAT_ATTACHMENT_ALLOWED_MIME_TYPES,
  CHAT_ATTACHMENT_EMBEDDING_DIMENSIONS,
  CHAT_ATTACHMENT_MAX_BYTES,
  CHAT_ATTACHMENT_MAX_FILES,
} from '../lib/ai/attachments/constants';

const chatAttachmentLog = appLogger.child({ file: 'convex/triggerWorkers.ts' });

const chatParentId = v.union(v.id('script_chat_sessions'), v.id('content_items'));
const attachmentMimeByExtension: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

const processingStep = v.union(
  v.literal('queued'), v.literal('download'), v.literal('extract_audio'),
  v.literal('transcribe'), v.literal('analyze'), v.literal('extract_thumbnail'),
  v.literal('completed'),
);

const queueStatus = v.union(
  v.literal('pending'), v.literal('processing'), v.literal('completed'), v.literal('failed'),
);

function authorize(workerSecret: string) {
  if (!process.env.TRIGGER_CONVEX_SECRET || workerSecret !== process.env.TRIGGER_CONVEX_SECRET) {
    throw new ConvexError('Unauthorized Trigger worker');
  }
}

function normalizePlatform(value: unknown) {
  if (typeof value !== 'string') {
    throw new ConvexError('Content item platform must be a string');
  }

  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  const aliases: Record<string, 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'linkedin' | 'facebook'> = {
    youtube: 'youtube',
    youtube_shorts: 'youtube',
    shorts: 'youtube',
    instagram: 'instagram',
    instagram_reels: 'instagram',
    reels: 'instagram',
    tiktok: 'tiktok',
    twitter: 'twitter',
    x: 'twitter',
    linkedin: 'linkedin',
    facebook: 'facebook',
  };
  const platform = aliases[normalized];
  if (!platform) throw new ConvexError(`Unsupported content platform: ${value}`);
  return platform;
}

export const generateFileUploadUrl = mutation({
  args: { workerSecret: v.string() },
  handler: async (ctx, { workerSecret }) => {
    authorize(workerSecret);
    return await ctx.storage.generateUploadUrl();
  },
});

export const generateChatAttachmentUploadUrl = mutation({
  args: {
    workerSecret: v.string(),
    userId: v.string(),
    parentId: chatParentId,
  },
  handler: async (ctx, args) => {
    authorize(args.workerSecret);
    const parent = await ctx.db.get(args.parentId);
    if (!parent || parent.user_id !== args.userId) {
      chatAttachmentLog.warn('Rejected attachment upload URL for an unknown chat parent', {
        userId: args.userId,
        action: 'generate_chat_attachment_upload_url',
        parentId: args.parentId,
        statusCode: 404,
      });
      throw new ConvexError('Chat session not found');
    }
    const attachments = await ctx.db
      .query('script_chat_attachments')
      .withIndex('by_parent_id', (q) => q.eq('parent_id', args.parentId))
      .collect();
    if (attachments.length >= CHAT_ATTACHMENT_MAX_FILES) {
      chatAttachmentLog.warn('Rejected attachment upload because the chat is full', {
        userId: args.userId,
        action: 'generate_chat_attachment_upload_url',
        parentId: args.parentId,
        attachmentCount: attachments.length,
        statusCode: 409,
      });
      throw new ConvexError(`A chat can contain at most ${CHAT_ATTACHMENT_MAX_FILES} files`);
    }
    const uploadUrl = await ctx.storage.generateUploadUrl();
    chatAttachmentLog.info('Generated a server-mediated chat attachment upload URL', {
      userId: args.userId,
      action: 'generate_chat_attachment_upload_url',
      parentId: args.parentId,
      statusCode: 200,
    });
    return uploadUrl;
  },
});

export const finalizeChatAttachmentUpload = mutation({
  args: {
    workerSecret: v.string(),
    userId: v.string(),
    parentId: chatParentId,
    storageId: v.id('_storage'),
    fileName: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    authorize(args.workerSecret);
    const rejectUpload = async (message: string, statusCode: number) => {
      await ctx.storage.delete(args.storageId).catch(() => undefined);
      chatAttachmentLog.warn('Rejected stored chat attachment metadata', {
        userId: args.userId,
        action: 'finalize_chat_attachment_upload',
        parentId: args.parentId,
        storageId: args.storageId,
        fileName: args.fileName,
        statusCode,
        error: message,
      });
      throw new ConvexError(message);
    };
    const parent = await ctx.db.get(args.parentId);
    if (!parent || parent.user_id !== args.userId) {
      return await rejectUpload('Chat session not found', 404);
    }
    const storageMetadata = await ctx.db.system.get(args.storageId);
    if (!storageMetadata) return await rejectUpload('Uploaded file was not found', 400);

    const extension = `.${args.fileName.split('.').pop()?.toLowerCase() ?? ''}`;
    const expectedMimeType = attachmentMimeByExtension[extension];
    const trustedSize = storageMetadata.size;
    const trustedMimeType = storageMetadata.contentType;
    const supportedMimeType = CHAT_ATTACHMENT_ALLOWED_MIME_TYPES.includes(
      args.mimeType as (typeof CHAT_ATTACHMENT_ALLOWED_MIME_TYPES)[number],
    );
    const supportedExtension = CHAT_ATTACHMENT_ALLOWED_EXTENSIONS.includes(
      extension as (typeof CHAT_ATTACHMENT_ALLOWED_EXTENSIONS)[number],
    );
    if (trustedSize <= 0 || trustedSize > CHAT_ATTACHMENT_MAX_BYTES) {
      return await rejectUpload('Each file must be 10 MB or smaller', 413);
    }
    if (args.sizeBytes !== trustedSize) return await rejectUpload('Uploaded file size does not match', 400);
    if (!supportedMimeType || !supportedExtension || expectedMimeType !== args.mimeType
      || trustedMimeType !== args.mimeType) {
      return await rejectUpload('The file extension and type do not match a supported format', 415);
    }
    const attachments = await ctx.db
      .query('script_chat_attachments')
      .withIndex('by_parent_id', (q) => q.eq('parent_id', args.parentId))
      .collect();
    if (attachments.length >= CHAT_ATTACHMENT_MAX_FILES) {
      return await rejectUpload(`A chat can contain at most ${CHAT_ATTACHMENT_MAX_FILES} files`, 409);
    }

    const now = new Date().toISOString();
    const attachmentId = await ctx.db.insert('script_chat_attachments', {
      parent_id: args.parentId,
      user_id: args.userId,
      storage_id: args.storageId,
      file_name: args.fileName.slice(0, 255),
      mime_type: args.mimeType,
      size_bytes: trustedSize,
      is_selected: true,
      processing_status: 'queued',
      security_status: 'pending',
      security_findings: [],
      processing_error: null,
      chunk_count: 0,
      created_at: now,
      updated_at: now,
    });
    chatAttachmentLog.info('Registered a trusted chat attachment upload', {
      userId: args.userId,
      action: 'finalize_chat_attachment_upload',
      parentId: args.parentId,
      attachmentId,
      storageId: args.storageId,
      fileName: args.fileName,
      sizeBytes: trustedSize,
      statusCode: 201,
    });
    return await ctx.db.get(attachmentId);
  },
});

export const getFileUrl = query({
  args: { workerSecret: v.string(), storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    authorize(args.workerSecret);
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const getChatAttachment = query({
  args: {
    workerSecret: v.string(),
    userId: v.string(),
    attachmentId: v.id('script_chat_attachments'),
  },
  handler: async (ctx, args) => {
    authorize(args.workerSecret);
    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment || attachment.user_id !== args.userId) throw new ConvexError('Attachment not found');
    const storageMetadata = await ctx.db.system.get(attachment.storage_id);
    const storageUrl = await ctx.storage.getUrl(attachment.storage_id);
    chatAttachmentLog.debug('Resolved attachment for ingestion worker', {
      userId: args.userId,
      action: 'get_chat_attachment_for_processing',
      attachmentId: args.attachmentId,
      statusCode: 200,
    });
    return { attachment, storageMetadata, storageUrl };
  },
});

export const markChatAttachmentProcessing = mutation({
  args: {
    workerSecret: v.string(),
    userId: v.string(),
    attachmentId: v.id('script_chat_attachments'),
  },
  handler: async (ctx, args) => {
    authorize(args.workerSecret);
    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment || attachment.user_id !== args.userId) throw new ConvexError('Attachment not found');
    if (attachment.processing_status === 'quarantined') throw new ConvexError('Quarantined attachments cannot be retried');
    const existingChunks = await ctx.db
      .query('script_chat_attachment_chunks')
      .withIndex('by_attachment_id', (q) => q.eq('attachment_id', args.attachmentId))
      .collect();
    for (const chunk of existingChunks) await ctx.db.delete(chunk._id);
    await ctx.db.patch(args.attachmentId, {
      processing_status: 'processing',
      security_status: 'pending',
      processing_error: null,
      security_findings: [],
      chunk_count: 0,
      updated_at: new Date().toISOString(),
    });
    chatAttachmentLog.info('Marked chat attachment as processing', {
      userId: args.userId,
      action: 'mark_chat_attachment_processing',
      attachmentId: args.attachmentId,
      deletedChunkCount: existingChunks.length,
      statusCode: 200,
    });
    return await ctx.db.get(args.attachmentId);
  },
});

export const completeChatAttachmentProcessing = mutation({
  args: {
    workerSecret: v.string(),
    userId: v.string(),
    attachmentId: v.id('script_chat_attachments'),
    chunks: v.array(v.object({
      chunkIndex: v.number(),
      content: v.string(),
      pageNumber: v.union(v.number(), v.null()),
      section: v.union(v.string(), v.null()),
      embedding: v.array(v.float64()),
    })),
  },
  handler: async (ctx, args) => {
    authorize(args.workerSecret);
    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment || attachment.user_id !== args.userId) throw new ConvexError('Attachment not found');
    if (attachment.processing_status === 'quarantined' || attachment.security_status === 'blocked') {
      throw new ConvexError('Quarantined attachments cannot be completed');
    }
    if (args.chunks.some((chunk) => chunk.embedding.length !== CHAT_ATTACHMENT_EMBEDDING_DIMENSIONS)) {
      throw new ConvexError('Invalid Cohere embedding dimensions');
    }
    const existingChunks = await ctx.db
      .query('script_chat_attachment_chunks')
      .withIndex('by_attachment_id', (q) => q.eq('attachment_id', args.attachmentId))
      .collect();
    for (const chunk of existingChunks) await ctx.db.delete(chunk._id);
    const now = new Date().toISOString();
    for (const chunk of args.chunks) {
      await ctx.db.insert('script_chat_attachment_chunks', {
        attachment_id: args.attachmentId,
        user_id: args.userId,
        chunk_index: chunk.chunkIndex,
        content: chunk.content,
        file_name: attachment.file_name,
        page_number: chunk.pageNumber,
        section: chunk.section,
        security_status: 'passed',
        embedding: chunk.embedding,
        created_at: now,
      });
    }
    await ctx.db.patch(args.attachmentId, {
      processing_status: 'ready',
      security_status: 'passed',
      security_findings: [],
      processing_error: null,
      chunk_count: args.chunks.length,
      updated_at: now,
    });
    chatAttachmentLog.info('Completed chat attachment processing', {
      userId: args.userId,
      action: 'complete_chat_attachment_processing',
      attachmentId: args.attachmentId,
      chunkCount: args.chunks.length,
      statusCode: 200,
    });
    return await ctx.db.get(args.attachmentId);
  },
});

export const quarantineChatAttachment = mutation({
  args: {
    workerSecret: v.string(),
    userId: v.string(),
    attachmentId: v.id('script_chat_attachments'),
    findings: v.array(v.object({
      chunkIndex: v.number(),
      category: v.string(),
      reason: v.string(),
      contentHash: v.string(),
      confidence: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    authorize(args.workerSecret);
    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment || attachment.user_id !== args.userId) throw new ConvexError('Attachment not found');
    const existingChunks = await ctx.db
      .query('script_chat_attachment_chunks')
      .withIndex('by_attachment_id', (q) => q.eq('attachment_id', args.attachmentId))
      .collect();
    for (const chunk of existingChunks) await ctx.db.delete(chunk._id);
    await ctx.db.patch(args.attachmentId, {
      is_selected: false,
      processing_status: 'quarantined',
      security_status: 'blocked',
      security_findings: args.findings.slice(0, 20).map((finding) => ({
        chunk_index: finding.chunkIndex,
        category: finding.category.slice(0, 80),
        reason: finding.reason.slice(0, 240),
        content_hash: finding.contentHash,
        confidence: finding.confidence,
      })),
      processing_error: 'This file was blocked because it may contain instructions intended to manipulate the assistant.',
      chunk_count: 0,
      updated_at: new Date().toISOString(),
    });
    chatAttachmentLog.warn('Quarantined unsafe chat attachment', {
      userId: args.userId,
      action: 'quarantine_chat_attachment',
      attachmentId: args.attachmentId,
      findingCount: args.findings.length,
      statusCode: 422,
    });
    return await ctx.db.get(args.attachmentId);
  },
});

export const failChatAttachmentProcessing = mutation({
  args: {
    workerSecret: v.string(),
    userId: v.string(),
    attachmentId: v.id('script_chat_attachments'),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    authorize(args.workerSecret);
    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment || attachment.user_id !== args.userId) throw new ConvexError('Attachment not found');
    if (attachment.processing_status === 'quarantined' || attachment.security_status === 'blocked') {
      chatAttachmentLog.warn('Preserved quarantined attachment during worker failure handling', {
        userId: args.userId,
        action: 'fail_chat_attachment_processing',
        attachmentId: args.attachmentId,
        statusCode: 409,
      });
      return attachment;
    }
    await ctx.db.patch(args.attachmentId, {
      is_selected: false,
      processing_status: 'failed',
      security_status: 'pending',
      processing_error: args.error.slice(0, 500),
      chunk_count: 0,
      updated_at: new Date().toISOString(),
    });
    chatAttachmentLog.error('Marked chat attachment processing as failed', {
      userId: args.userId,
      action: 'fail_chat_attachment_processing',
      attachmentId: args.attachmentId,
      statusCode: 500,
      error: args.error,
    });
    return await ctx.db.get(args.attachmentId);
  },
});

export const deleteFile = mutation({
  args: { workerSecret: v.string(), storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    authorize(args.workerSecret);
    await ctx.storage.delete(args.storageId);
    return null;
  },
});

export const upsertContentEngineProgress = mutation({
  args: {
    workerSecret: v.string(),
    userId: v.string(),
    progress: v.number(),
    stage: v.string(),
    message: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    authorize(args.workerSecret);
    const existing = await ctx.db
      .query('content_engine_progress')
      .withIndex('by_user_id', (q) => q.eq('user_id', args.userId))
      .first();
    const now = new Date().toISOString();
    const values = {
      user_id: args.userId,
      progress: args.progress,
      stage: args.stage,
      message: args.message,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, values);
      return await ctx.db.get(existing._id);
    }
    const progressId = await ctx.db.insert('content_engine_progress', values);
    return await ctx.db.get(progressId);
  },
});

export const getContentAnalytics = query({
  args: { workerSecret: v.string(), userId: v.string(), analyticsId: v.id('content_analytics') },
  handler: async (ctx, args) => {
    authorize(args.workerSecret);
    const record = await ctx.db.get(args.analyticsId);
    return record?.user_id === args.userId ? record : null;
  },
});

export const updateContentAnalytics = mutation({
  args: {
    workerSecret: v.string(),
    userId: v.string(),
    analyticsId: v.id('content_analytics'),
    updates: v.object({
      video_file_path: v.optional(v.union(v.string(), v.id('_storage'), v.null())),
      audio_file_path: v.optional(v.union(v.string(), v.id('_storage'), v.null())),
      thumbnail_url: v.optional(v.union(v.string(), v.id('_storage'), v.null())),
      transcript: v.optional(v.union(v.string(), v.null())),
      analysis_results: v.optional(v.any()),
      processing_status: v.optional(v.union(
        v.literal('pending'), v.literal('downloading'), v.literal('extracting_audio'),
        v.literal('transcribing'), v.literal('analyzing'), v.literal('extracting_thumbnail'),
        v.literal('completed'), v.literal('failed'),
      )),
      processing_error: v.optional(v.union(v.string(), v.null())),
    }),
  },
  handler: async (ctx, args) => {
    authorize(args.workerSecret);
    const record = await ctx.db.get(args.analyticsId);
    if (!record || record.user_id !== args.userId) throw new ConvexError('Content analytics not found');
    await ctx.db.patch(args.analyticsId, { ...args.updates, updated_at: new Date().toISOString() });
    return await ctx.db.get(args.analyticsId);
  },
});

export const listContentHistory = query({
  args: { workerSecret: v.string(), userId: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    authorize(args.workerSecret);
    const records = await ctx.db
      .query('content_analytics')
      .withIndex('by_user_id', (q) => q.eq('user_id', args.userId))
      .order('desc')
      .collect();
    return records
      .filter((record) => record.processing_status === 'completed' && record.analysis_results != null)
      .slice(0, args.limit);
  },
});

export const upsertProgress = mutation({
  args: {
    workerSecret: v.string(), userId: v.string(), analyticsId: v.id('content_analytics'),
    progress: v.number(), stage: processingStep, message: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    authorize(args.workerSecret);
    const existing = await ctx.db
      .query('content_analytics_progress')
      .withIndex('by_analytics_id', (q) => q.eq('analytics_id', args.analyticsId))
      .unique();
    const values = {
      user_id: args.userId, analytics_id: args.analyticsId, status: 'processing' as const,
      current_step: args.stage, progress_percentage: args.progress, message: args.message,
      retry_count: existing?.retry_count ?? 0, max_retries: existing?.max_retries ?? 3,
      priority: existing?.priority ?? 5, started_at: existing?.started_at ?? new Date().toISOString(),
      completed_at: null, created_at: existing?.created_at ?? new Date().toISOString(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, values);
      return await ctx.db.get(existing._id);
    }
    const progressId = await ctx.db.insert('content_analytics_progress', values);
    return await ctx.db.get(progressId);
  },
});

export const updateProgress = mutation({
  args: {
    workerSecret: v.string(), userId: v.string(), analyticsId: v.id('content_analytics'),
    progress: v.optional(v.number()), stage: v.optional(processingStep),
    message: v.optional(v.union(v.string(), v.null())), status: v.optional(queueStatus),
  },
  handler: async (ctx, args) => {
    authorize(args.workerSecret);
    const existing = await ctx.db
      .query('content_analytics_progress')
      .withIndex('by_analytics_id', (q) => q.eq('analytics_id', args.analyticsId))
      .unique();
    if (!existing || existing.user_id !== args.userId) throw new ConvexError('Progress not found');
    await ctx.db.patch(existing._id, {
      ...(args.progress !== undefined ? { progress_percentage: args.progress } : {}),
      ...(args.stage !== undefined ? { current_step: args.stage } : {}),
      ...(args.message !== undefined ? { message: args.message } : {}),
      ...(args.status !== undefined ? { status: args.status } : {}),
      ...(args.status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
    });
    return await ctx.db.get(existing._id);
  },
});

export const getProfile = query({
  args: { workerSecret: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    authorize(args.workerSecret);
    return await ctx.db.query('user_content_profile')
      .withIndex('by_user_id', (q) => q.eq('user_id', args.userId)).unique();
  },
});

export const listContentItems = query({
  args: { workerSecret: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    authorize(args.workerSecret);
    return await ctx.db.query('content_items')
      .withIndex('by_user_id', (q) => q.eq('user_id', args.userId)).collect();
  },
});

export const createContentItems = mutation({
  args: { workerSecret: v.string(), userId: v.string(), items: v.array(v.any()) },
  handler: async (ctx, args) => {
    authorize(args.workerSecret);
    const now = new Date().toISOString();
    const ids = [];
    for (const item of args.items) {
      ids.push(await ctx.db.insert('content_items', {
        ...item, user_id: args.userId, description: item.description ?? null,
        platform: normalizePlatform(item.platform),
        position: item.position ?? 0, script_content: item.script_content ?? null,
        created_at: now, updated_at: now,
      }));
    }
    return ids;
  },
});
