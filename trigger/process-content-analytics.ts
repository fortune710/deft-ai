import { logger, task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import {
  createProgress,
  upsertProgress,
  updateProgress,
  deleteProgress,
} from "@/lib/api/content-analytics-progress";
import { downloadVideo } from "@/lib/services/video-processor";
import { extractAudioFromVideo } from "@/lib/services/video-processor";
import { extractThumbnailFromVideo } from "@/lib/services/video-processor";
import { transcribeAudioFile } from "@/lib/services/transcription";
import { generateContentFeedback } from "@/lib/ai/content-feedback-generator";
import type { ContentAnalytics, Platform, ContentType } from "@/types/content-analytics";
import { getUserToken } from "@/lib/auth/get-token";

interface ProcessContentAnalyticsPayload {
  userId: string;
  analyticsId: string;
}

function createSupabaseClient(userId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const token = getUserToken(userId);
  return createClient(supabaseUrl, supabaseServiceKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export const processContentAnalyticsTask = task({
  id: "process-content-analytics",
  run: async (payload: ProcessContentAnalyticsPayload, { ctx }) => {
    const { userId, analyticsId } = payload;
    const supabase = createSupabaseClient(userId);

    // Store userId and analyticsId in context for cleanup
    (ctx as any).userId = userId;
    (ctx as any).analyticsId = analyticsId;
    (ctx as any).supabase = supabase;

    try {
      // Step 1: Fetch content record
      logger.log("Fetching content record", { analyticsId, userId });
      await upsertProgress(supabase, analyticsId, userId, 5, "queued", "Fetching content record...");

      const { data: content, error: contentError } = await supabase
        .from("content_analytics")
        .select("*")
        .eq("id", analyticsId)
        .maybeSingle();

      if (contentError || !content) {
        throw new Error(`Content not found: ${contentError?.message || "Unknown error"}`);
      }

      // Step 2: Process based on content type
      if (content.content_type === "video") {
        await processVideoContent(content, userId, analyticsId, supabase);
      } else if (content.content_type === "text") {
        await processTextContent(content, userId, analyticsId, supabase);
      } else {
        throw new Error(`Unknown content type: ${content.content_type}`);
      }

      // Step 3: Mark as completed
      await updateProgress(supabase, analyticsId, {
        progress: 100,
        stage: "completed",
        status: "completed",
        message: "Analysis completed successfully",
      });

      // Update content status
      await supabase
        .from("content_analytics")
        .update({ processing_status: "completed" })
        .eq("id", analyticsId);

      // Clean up progress
      await deleteProgress(supabase, analyticsId);

      logger.log("Content analytics processing completed", { analyticsId, userId });

      return {
        success: true,
        analyticsId,
        userId,
        message: "Content analysis completed successfully",
      };
    } catch (error) {
      logger.error("Content analytics processing failed", { error, analyticsId, userId });

      // Update progress with error
      try {
        await updateProgress(supabase, analyticsId, {
          progress: 0,
          stage: "completed",
          status: "failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });

        // Update content status
        await supabase
          .from("content_analytics")
          .update({
            processing_status: "failed",
            processing_error: error instanceof Error ? error.message : "Unknown error",
          })
          .eq("id", analyticsId);
      } catch (updateError) {
        logger.error("Failed to update error status", { updateError });
      }

      throw error;
    }
  },
  onCancel: async ({ payload }) => {
    const analyticsId = payload?.analyticsId;
    const userId = payload?.userId;

    if (!analyticsId || !userId) {
      logger.error("Task cancelled but no analyticsId available for cleanup");
      return;
    }

    const supabase = createSupabaseClient(userId);

    logger.log("Task cancelled - cleaning up progress", { analyticsId });

    try {
      await deleteProgress(supabase, analyticsId);
      logger.log("Progress cleaned up successfully after cancellation", { analyticsId });
    } catch (cleanupError) {
      logger.error("Failed to clean up progress on cancel", { cleanupError, analyticsId });
    }
  },
  onFailure: async ({ payload, error, ctx }) => {
    const analyticsId = payload?.analyticsId || (ctx as any)?.analyticsId;

    const userId = payload?.userId || (ctx as any)?.userId;

    if (!analyticsId || !userId) {
      logger.error("Task failed but no analyticsId or userId available for cleanup", {
        error: error instanceof Error ? error.message : "Unknown error",
        analyticsId,
        userId,
      });
      return;
    }

    const supabase = createSupabaseClient(userId);

    logger.error("Task failed - cleaning up progress", {
      error: error instanceof Error ? error.message : "Unknown error",
      analyticsId,
    });

    try {
      await deleteProgress(supabase, analyticsId);
      logger.log("Progress cleaned up successfully", { analyticsId });
    } catch (cleanupError) {
      logger.error("Failed to clean up progress on failure", { cleanupError, analyticsId });
    }
  },
});

async function processVideoContent(
  content: ContentAnalytics,
  userId: string,
  analyticsId: string,
  supabase: ReturnType<typeof createSupabaseClient>
) {
  // Step 1: Download video (if not already uploaded)
  let videoFilePath = content.video_file_path;
  if (!videoFilePath && content.video_url) {
    logger.log("Downloading video", { analyticsId, platform: content.platform });
    await upsertProgress(supabase, analyticsId, userId, 10, "download", "Downloading video...");
    
    const downloadResult = await downloadVideo(
      content.video_url,
      analyticsId,
      content.platform as Platform
    );

    if (!downloadResult.success) {
      throw new Error(`Video download failed: ${downloadResult.error}`);
    }

    videoFilePath = downloadResult.storage_path || downloadResult.file_path || null;

    // Update content with video file path
    await supabase
      .from("content_analytics")
      .update({ video_file_path: videoFilePath })
      .eq("id", analyticsId);
  }

  // Step 2: Extract thumbnail
  logger.log("Extracting thumbnail", { analyticsId });
  await upsertProgress(supabase, analyticsId, userId, 30, "extract_thumbnail", "Extracting thumbnail...");

  const thumbnailResult = await extractThumbnailFromVideo(analyticsId);

  if (thumbnailResult.success && thumbnailResult.thumbnail_url) {
    await supabase
      .from("content_analytics")
      .update({ thumbnail_url: thumbnailResult.thumbnail_url })
      .eq("id", analyticsId);
  } else {
    logger.warn("Thumbnail extraction failed", { error: thumbnailResult.error });
  }

  // Step 3: Extract audio
  logger.log("Extracting audio", { analyticsId });
  await upsertProgress(supabase, analyticsId, userId, 40, "extract_audio", "Extracting audio...");

  const audioResult = await extractAudioFromVideo(analyticsId);

  if (!audioResult.success) {
    throw new Error(`Audio extraction failed: ${audioResult.error}`);
  }

  // Update content with audio file path
  await supabase
    .from("content_analytics")
    .update({ audio_file_path: audioResult.storage_path })
    .eq("id", analyticsId);

  // Step 4: Transcribe audio
  logger.log("Transcribing audio", { analyticsId });
  await upsertProgress(supabase, analyticsId, userId, 60, "transcribe", "Transcribing audio...");

  const transcriptionResult = await transcribeAudioFile(analyticsId);

  if (!transcriptionResult.success || !transcriptionResult.transcript) {
    throw new Error(`Transcription failed: ${transcriptionResult.error}`);
  }

  // Update content with transcript
  await supabase
    .from("content_analytics")
    .update({ transcript: transcriptionResult.transcript })
    .eq("id", analyticsId);

  // Step 5: Analyze content
  logger.log("Analyzing content", { analyticsId });
  await upsertProgress(supabase, analyticsId, userId, 80, "analyze", "Analyzing content...");

  const feedbackResult = await generateContentFeedback(analyticsId, userId);

  if (!feedbackResult.success || !feedbackResult.feedback) {
    throw new Error(`Content analysis failed: ${feedbackResult.error}`);
  }

  // Update content with analysis results
  await supabase
    .from("content_analytics")
    .update({ analysis_results: feedbackResult.feedback })
    .eq("id", analyticsId);
}

async function processTextContent(
  content: ContentAnalytics,
  userId: string,
  analyticsId: string,
  supabase: ReturnType<typeof createSupabaseClient>
) {
  if (!content.content_text || content.content_text.trim().length === 0) {
    throw new Error("Content text is required for text analysis");
  }

  // Step 1: Analyze text content
  logger.log("Analyzing text content", { analyticsId });
  await upsertProgress(supabase, analyticsId, userId, 50, "analyze", "Analyzing text content...");

  const feedbackResult = await generateContentFeedback(analyticsId, userId);

  if (!feedbackResult.success || !feedbackResult.feedback) {
    throw new Error(`Text analysis failed: ${feedbackResult.error}`);
  }

  // Update content with analysis results
  await supabase
    .from("content_analytics")
    .update({ analysis_results: feedbackResult.feedback })
    .eq("id", analyticsId);
}
