import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new ConvexError('Unauthenticated');
    return await ctx.storage.generateUploadUrl();
  },
});

export const getUrl = query({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, { storageId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new ConvexError('Unauthenticated');
    return await ctx.storage.getUrl(storageId);
  },
});
