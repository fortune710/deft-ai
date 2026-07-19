import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';

const customObjectType = v.union(
  v.literal('brand guide'),
  v.literal('social link'),
  v.literal('others'),
);

export const listCurrent = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new ConvexError('Unauthenticated');

    return await ctx.db
      .query('custom_objects')
      .withIndex('by_user_id_and_created_at', (q) => q.eq('user_id', userId))
      .order('desc')
      .collect();
  },
});

export const createCurrent = mutation({
  args: {
    name: v.string(),
    type: customObjectType,
    content: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new ConvexError('Unauthenticated');

    const id = await ctx.db.insert('custom_objects', {
      user_id: userId,
      name: args.name,
      type: args.type,
      content: args.content,
      created_at: new Date().toISOString(),
    });
    return await ctx.db.get(id);
  },
});

export const removeCurrent = mutation({
  args: { objectId: v.id('custom_objects') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject;
    if (!userId) throw new ConvexError('Unauthenticated');

    const object = await ctx.db.get(args.objectId);
    if (!object || object.user_id !== userId) {
      throw new ConvexError('Custom object not found');
    }
    await ctx.db.delete(args.objectId);
    return null;
  },
});
