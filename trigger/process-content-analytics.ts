import { logger, task } from '@trigger.dev/sdk/v3';
import { ConvexHttpClient } from 'convex/browser';
import type { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { runContentAnalysisOrchestrator } from '@/lib/ai/orchestrator/content-analysis-orchestrator';

interface ProcessContentAnalyticsPayload {
  userId: string;
  analyticsId: string;
}

export const processContentAnalyticsTask = task({
  id: 'process-content-analytics',
  run: async (payload: ProcessContentAnalyticsPayload) => {
    const { userId } = payload;
    const analyticsId = payload.analyticsId as Id<'content_analytics'>;
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    const workerSecret = process.env.TRIGGER_CONVEX_SECRET;

    if (!convexUrl || !workerSecret) {
      throw new Error('Convex Trigger worker configuration is missing');
    }
    const convex = new ConvexHttpClient(convexUrl);

    try {
      await convex.mutation(api.triggerWorkers.upsertProgress, {
        workerSecret,
        analyticsId,
        userId,
        progress: 0,
        stage: 'queued',
        message: 'Queued for content analysis',
      });

      await runContentAnalysisOrchestrator({
        convex,
        workerSecret,
        analyticsId,
        userId,
        logger,
        onProgress: async (event) => {
          const message = event.details ? `${event.message} - ${event.details}` : event.message;
          await convex.mutation(api.triggerWorkers.upsertProgress, {
            workerSecret,
            analyticsId,
            userId,
            progress: event.progress,
            stage: event.step,
            message,
          });
        },
      });

      await convex.mutation(api.triggerWorkers.updateContentAnalytics, {
        workerSecret,
        analyticsId,
        userId,
        updates: { processing_status: 'completed', processing_error: null },
      });
      await convex.mutation(api.triggerWorkers.updateProgress, {
        workerSecret,
        analyticsId,
        userId,
        progress: 100,
        stage: 'completed',
        status: 'completed',
        message: 'Content analysis completed',
      });

      logger.info('Content analytics processing completed', {
        userId,
        action: 'process_content_analytics',
        analyticsId,
      });
      return { success: true, analyticsId, userId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Content analytics processing failed', {
        userId,
        action: 'process_content_analytics',
        analyticsId,
        error,
        message,
      });
      await convex.mutation(api.triggerWorkers.updateContentAnalytics, {
        workerSecret,
        analyticsId,
        userId,
        updates: { processing_status: 'failed', processing_error: message },
      }).catch(() => null);
      await convex.mutation(api.triggerWorkers.updateProgress, {
        workerSecret,
        analyticsId,
        userId,
        status: 'failed',
        message,
      }).catch(() => null);
      throw error;
    }
  },
});
