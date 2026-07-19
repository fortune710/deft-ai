import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { logger } from '../lib/logger';

const log = logger.child({ file: 'convex/contentItems.ts' });

const platform = v.union(
  v.literal('youtube'),
  v.literal('instagram'),
  v.literal('tiktok'),
  v.literal('twitter'),
  v.literal('linkedin'),
  v.literal('facebook'),
);

const status = v.union(
  v.literal('idea'),
  v.literal('in_progress'),
  v.literal('ready'),
  v.literal('published'),
);

const contentItemInput = {
  title: v.string(),
  description: v.optional(v.string()),
  platform,
  scheduled_date: v.string(),
  status,
  content: v.any(),
  script_content: v.optional(v.string()),
  position: v.optional(v.number()),
};

const contentItemUpdates = v.object({
  title: v.optional(v.string()),
  description: v.optional(v.union(v.string(), v.null())),
  platform: v.optional(platform),
  scheduled_date: v.optional(v.string()),
  status: v.optional(status),
  content: v.optional(v.any()),
  script_content: v.optional(v.union(v.string(), v.null())),
  position: v.optional(v.number()),
});

export const get = query({
  args: { itemId: v.id('content_items') },
  handler: async (ctx, { itemId }) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new ConvexError('Unauthenticated');

    const item = await ctx.db.get(itemId);
    return item?.user_id === userId ? item : null;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new ConvexError('Unauthenticated');

    return await ctx.db
      .query('content_items')
      .withIndex('by_user_id_and_scheduled_date', (q) => q.eq('user_id', userId))
      .collect();
  },
});

export const listByStatus = query({
  args: { status },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new ConvexError('Unauthenticated');

    return await ctx.db
      .query('content_items')
      .withIndex('by_user_id_and_status_and_position', (q) =>
        q.eq('user_id', userId).eq('status', args.status),
      )
      .collect();
  },
});

export const listByDateRange = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new ConvexError('Unauthenticated');

    return await ctx.db
      .query('content_items')
      .withIndex('by_user_id_and_scheduled_date', (q) =>
        q.eq('user_id', userId).gte('scheduled_date', args.startDate).lte('scheduled_date', args.endDate),
      )
      .collect();
  },
});

export const create = mutation({
  args: contentItemInput,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new ConvexError('Unauthenticated');
    const now = new Date().toISOString();

    const itemId = await ctx.db.insert('content_items', {
      ...args,
      user_id: userId,
      description: args.description ?? null,
      position: args.position ?? 0,
      script_content: args.script_content ?? null,
      created_at: now,
      updated_at: now,
    });
    return await ctx.db.get(itemId);
  },
});

export const createMany = mutation({
  args: { items: v.array(v.object(contentItemInput)) },
  handler: async (ctx, { items }) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new ConvexError('Unauthenticated');
    const now = new Date().toISOString();

    const created = [];
    for (const item of items) {
      const itemId = await ctx.db.insert('content_items', {
        ...item,
        user_id: userId,
        description: item.description ?? null,
        position: item.position ?? 0,
        script_content: item.script_content ?? null,
        created_at: now,
        updated_at: now,
      });
      const document = await ctx.db.get(itemId);
      if (document) created.push(document);
    }
    return created;
  },
});

export const update = mutation({
  args: { itemId: v.id('content_items'), updates: contentItemUpdates },
  handler: async (ctx, { itemId, updates }) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new ConvexError('Unauthenticated');
    const item = await ctx.db.get(itemId);
    if (!item || item.user_id !== userId) throw new ConvexError('Content item not found');

    await ctx.db.patch(itemId, { ...updates, updated_at: new Date().toISOString() });
    return await ctx.db.get(itemId);
  },
});

export const updateContent = mutation({
  args: { itemId: v.id('content_items'), content: v.any() },
  handler: async (ctx, { itemId, content }) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new ConvexError('Unauthenticated');
    const item = await ctx.db.get(itemId);
    if (!item || item.user_id !== userId) throw new ConvexError('Content item not found');

    const update = typeof content === 'string' ? { script_content: content } : content;
    const mergedContent = { ...(item.content ?? {}), ...update };
    const scriptContent =
      typeof content === 'string' ? content : (content.script_content ?? item.script_content);
    await ctx.db.patch(itemId, {
      content: mergedContent,
      script_content: scriptContent,
      updated_at: new Date().toISOString(),
    });
    return await ctx.db.get(itemId);
  },
});

export const remove = mutation({
  args: { itemId: v.id('content_items') },
  handler: async (ctx, { itemId }) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new ConvexError('Unauthenticated');
    const item = await ctx.db.get(itemId);
    if (!item || item.user_id !== userId) throw new ConvexError('Content item not found');
    const messages = await ctx.db
      .query('script_chat_messages')
      .withIndex('by_session_id', (q) => q.eq('session_id', itemId))
      .collect();
    for (const message of messages) await ctx.db.delete(message._id);
    const attachments = await ctx.db
      .query('script_chat_attachments')
      .withIndex('by_parent_id', (q) => q.eq('parent_id', itemId))
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
    await ctx.db.delete(itemId);
    log.info('Removed content item and chat attachment data', {
      userId,
      action: 'remove_content_item',
      itemId,
      messageCount: messages.length,
      attachmentCount: attachments.length,
      statusCode: 200,
    });
    return null;
  },
});

export const duplicate = mutation({
  args: { itemId: v.id('content_items') },
  handler: async (ctx, { itemId }) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new ConvexError('Unauthenticated');
    const item = await ctx.db.get(itemId);
    if (!item || item.user_id !== userId) throw new ConvexError('Content item not found');

    const { _id, _creationTime, ...copy } = item;
    const now = new Date().toISOString();
    const duplicateId = await ctx.db.insert('content_items', {
      ...copy,
      title: `${item.title} (Copy)`,
      position: item.position + 1,
      created_at: now,
      updated_at: now,
    });
    return await ctx.db.get(duplicateId);
  },
});
