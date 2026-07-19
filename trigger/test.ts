import { task, logger } from '@trigger.dev/sdk/v3';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

interface TestTaskPayload {
  userId: string;
}

export const testUserTokenTask = task({
  id: 'test-user-token',
  run: async ({ userId }: TestTaskPayload) => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    const workerSecret = process.env.TRIGGER_CONVEX_SECRET;
    if (!convexUrl || !workerSecret) throw new Error('Convex Trigger worker configuration is missing');

    const convex = new ConvexHttpClient(convexUrl);
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 1);
    const [itemId] = await convex.mutation(api.triggerWorkers.createContentItems, {
      workerSecret,
      userId,
      items: [{
        title: 'Test Content Item',
        description: 'This is a test content item created by the test task',
        platform: 'youtube',
        scheduled_date: scheduledDate.toISOString().split('T')[0],
        status: 'idea',
        content: {
          script_content: 'This is a test script for the content item.',
          hook_suggestion: 'Hook: Start with a question that grabs attention',
          cta_suggestion: 'Call to action: Subscribe for more content',
          hashtags: ['#test', '#content', '#youtube'],
        },
        position: 0,
      }],
    });

    logger.info('Created test content item in Convex', {
      userId,
      action: 'create_test_content_item',
      itemId,
    });
    return { success: true, userId, contentItem: { id: itemId, title: 'Test Content Item', platform: 'youtube' } };
  },
});
