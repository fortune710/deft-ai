import { ContentPlanOrchestrator } from "@/lib/ai/orchestrator/content-plan-orchestrator";
import { UserContentProfile } from "@/types/user-content-profile";
import { logger, task, wait } from "@trigger.dev/sdk/v3";
import {
  createProgress,
  deleteProgress,
  upsertProgress,
} from "@/lib/api/content-engine-progress";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

//const MAX_DURATION_SECONDS = 10 * 60; // 10 minutes

interface GenerateContentPlanPayload {
  userId: string;
  userContentProfile: UserContentProfile;
  planName: string;
  platforms: string[];
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

//Create Supabase client
function createSupabaseClient(userId: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    //let token = getToken(userId);
    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        }
    });


}

export const generateContentPlanTask = task({
  id: "generate-content-plan",
  run: async (payload: GenerateContentPlanPayload, { ctx }) => {
    const { userId, userContentProfile, planName, platforms } = payload;

    const supabase = createSupabaseClient(userId);
    
    // Store userId in context for onFailure callback
    (ctx as any).userId = userId;
    (ctx as any).supabase = supabase;


    try {
      // Initialize progress
      await createProgress(
        supabase,
        userId,
        0,
        "initialization",
        "Starting content plan generation"
      );

      logger.log("Content plan generation started", { userId });

      const orchestrator = new ContentPlanOrchestrator((progress) => {
        logger.log("Content plan progress", { progress });

        // Update progress in database (non-blocking)
        upsertProgress(
          supabase,
          userId,
          progress.progress,
          progress.phase || "processing",
          progress.message || "Generating content plan"
        )
          .catch((error) => {
            logger.error("Failed to update progress", { error });
            // Continue execution even if progress update fails
          });
      });

      // Execute the orchestrator
      const contentPlan = await orchestrator.execute({
        userId,
        planName,
        platforms,
        niche: userContentProfile.question_1_niche || "content creation",
        targetAudience: "general audience",
        contentPillars:
          userContentProfile.ai_context?.content_pillars || [
            "Education",
            "Entertainment",
            "Inspiration",
          ],
        tone:
          userContentProfile.ai_context?.tone_guidance?.formality || "casual",
        goals: userContentProfile.question_2_goal
          ? [userContentProfile.question_2_goal]
          : [],
      });

      // Update final progress
      await deleteProgress(supabase, userId);

      logger.log("Content plan generation completed", {
        planId: contentPlan.planId,
      });

      return {
        success: true,
        planId: contentPlan.planId,
        userId,
        message: "Content plan created successfully",
      };
    } catch (error) {
      logger.error("Content plan generation failed", { error, userId });

      // Update progress with error
      try {
        await deleteProgress(supabase, userId);
      } catch (progressError) {
        logger.error("Failed to update error progress", { progressError });
      }

      throw error;
    }
  },
  onCancel: async (...args: any[]) => {
    // Extract payload from args - Trigger.dev v3 passes it differently
    const payload = args[0] as GenerateContentPlanPayload | undefined;
    const ctx = args[1] as any;
    
    // Access userId from payload or context to clean up progress on cancel
    const userId = payload?.userId || ctx?.userId;
    
    if (!userId) {
      logger.error("Task cancelled but no userId available for cleanup");
      return;
    }
    
    logger.log("Task cancelled - cleaning up progress", { userId });

    try {
      // Use stored supabase client from context, or create a new one
      const supabase = ctx?.supabase || createSupabaseClient(userId);
      await deleteProgress(supabase, userId);
      logger.log("Progress cleaned up successfully after cancellation", { userId });
    } catch (cleanupError) {
      logger.error("Failed to clean up progress on cancel", { 
        cleanupError,
        userId 
      });
    }
  },
  onFailure: async ({ payload, error, ctx }) => {
    
    // Access userId from payload or context to clean up progress on failure
    const userId = payload?.userId;
    
    if (!userId) {
      logger.error("Task failed but no userId available for cleanup", { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      return;
    }
    
    logger.error("Task failed - cleaning up progress", { 
      error: error instanceof Error ? error.message : 'Unknown error', 
      userId 
    });

    try {
      // Use stored supabase client from context, or create a new one
      const supabase = (ctx as any)?.supabase || createSupabaseClient(userId);
      await deleteProgress(supabase, userId);
      logger.log("Progress cleaned up successfully", { userId });
    } catch (cleanupError) {
      logger.error("Failed to clean up progress on failure", { 
        cleanupError,
        userId 
      });
    }
  },
});