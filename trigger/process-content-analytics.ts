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
      // Step 1: Fetch content record
      logger.log("Fetching content record", { analyticsId, userId });

      const { data: content, error: contentError } = await supabase
        .from("content_analytics")
        .select("*")
        .eq("id", analyticsId)
        .maybeSingle();

      if (contentError) {
        logger.error("Failed to fetch content record", { 
          error: contentError.message, 
          code: contentError.code,
          details: contentError.details,
          analyticsId,
          userId
        });
        throw new Error(`Content not found: ${contentError} ${content}`);
      }

      if (!content) {
        logger.error("Content record not found", { analyticsId, userId, contentError, content });
        throw new Error("Content not found: " + contentError + " " + content);
      }

      logger.log("Content record fetched successfully", { 
        analyticsId, 
        userId,
        contentType: content.content_type,
        platform: content.platform,
        processingStatus: content.processing_status
      });

      // Step 2: Process based on content type
      if (content.content_type === "video") {
        await processVideoContent(content, userId, analyticsId, supabase);
      } else if (content.content_type === "text") {
        await processTextContent(content, userId, analyticsId, supabase);
      } else {
        throw new Error(`Unknown content type: ${content.content_type}`);
      }

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

  // Step 3: Extract audio
  logger.log("Extracting audio", { analyticsId });

  const audioResult = await extractAudioFromVideo(analyticsId);

  if (!audioResult.success) {
    throw new Error(`Audio extraction failed: ${audioResult.error}`);
  }

  // Update content with audio file path
  logger.log("Updating content with audio file path", { analyticsId, audioFilePath: audioResult.storage_path });
  const { data: audioUpdateData, error: audioUpdateError } = await supabase
    .from("content_analytics")
    .update({ audio_file_path: audioResult.storage_path })
    .eq("id", analyticsId)
    .select();

  if (audioUpdateError) {
    logger.error("Failed to update audio file path", {
      error: audioUpdateError.message,
      code: audioUpdateError.code,
      details: audioUpdateError.details,
      analyticsId,
      audioFilePath: audioResult.storage_path
    });
  } else {
    logger.log("Audio file path updated successfully", {
      analyticsId,
      audioFilePath: audioResult.storage_path,
      updatedData: audioUpdateData
    });
  }

  // Step 4: Transcribe audio
  logger.log("Transcribing audio", { analyticsId });

  const transcriptionResult = await transcribeAudioFile(analyticsId);

  if (!transcriptionResult.success || !transcriptionResult.transcript) {
    throw new Error(`Transcription failed: ${transcriptionResult.error}`);
  }

  // Update content with transcript
  logger.log("Updating content with transcript", { 
    analyticsId, 
    transcriptLength: transcriptionResult.transcript?.length 
  });
  const { data: transcriptUpdateData, error: transcriptUpdateError } = await supabase
    .from("content_analytics")
    .update({ transcript: transcriptionResult.transcript })
    .eq("id", analyticsId)
    .select();

  if (transcriptUpdateError) {
    logger.error("Failed to update transcript", {
      error: transcriptUpdateError.message,
      code: transcriptUpdateError.code,
      details: transcriptUpdateError.details,
      analyticsId
    });
  } else {
    logger.log("Transcript updated successfully", {
      analyticsId,
      transcriptLength: transcriptionResult.transcript?.length,
      updatedData: transcriptUpdateData
    });
  }

  // Step 5: Analyze content
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
