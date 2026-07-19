import { task } from "@trigger.dev/sdk/v3";
import { ContentPlanOrchestrator } from "@/lib/ai/orchestrator/content-plan-orchestrator";
import { Platform } from "@/types/content-engine";
import { logger } from "@/lib/logger.server";
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

const log = logger.child({ module: 'trigger/generate-content-plan' });

export interface GenerateContentPlanPayload {
  userId: string;
  platforms: string[];
}

export const generateContentPlanTask = task({
  id: "generate-content-plan",
  run: async (payload: GenerateContentPlanPayload) => {
    const { userId, platforms } = payload;
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    const workerSecret = process.env.TRIGGER_CONVEX_SECRET;
    const orchestrator = new ContentPlanOrchestrator();

    try {
      if (!convexUrl || !workerSecret) {
        throw new Error('Convex Trigger worker configuration is missing');
      }
      const convex = new ConvexHttpClient(convexUrl);
      await convex.mutation(api.triggerWorkers.upsertContentEngineProgress, {
        workerSecret,
        userId,
        progress: 5,
        stage: 'started',
        message: 'Starting content generation',
      });

      // 2. Start Orchestration with thirdPartyRuntime set to true
      const result = await orchestrator.execute({
        userId,
        platforms: platforms as Platform[],
        thirdPartyRuntime: true, // This routes logs to trigger.logger
        onProgress: async (progress, stage, message) => {
          log.debug('Updating Convex content plan progress', {
            userId,
            action: 'update_content_plan_progress',
            progress,
            stage,
          }, true);
          await convex.mutation(api.triggerWorkers.upsertContentEngineProgress, {
            workerSecret,
            userId,
            progress,
            stage,
            message,
          });
        },
      });

      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      if (convexUrl && workerSecret) {
        const convex = new ConvexHttpClient(convexUrl);
        await convex.mutation(api.triggerWorkers.upsertContentEngineProgress, {
          workerSecret,
          userId,
          progress: 100,
          stage: 'failed',
          message: error instanceof Error ? error.message : 'Content generation failed',
        }).catch(() => null);
      }
      log.error('Content plan generation task failed', {
        userId,
        action: 'generate_content_plan',
        error,
        message: error instanceof Error ? error.message : String(error),
      }, true);
      throw error;
    }
  },
});
