import { logger, task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { downloadVideo } from "@/lib/services/video-processor";
import { extractThumbnailFromVideo } from "@/lib/services/video-processor";
import { generateContentFeedback } from "@/lib/ai/content-feedback-generator";
import type { ContentAnalytics, Platform } from "@/types/content-analytics";
import { getUserToken } from "@/lib/auth/get-token";
import {
  upsertProgress,
  updateProgress,
} from "@/lib/api/content-analytics-progress";
import { runContentAnalysisOrchestrator } from "@/lib/ai/orchestrator/content-analysis-orchestrator";
import jwt from "jsonwebtoken";

interface ProcessContentAnalyticsPayload {
  userId: string;
  analyticsId: string;
}

function getToken(userId: string) {
  if (!userId) {
      throw new Error("User ID is required");
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET!;
  if (!jwtSecret) {
      throw new Error("JWT secret is required");
  }
  const token = jwt.sign(
    { sub:userId, role: "authenticated" }, 
    jwtSecret, 
    { expiresIn: "1h", audience: "authenticated", issuer: "supabase" }
  );
  return token;
}

function createSupabaseClient(userId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  let token = getToken(userId);
  return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
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
      await upsertProgress(
        supabase,
        analyticsId,
        userId,
        0,
        "queued",
        "Queued for content analysis"
      );

      await runContentAnalysisOrchestrator({
        supabase,
        analyticsId,
        userId,
        logger,
        onProgress: async (event) => {
          const message = event.details ? `${event.message} - ${event.details}` : event.message;
          await upsertProgress(
            supabase,
            analyticsId,
            userId,
            event.progress,
            event.step,
            message
          );
        },
      });

      // Update content status
      logger.log("Updating content status to completed", { analyticsId, userId });
      const { data: updateData, error: updateError } = await supabase
        .from("content_analytics")
        .update({ processing_status: "completed" })
        .eq("id", analyticsId)
        .select();

      if (updateError) {
        logger.error("Failed to update content status to completed", {
          error: updateError.message,
          code: updateError.code,
          details: updateError.details,
          analyticsId,
          userId
        });
      } else {
        logger.log("Content status updated to completed successfully", {
          analyticsId,
          userId,
          updatedData: updateData
        });
      }

      await updateProgress(supabase, analyticsId, {
        progress: 100,
        stage: "completed",
        status: "completed",
        message: "Content analysis completed",
      });

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
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.log("Updating content status to failed", { analyticsId, userId, errorMessage });
        
        // Update content status
        const { data: updateData, error: updateError } = await supabase
          .from("content_analytics")
          .update({
            processing_status: "failed",
            processing_error: errorMessage,
          })
          .eq("id", analyticsId)
          .select();

        if (updateError) {
          logger.error("Failed to update content status to failed", {
            error: updateError.message,
            code: updateError.code,
            details: updateError.details,
            analyticsId,
            userId,
            originalError: errorMessage
          });
        } else {
          logger.log("Content status updated to failed successfully", {
            analyticsId,
            userId,
            updatedData: updateData,
            errorMessage
          });
        }
        await updateProgress(supabase, analyticsId, {
          status: "failed",
          message: errorMessage,
        });
      } catch (updateError) {
        logger.error("Failed to update error status", { 
          updateError,
          analyticsId,
          userId,
          originalError: error instanceof Error ? error.message : "Unknown error"
        });
      }

      throw error;
    }
  }
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
    logger.log("Updating content with video file path", { analyticsId, videoFilePath });
    const { data: videoUpdateData, error: videoUpdateError } = await supabase
      .from("content_analytics")
      .update({ video_file_path: videoFilePath })
      .eq("id", analyticsId)
      .select();

    if (videoUpdateError) {
      logger.error("Failed to update video file path", {
        error: videoUpdateError.message,
        code: videoUpdateError.code,
        details: videoUpdateError.details,
        analyticsId,
        videoFilePath
      });
    } else {
      logger.log("Video file path updated successfully", {
        analyticsId,
        videoFilePath,
        updatedData: videoUpdateData
      });
    }
  }

  // Step 2: Extract thumbnail
  logger.log("Extracting thumbnail", { analyticsId });

  const thumbnailResult = await extractThumbnailFromVideo(analyticsId);

  if (thumbnailResult.success && thumbnailResult.thumbnail_url) {
    logger.log("Updating content with thumbnail URL", { analyticsId, thumbnailUrl: thumbnailResult.thumbnail_url });
    const { data: thumbnailUpdateData, error: thumbnailUpdateError } = await supabase
      .from("content_analytics")
      .update({ thumbnail_url: thumbnailResult.thumbnail_url })
      .eq("id", analyticsId)
      .select();

    if (thumbnailUpdateError) {
      logger.error("Failed to update thumbnail URL", {
        error: thumbnailUpdateError.message,
        code: thumbnailUpdateError.code,
        details: thumbnailUpdateError.details,
        analyticsId,
        thumbnailUrl: thumbnailResult.thumbnail_url
      });
    } else {
      logger.log("Thumbnail URL updated successfully", {
        analyticsId,
        thumbnailUrl: thumbnailResult.thumbnail_url,
        updatedData: thumbnailUpdateData
      });
    }
  } else {
    logger.warn("Thumbnail extraction failed", { error: thumbnailResult.error, analyticsId });
  }

  // Step 3: Analyze content
  logger.log("Analyzing content", { analyticsId });

  const feedbackResult = await generateContentFeedback(supabase,analyticsId, userId);

  if (!feedbackResult.success || !feedbackResult.feedback) {
    throw new Error(`Content analysis failed: ${feedbackResult.error}`);
  }

  // Update content with analysis results
  logger.log("Updating content with analysis results", { 
    analyticsId,
    feedbackKeys: feedbackResult.feedback ? Object.keys(feedbackResult.feedback) : []
  });
  const { data: feedbackUpdateData, error: feedbackUpdateError } = await supabase
    .from("content_analytics")
    .update({ analysis_results: feedbackResult.feedback })
    .eq("id", analyticsId)
    .select();

  if (feedbackUpdateError) {
    logger.error("Failed to update analysis results", {
      error: feedbackUpdateError.message,
      code: feedbackUpdateError.code,
      details: feedbackUpdateError.details,
      analyticsId
    });
  } else {
    logger.log("Analysis results updated successfully", {
      analyticsId,
      updatedData: feedbackUpdateData
    });
  }
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
  const feedbackResult = await generateContentFeedback(supabase, analyticsId, userId);

  if (!feedbackResult.success || !feedbackResult.feedback) {
    throw new Error(`Text analysis failed: ${feedbackResult.error}`);
  }

  // Update content with analysis results
  logger.log("Updating text content with analysis results", { 
    analyticsId,
    feedbackKeys: feedbackResult.feedback ? Object.keys(feedbackResult.feedback) : []
  });
  const { data: feedbackUpdateData, error: feedbackUpdateError } = await supabase
    .from("content_analytics")
    .update({ analysis_results: feedbackResult.feedback })
    .eq("id", analyticsId)
    .select();

  if (feedbackUpdateError) {
    logger.error("Failed to update text content analysis results", {
      error: feedbackUpdateError.message,
      code: feedbackUpdateError.code,
      details: feedbackUpdateError.details,
      analyticsId
    });
  } else {
    logger.log("Text content analysis results updated successfully", {
      analyticsId,
      updatedData: feedbackUpdateData
    });
  }
}
