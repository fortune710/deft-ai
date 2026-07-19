import { defineSchema, defineTable } from "convex/server";
import { v, type GenericValidator } from "convex/values";

const nullable = <T extends GenericValidator>(value: T) =>
  v.optional(v.union(value, v.null()));

const platform = v.union(
  v.literal("youtube"),
  v.literal("instagram"),
  v.literal("tiktok"),
  v.literal("twitter"),
  v.literal("linkedin"),
  v.literal("facebook"),
);

const contentItemStatus = v.union(
  v.literal("idea"),
  v.literal("in_progress"),
  v.literal("ready"),
  v.literal("published"),
);

const processingStatus = v.union(
  v.literal("pending"),
  v.literal("downloading"),
  v.literal("extracting_audio"),
  v.literal("transcribing"),
  v.literal("analyzing"),
  v.literal("extracting_thumbnail"),
  v.literal("completed"),
  v.literal("failed"),
);

const queueStatus = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed"),
);

const processingStep = v.union(
  v.literal("queued"),
  v.literal("download"),
  v.literal("extract_audio"),
  v.literal("transcribe"),
  v.literal("analyze"),
  v.literal("extract_thumbnail"),
  v.literal("completed"),
);

/**
 * Convex equivalent of the final legacy SQL schema.
 *
 * `user_id` remains a string because it identifies a Clerk
 * user, not a Convex document. Internal relationships use `v.id(...)`, which
 * provides table-aware document IDs. Cascading deletes must be implemented in
 * mutations because Convex intentionally does not perform SQL-style cascades.
 */
