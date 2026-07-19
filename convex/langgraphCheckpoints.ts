import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';

function authorize(secret: string) {
  if (!process.env.TRIGGER_CONVEX_SECRET || secret !== process.env.TRIGGER_CONVEX_SECRET) {
    throw new ConvexError('Unauthorized checkpoint client');
  }
}

export const putCheckpoint = mutation({
  args: {
    secret: v.string(), threadId: v.string(), checkpointNs: v.string(), checkpointId: v.string(),
    parentCheckpointId: v.optional(v.string()), checkpointType: v.string(), checkpointData: v.string(),
    metadataType: v.string(), metadataData: v.string(),
  },
  handler: async (ctx, args) => {
    authorize(args.secret);
    const existing = await ctx.db.query('langgraph_checkpoints')
      .withIndex('by_thread_namespace_checkpoint', (q) =>
        q.eq('thread_id', args.threadId).eq('checkpoint_ns', args.checkpointNs).eq('checkpoint_id', args.checkpointId),
      ).unique();
    const value = {
      thread_id: args.threadId, checkpoint_ns: args.checkpointNs, checkpoint_id: args.checkpointId,
      parent_checkpoint_id: args.parentCheckpointId, checkpoint_type: args.checkpointType,
      checkpoint_data: args.checkpointData, metadata_type: args.metadataType,
      metadata_data: args.metadataData, created_at: Date.now(),
    };
    if (existing) await ctx.db.replace(existing._id, value);
    else await ctx.db.insert('langgraph_checkpoints', value);
    return null;
  },
});

export const putWrites = mutation({
  args: { secret: v.string(), writes: v.array(v.object({
    threadId: v.string(), checkpointNs: v.string(), checkpointId: v.string(), taskId: v.string(),
    writeIndex: v.number(), channel: v.string(), valueType: v.string(), valueData: v.string(),
  })) },
  handler: async (ctx, { secret, writes }) => {
    authorize(secret);
    for (const write of writes) {
      const existing = await ctx.db.query('langgraph_checkpoint_writes')
        .withIndex('by_write', (q) => q.eq('thread_id', write.threadId)
          .eq('checkpoint_ns', write.checkpointNs).eq('checkpoint_id', write.checkpointId)
          .eq('task_id', write.taskId).eq('write_index', write.writeIndex)).unique();
      if (existing && write.writeIndex >= 0) continue;
      const value = {
        thread_id: write.threadId, checkpoint_ns: write.checkpointNs, checkpoint_id: write.checkpointId,
        task_id: write.taskId, write_index: write.writeIndex, channel: write.channel,
        value_type: write.valueType, value_data: write.valueData, created_at: Date.now(),
      };
      if (existing) await ctx.db.replace(existing._id, value);
      else await ctx.db.insert('langgraph_checkpoint_writes', value);
    }
    return null;
  },
});

export const getCheckpoint = query({
  args: { secret: v.string(), threadId: v.string(), checkpointNs: v.string(), checkpointId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    authorize(args.secret);
    const checkpoints = await ctx.db.query('langgraph_checkpoints')
      .withIndex('by_thread_namespace', (q) => q.eq('thread_id', args.threadId).eq('checkpoint_ns', args.checkpointNs)).collect();
    const checkpoint = args.checkpointId
      ? checkpoints.find((item) => item.checkpoint_id === args.checkpointId)
      : checkpoints.sort((a, b) => b.checkpoint_id.localeCompare(a.checkpoint_id))[0];
    if (!checkpoint) return null;
    const writes = await ctx.db.query('langgraph_checkpoint_writes')
      .withIndex('by_checkpoint', (q) => q.eq('thread_id', args.threadId)
        .eq('checkpoint_ns', args.checkpointNs).eq('checkpoint_id', checkpoint.checkpoint_id)).collect();
    return { checkpoint, writes };
  },
});

export const listCheckpoints = query({
  args: { secret: v.string(), threadId: v.string(), checkpointNs: v.optional(v.string()) },
  handler: async (ctx, args) => {
    authorize(args.secret);
    const checkpoints = args.checkpointNs !== undefined
      ? await ctx.db.query('langgraph_checkpoints').withIndex('by_thread_namespace', (q) =>
          q.eq('thread_id', args.threadId).eq('checkpoint_ns', args.checkpointNs!),
        ).collect()
      : (await ctx.db.query('langgraph_checkpoints').collect()).filter((item) => item.thread_id === args.threadId);
    return checkpoints.sort((a, b) => b.checkpoint_id.localeCompare(a.checkpoint_id));
  },
});

export const deleteThread = mutation({
  args: { secret: v.string(), threadId: v.string() },
  handler: async (ctx, args) => {
    authorize(args.secret);
    const checkpoints = (await ctx.db.query('langgraph_checkpoints').collect()).filter((item) => item.thread_id === args.threadId);
    const writes = (await ctx.db.query('langgraph_checkpoint_writes').collect()).filter((item) => item.thread_id === args.threadId);
    await Promise.all([...checkpoints, ...writes].map((item) => ctx.db.delete(item._id)));
    return null;
  },
});
