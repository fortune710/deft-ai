import {
  BaseCheckpointSaver,
  WRITES_IDX_MAP,
  type Checkpoint,
  type CheckpointListOptions,
  type CheckpointMetadata,
  type CheckpointTuple,
  type ChannelVersions,
  type PendingWrite,
} from '@langchain/langgraph-checkpoint';
import type { RunnableConfig } from '@langchain/core/runnables';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { logger } from '@/lib/logger.server';

const log = logger.child({ module: 'lib/ai/agents/checkpointer' });

const encode = (value: Uint8Array) => Buffer.from(value).toString('base64');
const decode = (value: string) => new Uint8Array(Buffer.from(value, 'base64'));

export class ConvexCheckpointSaver extends BaseCheckpointSaver {
  constructor(
    private readonly client: ConvexHttpClient,
    private readonly secret: string,
  ) {
    super();
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) return undefined;
    const checkpointNs = config.configurable?.checkpoint_ns ?? '';
    const result = await this.client.query(api.langgraphCheckpoints.getCheckpoint, {
      secret: this.secret,
      threadId,
      checkpointNs,
      checkpointId: config.configurable?.checkpoint_id,
    });
    if (!result) return undefined;

    const checkpoint = await this.serde.loadsTyped(
      result.checkpoint.checkpoint_type,
      decode(result.checkpoint.checkpoint_data),
    ) as Checkpoint;
    const metadata = await this.serde.loadsTyped(
      result.checkpoint.metadata_type,
      decode(result.checkpoint.metadata_data),
    ) as CheckpointMetadata;
    const pendingWrites = await Promise.all(result.writes.map(async (write) => [
      write.task_id,
      write.channel,
      await this.serde.loadsTyped(write.value_type, decode(write.value_data)),
    ] as [string, string, unknown]));

    const tuple: CheckpointTuple = {
      config: { configurable: { thread_id: threadId, checkpoint_ns: checkpointNs, checkpoint_id: checkpoint.id } },
      checkpoint,
      metadata,
      pendingWrites,
    };
    if (result.checkpoint.parent_checkpoint_id) {
      tuple.parentConfig = { configurable: {
        thread_id: threadId,
        checkpoint_ns: checkpointNs,
        checkpoint_id: result.checkpoint.parent_checkpoint_id,
      } };
    }
    return tuple;
  }

  async *list(config: RunnableConfig, options?: CheckpointListOptions): AsyncGenerator<CheckpointTuple> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) return;
    const records = await this.client.query(api.langgraphCheckpoints.listCheckpoints, {
      secret: this.secret,
      threadId,
      checkpointNs: config.configurable?.checkpoint_ns,
    });
    let yielded = 0;
    for (const record of records) {
      if (options?.before?.configurable?.checkpoint_id && record.checkpoint_id >= options.before.configurable.checkpoint_id) continue;
      const tuple = await this.getTuple({ configurable: {
        thread_id: threadId,
        checkpoint_ns: record.checkpoint_ns,
        checkpoint_id: record.checkpoint_id,
      } });
      if (!tuple) continue;
      if (options?.filter && !Object.entries(options.filter).every(
        ([key, value]) => (tuple.metadata as Record<string, unknown> | undefined)?.[key] === value,
      )) continue;
      yield tuple;
      yielded += 1;
      if (options?.limit !== undefined && yielded >= options.limit) break;
    }
  }

  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
    _newVersions: ChannelVersions,
  ): Promise<RunnableConfig> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) throw new Error('Checkpoint config is missing thread_id');
    const checkpointNs = config.configurable?.checkpoint_ns ?? '';
    const [[checkpointType, checkpointData], [metadataType, metadataData]] = await Promise.all([
      this.serde.dumpsTyped(checkpoint),
      this.serde.dumpsTyped(metadata),
    ]);
    await this.client.mutation(api.langgraphCheckpoints.putCheckpoint, {
      secret: this.secret,
      threadId,
      checkpointNs,
      checkpointId: checkpoint.id,
      parentCheckpointId: config.configurable?.checkpoint_id,
      checkpointType,
      checkpointData: encode(checkpointData),
      metadataType,
      metadataData: encode(metadataData),
    });
    log.debug('Persisted LangGraph checkpoint in Convex', {
      userId: 'checkpoint_owner', action: 'put_langgraph_checkpoint', threadId, checkpointId: checkpoint.id,
    });
    return { configurable: { thread_id: threadId, checkpoint_ns: checkpointNs, checkpoint_id: checkpoint.id } };
  }

  async putWrites(config: RunnableConfig, writes: PendingWrite[], taskId: string): Promise<void> {
    const threadId = config.configurable?.thread_id;
    const checkpointId = config.configurable?.checkpoint_id;
    if (!threadId || !checkpointId) throw new Error('Write config is missing thread_id or checkpoint_id');
    const checkpointNs = config.configurable?.checkpoint_ns ?? '';
    const serialized = await Promise.all(writes.map(async ([channel, value], index) => {
      const [valueType, valueData] = await this.serde.dumpsTyped(value);
      return {
        threadId, checkpointNs, checkpointId, taskId,
        writeIndex: WRITES_IDX_MAP[channel] ?? index,
        channel, valueType, valueData: encode(valueData),
      };
    }));
    await this.client.mutation(api.langgraphCheckpoints.putWrites, { secret: this.secret, writes: serialized });
  }

  async deleteThread(threadId: string): Promise<void> {
    await this.client.mutation(api.langgraphCheckpoints.deleteThread, { secret: this.secret, threadId });
    log.info('Deleted LangGraph checkpoint thread', {
      userId: 'checkpoint_owner', action: 'delete_langgraph_thread', threadId,
    });
  }
}

let checkpointer: ConvexCheckpointSaver | null = null;

export async function getCheckpointer() {
  if (checkpointer) return checkpointer;
  const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.TRIGGER_CONVEX_SECRET;
  const missingVariables = [
    ...(!convexUrl ? ['CONVEX_URL or NEXT_PUBLIC_CONVEX_URL'] : []),
    ...(!secret ? ['TRIGGER_CONVEX_SECRET'] : []),
  ];
  if (missingVariables.length > 0) {
    log.error('Convex checkpoint environment variables are missing', {
      userId: 'system',
      action: 'initialize_convex_checkpointer',
      missingVariables,
    });
    throw new Error(`Missing checkpoint environment variable(s): ${missingVariables.join(', ')}`);
  }
  checkpointer = new ConvexCheckpointSaver(new ConvexHttpClient(convexUrl!), secret!);
  log.info('Initialized Convex LangGraph checkpointer', {
    userId: 'system', action: 'initialize_convex_checkpointer',
  });
  return checkpointer;
}
