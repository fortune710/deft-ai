import { logger, task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
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
