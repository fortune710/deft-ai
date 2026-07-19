import { ConvexError } from 'convex/values';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

const requireUserId = async (ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) => {
  const identity = await ctx.auth.getUserIdentity();
  const userId = identity?.subject;
  if (!userId) throw new ConvexError('Unauthenticated');
  return userId;
};

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);

    return await ctx.db
      .query('user_content_profile')
      .withIndex('by_user_id', (q) => q.eq('user_id', userId))
      .unique();
  },
});

export const upsertCurrent = mutation({
  args: {
    question_1_niche: v.any(),
    question_2_goal: v.string(),
    question_3_platforms: v.array(v.object({ name: v.string(), isPrimary: v.boolean() })),
    question_4_experience: v.string(),
    question_5_frequency: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query('user_content_profile')
      .withIndex('by_user_id', (q) => q.eq('user_id', userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        completed_at: now,
        updated_at: now,
      });
      return await ctx.db.get(existing._id);
    }

    const profileId = await ctx.db.insert('user_content_profile', {
      user_id: userId,
      ...args,
      completed_at: now,
      created_at: now,
      updated_at: now,
    });
    return await ctx.db.get(profileId);
  },
});

export const updateCurrentNiche = mutation({
  args: { question_1_niche: v.any() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const profile = await ctx.db
      .query('user_content_profile')
      .withIndex('by_user_id', (q) => q.eq('user_id', userId))
      .unique();

    if (!profile) throw new ConvexError('Content profile not found');
    await ctx.db.patch(profile._id, {
      question_1_niche: args.question_1_niche,
      updated_at: new Date().toISOString(),
    });
    return await ctx.db.get(profile._id);
  },
});
