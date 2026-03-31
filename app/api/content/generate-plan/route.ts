import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateContentPlanTask } from '@/trigger/generate-content-plan';
import { TABLES } from '@/lib/supabase/constants';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 300;

const log = logger.child({ module: 'generate-plan-route' });

export async function POST(request: NextRequest) {
  let userId: string | undefined;

  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      log.error(`Unauthorized for user ${userId}`, {
        userId,
        statusCode: authError?.status || 401,
        error: authError?.message || 'Unauthorized',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    userId = user.id;

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

    const { data: profile, error: profileError } = await supabase
      .from(TABLES.USER_CONTENT_PROFILE)
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      log.error(`Failed to fetch user profile for user ${userId}`, {
        userId,
        errorCode: profileError.code,
        error: profileError.message,
      });

      return NextResponse.json(
        { error: `Failed to fetch user profile for user ${userId}`, data: null, success: false },
        { status: 500 }
      );
    }

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

    // Track generation start
    log.info(`Starting content generation for user ${userId}`, {
      userId,
      platforms,
    });

    generateContentPlanTask.trigger({
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
