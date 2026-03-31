import { task } from "@trigger.dev/sdk/v3";
import { ContentPlanOrchestrator } from "@/lib/ai/orchestrator/content-plan-orchestrator";
import { Platform } from "@/types/content-engine";
import { logger } from "@/lib/logger";

export interface GenerateContentPlanPayload {
  userId: string;
  platforms: string[];
}

export const generateContentPlanTask = task({
  id: "generate-content-plan",
  run: async (payload: GenerateContentPlanPayload) => {
    const { userId, platforms } = payload;

    const orchestrator = new ContentPlanOrchestrator();

    try {
      // 2. Start Orchestration with thirdPartyRuntime set to true
      const result = await orchestrator.execute({
        userId,
        platforms: platforms as Platform[],
        thirdPartyRuntime: true // This routes logs to trigger.logger
      });

      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      logger.error("Error in generateContentPlanTask:", error);
      throw error;
    }
  },
});