export default defineSchema({
  user_content_profile: defineTable({
    user_id: v.string(),
    question_1_niche: nullable(v.any()),
    question_2_goal: nullable(v.string()),
    question_3_platforms: v.array(
      v.object({
        name: v.string(),
        isPrimary: v.boolean(),
      }),
    ),
    question_4_experience: nullable(v.string()),
    question_5_frequency: nullable(v.string()),
    completed_at: nullable(v.string()),
    created_at: nullable(v.string()),
    updated_at: nullable(v.string()),
  })
    .index("by_user_id", ["user_id"])
    .index("by_completed_at", ["completed_at"]),

  content_items: defineTable({
    user_id: v.string(),
    title: v.string(),
    description: nullable(v.string()),
    platform,
    scheduled_date: v.string(),
    status: contentItemStatus,
    content: v.any(),
    script_content: nullable(v.string()),
    position: v.number(),
    created_at: nullable(v.string()),
    updated_at: nullable(v.string()),
  })
    .index("by_user_id", ["user_id"])
    .index("by_user_id_and_scheduled_date", ["user_id", "scheduled_date"])
    .index("by_user_id_and_status_and_position", ["user_id", "status", "position"]),

  content_engine_progress: defineTable({
    user_id: v.string(),
    progress: v.number(),
    stage: v.string(),
    message: nullable(v.string()),
    created_at: nullable(v.string()),
    updated_at: nullable(v.string()),
  })
    .index("by_user_id", ["user_id"])
    .index("by_user_id_and_updated_at", ["user_id", "updated_at"]),

  script_chat_sessions: defineTable({
    user_id: v.string(),
    title: v.string(),
    editor_content: v.any(),
    created_at: nullable(v.string()),
    updated_at: nullable(v.string()),
  })
    .index("by_user_id", ["user_id"])
    .index("by_user_id_and_updated_at", ["user_id", "updated_at"]),

  script_chat_messages: defineTable({
    // The FK was deliberately removed in 20260402160500. The application now
    // associates messages with either a legacy chat session or a content item.
    session_id: v.union(v.id("script_chat_sessions"), v.id("content_items")),
    user_id: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    message_type: v.union(v.literal("ask"), v.literal("edit")),
    content: v.string(),
    proposed_changes: nullable(v.any()),
    change_status: nullable(
      v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("rejected"),
      ),
    ),
    created_at: nullable(v.string()),
    attachment_refs: v.optional(v.array(v.object({
      attachment_id: v.id('script_chat_attachments'),
      file_name: v.string(),
    }))),
  })
    .index("by_session_id", ["session_id"])
    .index("by_user_id", ["user_id"]),

  script_chat_attachments: defineTable({
    parent_id: v.union(v.id('script_chat_sessions'), v.id('content_items')),
    user_id: v.string(),
    storage_id: v.id('_storage'),
    file_name: v.string(),
    mime_type: v.string(),
    size_bytes: v.number(),
    is_selected: v.boolean(),
    processing_status: v.union(
      v.literal('queued'),
      v.literal('processing'),
      v.literal('ready'),
      v.literal('failed'),
      v.literal('quarantined'),
    ),
    security_status: v.union(v.literal('pending'), v.literal('passed'), v.literal('blocked')),
    security_findings: v.array(v.object({
      chunk_index: v.number(),
      category: v.string(),
      reason: v.string(),
      content_hash: v.string(),
      confidence: v.number(),
    })),
    processing_error: nullable(v.string()),
    chunk_count: v.number(),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index('by_parent_id', ['parent_id'])
    .index('by_user_id', ['user_id']),

  script_chat_attachment_chunks: defineTable({
    attachment_id: v.id('script_chat_attachments'),
    user_id: v.string(),
    chunk_index: v.number(),
    content: v.string(),
    file_name: v.string(),
    page_number: nullable(v.number()),
    section: nullable(v.string()),
    security_status: v.literal('passed'),
    embedding: v.array(v.float64()),
    created_at: v.string(),
  })
    .index('by_attachment_id', ['attachment_id'])
    .vectorIndex('by_embedding', {
      vectorField: 'embedding',
      dimensions: 1536,
      filterFields: ['attachment_id'],
    }),

  content_analytics: defineTable({
    user_id: v.string(),
    video_url: nullable(v.string()),
    platform,
    title: v.string(),
    description: v.string(),
    transcript: nullable(v.string()),
    metrics: nullable(v.any()),
    metrics_scraped: v.boolean(),
    ai_feedback: nullable(v.any()),
    analysis_results: nullable(v.any()),
    content_type: v.union(v.literal("video"), v.literal("text")),
    content_text: nullable(v.string()),
    thumbnail_url: nullable(v.union(v.string(), v.id('_storage'))),
    video_file_path: nullable(v.union(v.string(), v.id('_storage'))),
    audio_file_path: nullable(v.union(v.string(), v.id('_storage'))),
    model_file_reference: nullable(v.string()),
    processing_status: processingStatus,
    processing_error: nullable(v.string()),
    created_at: nullable(v.string()),
    expires_at: v.string(),
    updated_at: nullable(v.string()),
  })
    .index("by_user_id", ["user_id"])
    .index("by_platform", ["platform"])
    .index("by_processing_status", ["processing_status"])
    .index("by_created_at", ["created_at"])
    .index("by_expires_at", ["expires_at"])
    .index("by_content_type", ["content_type"])
    .index("by_thumbnail_url", ["thumbnail_url"]),

  content_analytics_progress: defineTable({
    analytics_id: v.id("content_analytics"),
    user_id: v.string(),
    status: queueStatus,
    current_step: processingStep,
    progress_percentage: v.number(),
    message: nullable(v.string()),
    retry_count: v.number(),
    max_retries: v.number(),
    priority: nullable(v.number()),
    started_at: nullable(v.string()),
    completed_at: nullable(v.string()),
    created_at: nullable(v.string()),
  })
    .index("by_analytics_id", ["analytics_id"])
    .index("by_user_id", ["user_id"])
    .index("by_status", ["status"])
    .index("by_created_at", ["created_at"])
    .index("by_status_and_priority_and_created_at", ["status", "priority", "created_at"]),

  custom_objects: defineTable({
    user_id: v.string(),
    name: v.string(),
    type: v.union(
      v.literal("brand guide"),
      v.literal("social link"),
      v.literal("others"),
    ),
    content: nullable(v.string()),
    created_at: nullable(v.string()),
  })
    .index("by_user_id", ["user_id"])
    .index("by_user_id_and_created_at", ["user_id", "created_at"]),

  langgraph_checkpoints: defineTable({
    thread_id: v.string(),
    checkpoint_ns: v.string(),
    checkpoint_id: v.string(),
    parent_checkpoint_id: v.optional(v.string()),
    checkpoint_type: v.string(),
    checkpoint_data: v.string(),
    metadata_type: v.string(),
    metadata_data: v.string(),
    created_at: v.number(),
  })
    .index("by_thread_namespace", ["thread_id", "checkpoint_ns"])
    .index("by_thread_namespace_checkpoint", ["thread_id", "checkpoint_ns", "checkpoint_id"]),

  langgraph_checkpoint_writes: defineTable({
    thread_id: v.string(),
    checkpoint_ns: v.string(),
    checkpoint_id: v.string(),
    task_id: v.string(),
    write_index: v.number(),
    channel: v.string(),
    value_type: v.string(),
    value_data: v.string(),
    created_at: v.number(),
  })
    .index("by_checkpoint", ["thread_id", "checkpoint_ns", "checkpoint_id"])
    .index("by_write", ["thread_id", "checkpoint_ns", "checkpoint_id", "task_id", "write_index"]),
});
