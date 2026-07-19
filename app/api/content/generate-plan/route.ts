import { NextRequest, NextResponse } from 'next/server';
import { generateContentPlanTask } from '@/trigger/generate-content-plan';
import { logger } from '@/lib/logger.server';
import { auth } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';

export const runtime = 'nodejs';
export const maxDuration = 300;

const log = logger.child({ module: 'generate-plan-route' });

export async function POST(request: NextRequest) {
  let userId: string | undefined;

  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      log.error(`Unauthorized for user ${userId}`, {
        userId: 'signed_out',
        action: 'generate_content_plan',
        statusCode: 401,
        error: 'Unauthorized',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    userId = clerkUserId;

    const body = await request.json();
    const platforms: string[] | undefined = body.platforms;

    if (!platforms || platforms.length === 0) {
      log.error(`Platforms are required for user ${userId}`, {
        userId,
        error: 'No platforms provided',
      });
      return NextResponse.json(
        { error: 'Platforms are required' },
        { status: 400 }
      );
    }

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) throw new Error('NEXT_PUBLIC_CONVEX_URL is not configured');
    const convex = new ConvexHttpClient(convexUrl);
    const workerSecret = process.env.TRIGGER_CONVEX_SECRET;
    if (!workerSecret) throw new Error('TRIGGER_CONVEX_SECRET is not configured');
    const profile = await convex.query(api.triggerWorkers.getProfile, { workerSecret, userId });

    if (!profile) {
      const errorMessage = 'User profile not found. Please complete onboarding.';
      log.error(errorMessage, {
        userId,
        error: errorMessage,
      });

      return NextResponse.json(
        { error: 'User profile not found. Please complete onboarding.' },
        { status: 404 }
      );
    }

    await convex.mutation(api.triggerWorkers.upsertContentEngineProgress, {
      workerSecret,
      userId,
      progress: 0,
      stage: 'queued',
      message: 'Queued for content generation',
    });

    // Track generation start
    log.info(`Starting content generation for user ${userId}`, {
      userId,
      platforms,
    });

    await generateContentPlanTask.trigger({
      userId,
      platforms,
    });

    return NextResponse.json({
      message: 'Content generation started',
      data: null,
      success: true
    }, { status: 200 });
  } catch (error) {
    log.error(`Failed to generate content for user ${userId}`, {
      userId,
      error: error instanceof Error ? error.message : 'Internal server error',
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
