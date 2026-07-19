import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';

const platform = v.union(
  v.literal('youtube'), v.literal('instagram'), v.literal('tiktok'),
  v.literal('twitter'), v.literal('linkedin'), v.literal('facebook'),
);

export const create = mutation({
  args: {
    video_url: v.union(v.string(), v.null()),
    platform,
    content_type: v.union(v.literal('video'), v.literal('text')),
    content_text: v.union(v.string(), v.null()),
    video_file_path: v.union(v.id('_storage'), v.null()),
    model_file_reference: v.union(v.string(), v.null()),
    title: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new ConvexError('Unauthenticated');
    const now = new Date();
    return await ctx.db.insert('content_analytics', {
      ...args,
      user_id: userId,
      transcript: null,
      metrics: null,
      metrics_scraped: false,
      ai_feedback: null,
      analysis_results: null,
      thumbnail_url: null,
      audio_file_path: null,
      processing_status: 'pending',
      processing_error: null,
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: now.toISOString(),
    });
  },
});

export const list = query({
  args: {
    platform: v.optional(platform),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new ConvexError('Unauthenticated');
    const records = await ctx.db.query('content_analytics')
      .withIndex('by_user_id', (q) => q.eq('user_id', userId)).order('desc').collect();
    const filtered = records.filter((record) =>
      (!args.platform || record.platform === args.platform) &&
      (!args.status || record.processing_status === args.status),
    );
    return await Promise.all(filtered.map(async (record) => ({
      ...record,
      thumbnail_url: record.thumbnail_url && !record.thumbnail_url.includes('/')
        ? await ctx.storage.getUrl(record.thumbnail_url as any)
        : record.thumbnail_url,
    })));
  },
});

export const get = query({
  args: { analyticsId: v.id('content_analytics') },
  handler: async (ctx, { analyticsId }) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new ConvexError('Unauthenticated');
    const record = await ctx.db.get(analyticsId);
    return record?.user_id === userId ? record : null;
  },
});
