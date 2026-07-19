import { ConvexError } from 'convex/values';
import { query } from './_generated/server';

export const getCurrentContentEngine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new ConvexError('Unauthenticated');

    const progress = await ctx.db
      .query('content_engine_progress')
      .withIndex('by_user_id_and_updated_at', (q) => q.eq('user_id', userId))
      .order('desc')
      .first();
    return progress && progress.stage !== 'completed' && progress.stage !== 'failed'
      ? progress
      : null;
  },
});

export const getCurrentContentAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new ConvexError('Unauthenticated');

    return await ctx.db
      .query('content_analytics_progress')
      .withIndex('by_user_id', (q) => q.eq('user_id', userId))
      .order('desc')
      .first();
  },
});
