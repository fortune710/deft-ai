import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { logger } from '../lib/logger';

const log = logger.child({ file: 'convex/scriptChats.ts' });

const sessionId = v.union(
  v.id('script_chat_sessions'),
  v.id('content_items'),
);

const changeStatus = v.union(
  v.literal('pending'),
  v.literal('accepted'),
  v.literal('rejected'),
);

async function requireUserId(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  const userId = identity?.subject;
  if (!userId) throw new ConvexError('Unauthenticated');
  return userId;
}

export const listSessions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query('script_chat_sessions')
      .withIndex('by_user_id_and_updated_at', (q) => q.eq('user_id', userId))
      .order('desc')
      .collect();
  },
});

export const getSession = query({
  args: { sessionId: v.id('script_chat_sessions') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const session = await ctx.db.get(args.sessionId);
    return session?.user_id === userId ? session : null;
  },
});

export const listMessages = query({
  args: { sessionId },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const parent = await ctx.db.get(args.sessionId);
    if (!parent || parent.user_id !== userId) return [];

    return await ctx.db
      .query('script_chat_messages')
      .withIndex('by_session_id', (q) => q.eq('session_id', args.sessionId))
      .order('asc')
      .collect();
  },
});

export const createSession = mutation({
  args: {
    title: v.string(),
    editorContent: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = new Date().toISOString();
    const id = await ctx.db.insert('script_chat_sessions', {
      user_id: userId,
      title: args.title,
      editor_content: args.editorContent,
      created_at: now,
      updated_at: now,
    });
    return await ctx.db.get(id);
  },
});

export const updateEditorContent = mutation({
  args: {
    sessionId,
    editorContent: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const parent = await ctx.db.get(args.sessionId);
    if (!parent || parent.user_id !== userId) {
      throw new ConvexError('Chat session not found');
    }

    const now = new Date().toISOString();
    const chatSessionId = ctx.db.normalizeId('script_chat_sessions', args.sessionId);
    if (chatSessionId) {
      await ctx.db.patch(chatSessionId, {
        editor_content: args.editorContent,
        updated_at: now,
      });
      return await ctx.db.get(chatSessionId);
    }

    const contentItemId = ctx.db.normalizeId('content_items', args.sessionId);
    if (!contentItemId) throw new ConvexError('Chat session not found');
    const contentItem = await ctx.db.get(contentItemId);
    if (!contentItem || contentItem.user_id !== userId) {
      throw new ConvexError('Content item not found');
    }

    const scriptContent = typeof args.editorContent === 'string'
      ? args.editorContent
      : args.editorContent?.fullScript ?? contentItem.script_content;
    await ctx.db.patch(contentItemId, {
      content: typeof args.editorContent === 'string'
        ? contentItem.content
        : args.editorContent,
      script_content: scriptContent,
      updated_at: now,
    });
    return await ctx.db.get(contentItemId);
  },
});

export const updateSessionTitle = mutation({
  args: {
    sessionId: v.id('script_chat_sessions'),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.user_id !== userId) {
      throw new ConvexError('Chat session not found');
    }
    await ctx.db.patch(args.sessionId, {
      title: args.title,
      updated_at: new Date().toISOString(),
    });
    return await ctx.db.get(args.sessionId);
  },
});

export const removeSession = mutation({
  args: { sessionId: v.id('script_chat_sessions') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.user_id !== userId) {
      throw new ConvexError('Chat session not found');
    }

    const messages = await ctx.db
      .query('script_chat_messages')
      .withIndex('by_session_id', (q) => q.eq('session_id', args.sessionId))
      .collect();
    for (const message of messages) await ctx.db.delete(message._id);
    const attachments = await ctx.db
      .query('script_chat_attachments')
      .withIndex('by_parent_id', (q) => q.eq('parent_id', args.sessionId))
      .collect();
    for (const attachment of attachments) {
      const chunks = await ctx.db
        .query('script_chat_attachment_chunks')
        .withIndex('by_attachment_id', (q) => q.eq('attachment_id', attachment._id))
        .collect();
      for (const chunk of chunks) await ctx.db.delete(chunk._id);
      await ctx.storage.delete(attachment.storage_id).catch(() => undefined);
      await ctx.db.delete(attachment._id);
    }
    await ctx.db.delete(args.sessionId);
    log.info('Removed script chat session and attachment data', {
      userId,
      action: 'remove_script_chat_session',
      sessionId: args.sessionId,
      messageCount: messages.length,
      attachmentCount: attachments.length,
      statusCode: 200,
    });
    return null;
  },
});

export const createMessage = mutation({
  args: {
    sessionId,
    role: v.union(v.literal('user'), v.literal('assistant')),
    messageType: v.union(v.literal('ask'), v.literal('edit')),
    content: v.string(),
    proposedChanges: v.optional(v.any()),
    changeStatus: v.optional(changeStatus),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const parent = await ctx.db.get(args.sessionId);
    if (!parent || parent.user_id !== userId) {
      throw new ConvexError('Chat session not found');
    }

    const selectedAttachments = args.role === 'user'
      ? (await ctx.db
          .query('script_chat_attachments')
          .withIndex('by_parent_id', (q) => q.eq('parent_id', args.sessionId))
          .collect())
          .filter((attachment) => attachment.is_selected
            && attachment.processing_status === 'ready'
            && attachment.security_status === 'passed')
      : [];
    const id = await ctx.db.insert('script_chat_messages', {
      session_id: args.sessionId,
      user_id: userId,
      role: args.role,
      message_type: args.messageType,
      content: args.content,
      proposed_changes: args.proposedChanges ?? null,
      change_status: args.changeStatus ?? null,
      created_at: new Date().toISOString(),
      attachment_refs: selectedAttachments.map((attachment) => ({
        attachment_id: attachment._id,
        file_name: attachment.file_name,
      })),
    });
    log.info('Created script chat message with attachment snapshot', {
      userId,
      action: 'create_script_chat_message',
      sessionId: args.sessionId,
      messageId: id,
      role: args.role,
      attachmentCount: selectedAttachments.length,
      statusCode: 200,
    });
    return await ctx.db.get(id);
  },
});

export const getMessageContext = query({
  args: { messageId: v.id('script_chat_messages') },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const message = await ctx.db.get(args.messageId);
    if (!message || message.user_id !== userId) throw new ConvexError('Chat message not found');
    const parent = await ctx.db.get(message.session_id);
    if (!parent || parent.user_id !== userId) throw new ConvexError('Chat session not found');
    const messages = await ctx.db
      .query('script_chat_messages')
      .withIndex('by_session_id', (q) => q.eq('session_id', message.session_id))
      .order('desc')
      .take(20);
    log.debug('Resolved script chat message context', {
      userId,
      action: 'get_script_chat_message_context',
      messageId: args.messageId,
      sessionId: message.session_id,
      historyCount: messages.length,
      attachmentCount: message.attachment_refs?.length ?? 0,
      statusCode: 200,
    });
    return {
      message,
      parent,
      history: messages.reverse(),
    };
  },
});

export const updateMessageStatus = mutation({
  args: {
    messageId: v.id('script_chat_messages'),
    status: v.union(v.literal('accepted'), v.literal('rejected')),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const message = await ctx.db.get(args.messageId);
    if (!message || message.user_id !== userId) {
      throw new ConvexError('Chat message not found');
    }
    await ctx.db.patch(args.messageId, { change_status: args.status });
    return await ctx.db.get(args.messageId);
  },
});
