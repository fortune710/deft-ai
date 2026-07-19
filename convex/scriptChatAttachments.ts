import { ConvexError, v } from 'convex/values';
import { action, internalQuery, mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { logger } from '../lib/logger';
import {
  CHAT_ATTACHMENT_EMBEDDING_DIMENSIONS,
  CHAT_ATTACHMENT_RETRIEVAL_LIMIT,
} from '../lib/ai/attachments/constants';

const log = logger.child({ file: 'convex/scriptChatAttachments.ts' });

const parentId = v.union(v.id('script_chat_sessions'), v.id('content_items'));

async function requireUserId(
  ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } },
  actionName: string,
) {
  const identity = await ctx.auth.getUserIdentity();
  const userId = identity?.subject;
  if (!userId) {
    log.warn('Attachment operation requires authentication', {
      userId: 'signed_out',
      action: actionName,
      statusCode: 401,
    });
    throw new ConvexError('Unauthenticated');
  }
  return userId;
}

async function requireOwnedParent(
  ctx: { db: { get: (id: Id<'script_chat_sessions'> | Id<'content_items'>) => Promise<any> } },
  id: Id<'script_chat_sessions'> | Id<'content_items'>,
  userId: string,
  actionName: string,
) {
  const parent = await ctx.db.get(id);
  if (!parent || parent.user_id !== userId) {
    log.warn('Chat parent was not found for attachment operation', {
      userId,
      action: actionName,
      parentId: id,
      statusCode: 404,
    });
    throw new ConvexError('Chat session not found');
  }
  return parent;
}

export const listByParent = query({
  args: { parentId },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx, 'list_chat_attachments');
    await requireOwnedParent(ctx, args.parentId, userId, 'list_chat_attachments');
    const attachments = await ctx.db
      .query('script_chat_attachments')
      .withIndex('by_parent_id', (q) => q.eq('parent_id', args.parentId))
      .order('asc')
      .collect();
    log.debug('Listed chat attachments', {
      userId,
      action: 'list_chat_attachments',
      parentId: args.parentId,
      attachmentCount: attachments.length,
      statusCode: 200,
    });
    return attachments;
  },
});

export const getOwned = query({
  args: { attachmentId: v.id('script_chat_attachments') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx, 'get_chat_attachment');
    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment || attachment.user_id !== userId) throw new ConvexError('Attachment not found');
    log.debug('Resolved owned chat attachment', {
      userId,
      action: 'get_chat_attachment',
      attachmentId: args.attachmentId,
      statusCode: 200,
    });
    return attachment;
  },
});

export const setSelected = mutation({
  args: { attachmentId: v.id('script_chat_attachments'), isSelected: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx, 'select_chat_attachment');
    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment || attachment.user_id !== userId) throw new ConvexError('Attachment not found');
    if (args.isSelected && (attachment.processing_status === 'quarantined' || attachment.security_status === 'blocked')) {
      throw new ConvexError('Quarantined files cannot be selected');
    }
    await ctx.db.patch(args.attachmentId, {
      is_selected: args.isSelected,
      updated_at: new Date().toISOString(),
    });
    log.info('Updated chat attachment selection', {
      userId,
      action: 'select_chat_attachment',
      attachmentId: args.attachmentId,
      isSelected: args.isSelected,
      statusCode: 200,
    });
    return await ctx.db.get(args.attachmentId);
  },
});

export const retry = mutation({
  args: { attachmentId: v.id('script_chat_attachments') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx, 'retry_chat_attachment');
    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment || attachment.user_id !== userId) throw new ConvexError('Attachment not found');
    if (attachment.processing_status !== 'failed') throw new ConvexError('Only failed files can be retried');
    await ctx.db.patch(args.attachmentId, {
      is_selected: true,
      processing_status: 'queued',
      security_status: 'pending',
      processing_error: null,
      security_findings: [],
      updated_at: new Date().toISOString(),
    });
    log.info('Queued chat attachment retry', {
      userId,
      action: 'retry_chat_attachment',
      attachmentId: args.attachmentId,
      statusCode: 200,
    });
    return await ctx.db.get(args.attachmentId);
  },
});

export const markFailedToStart = mutation({
  args: { attachmentId: v.id('script_chat_attachments'), error: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx, 'mark_chat_attachment_start_failed');
    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment || attachment.user_id !== userId) throw new ConvexError('Attachment not found');
    if (attachment.processing_status === 'quarantined' || attachment.processing_status === 'ready') return attachment;
    await ctx.db.patch(args.attachmentId, {
      is_selected: false,
      processing_status: 'failed',
      processing_error: args.error.slice(0, 500),
      updated_at: new Date().toISOString(),
    });
    log.error('Marked attachment as failed to start processing', {
      userId,
      action: 'mark_chat_attachment_start_failed',
      attachmentId: args.attachmentId,
      statusCode: 500,
      error: args.error,
    });
    return await ctx.db.get(args.attachmentId);
  },
});

export const remove = mutation({
  args: { attachmentId: v.id('script_chat_attachments') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx, 'remove_chat_attachment');
    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment || attachment.user_id !== userId) throw new ConvexError('Attachment not found');
    const chunks = await ctx.db
      .query('script_chat_attachment_chunks')
      .withIndex('by_attachment_id', (q) => q.eq('attachment_id', args.attachmentId))
      .collect();
    for (const chunk of chunks) await ctx.db.delete(chunk._id);
    await ctx.storage.delete(attachment.storage_id).catch(() => undefined);
    await ctx.db.delete(args.attachmentId);
    log.info('Removed chat attachment', {
      userId,
      action: 'remove_chat_attachment',
      attachmentId: args.attachmentId,
      deletedChunkCount: chunks.length,
      statusCode: 200,
    });
    return null;
  },
});

export const getMessageAttachmentSearchScope = internalQuery({
  args: {
    messageId: v.id('script_chat_messages'),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message || message.user_id !== args.userId) throw new ConvexError('Chat message not found');
    const attachmentIds: Id<'script_chat_attachments'>[] = [];
    for (const reference of message.attachment_refs ?? []) {
      const attachment = await ctx.db.get(reference.attachment_id);
      if (attachment?.user_id === args.userId
        && attachment.parent_id === message.session_id
        && attachment.processing_status === 'ready'
        && attachment.security_status === 'passed') {
        attachmentIds.push(attachment._id);
      }
    }
    log.debug('Resolved security-approved message attachment search scope', {
      userId: args.userId,
      action: 'resolve_chat_attachment_search_scope',
      messageId: args.messageId,
      attachmentCount: attachmentIds.length,
      statusCode: 200,
    });
    return attachmentIds;
  },
});

export const searchMessageAttachments = action({
  args: {
    messageId: v.id('script_chat_messages'),
    vector: v.array(v.float64()),
  },
  handler: async (ctx, args): Promise<Array<{ id: Id<'script_chat_attachment_chunks'>; score: number }>> => {
    const userId = await requireUserId(ctx, 'search_chat_attachments');
    if (args.vector.length !== CHAT_ATTACHMENT_EMBEDDING_DIMENSIONS) {
      log.warn('Rejected chat attachment search with invalid embedding dimensions', {
        userId,
        action: 'search_chat_attachments',
        messageId: args.messageId,
        vectorDimensions: args.vector.length,
        statusCode: 400,
      });
      throw new ConvexError('Invalid query embedding dimensions');
    }
    const attachmentIds = await ctx.runQuery(internal.scriptChatAttachments.getMessageAttachmentSearchScope, {
      messageId: args.messageId,
      userId,
    });
    if (!attachmentIds.length) return [];
    const results = await ctx.vectorSearch('script_chat_attachment_chunks', 'by_embedding', {
      vector: args.vector,
      limit: CHAT_ATTACHMENT_RETRIEVAL_LIMIT,
      filter: (q) => q.or(...attachmentIds.map((id: Id<'script_chat_attachments'>) => q.eq('attachment_id', id))),
    });
    log.info('Searched chat attachments', {
      userId,
      action: 'search_chat_attachments',
      messageId: args.messageId,
      attachmentCount: attachmentIds.length,
      resultCount: results.length,
      statusCode: 200,
    });
    return results.map((result) => ({ id: result._id, score: result._score }));
  },
});

export const hydrateMessageSearchResults = query({
  args: {
    messageId: v.id('script_chat_messages'),
    results: v.array(v.object({ id: v.id('script_chat_attachment_chunks'), score: v.number() })),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx, 'hydrate_chat_attachment_search_results');
    const message = await ctx.db.get(args.messageId);
    if (!message || message.user_id !== userId) throw new ConvexError('Chat message not found');
    const allowedIds = new Set((message.attachment_refs ?? []).map((reference) => String(reference.attachment_id)));
    const documents = await Promise.all(args.results.map(async (result) => {
      const chunk = await ctx.db.get(result.id);
      if (!chunk || chunk.user_id !== userId || chunk.security_status !== 'passed'
        || !allowedIds.has(String(chunk.attachment_id))) return null;
      const attachment = await ctx.db.get(chunk.attachment_id);
      if (!attachment || attachment.user_id !== userId
        || attachment.security_status !== 'passed'
        || attachment.processing_status !== 'ready') return null;
      return { ...chunk, score: result.score };
    }));
    const safeDocuments = documents.filter((document) => document !== null);
    log.info('Hydrated security-approved attachment search results', {
      userId,
      action: 'hydrate_chat_attachment_search_results',
      messageId: args.messageId,
      resultCount: safeDocuments.length,
      statusCode: 200,
    });
    return safeDocuments;
  },
});
