import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ContentEngineServerTracking } from '@/lib/posthog/server';
import { generateContentPlanTask } from '@/trigger/generate-content-plan';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;


  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    
    if (authError || !user) {
      await ContentEngineServerTracking.planGenerationFailed({
        error: 'Unauthorized',
        duration: Date.now() - startTime,
        userId,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    userId = user.id;

    const body = await request.json();
    const planName: string | undefined = body.planName;
    const platforms: string[] | undefined = body.platforms;

    if (!planName || !platforms || platforms.length === 0) {
      await ContentEngineServerTracking.planGenerationFailed({
        error: 'Plan name and platforms are required',
        duration: Date.now() - startTime,
        userId,
      });
      return NextResponse.json(
        { error: 'Plan name and platforms are required' },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_content_profile')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      await ContentEngineServerTracking.planGenerationFailed({
        error: 'User profile not found',
        duration: Date.now() - startTime,
        userId,
      });
      return NextResponse.json(
        { error: 'User profile not found. Please complete onboarding.' },
        { status: 404 }
      );
    }

    // Track plan generation start
    await ContentEngineServerTracking.generatePlan({
      planName,
      platforms,
      platformCount: platforms.length,
      userId,
    });

    generateContentPlanTask.trigger({
      userId,
      userContentProfile: profile,
      planName,
      platforms,
    });

    return NextResponse.json({ message: 'Content plan generation started' }, { status: 200 });

    // const encoder = new TextEncoder();
    // const stream = new ReadableStream({
    //   async start(controller) {
    //     const orchestrator = new ContentPlanOrchestrator((progress) => {
    //       const data = JSON.stringify(progress);
    //       controller.enqueue(encoder.encode(`data: ${data}\n\n`));
    //     });

    //     try {
    //       const contentPlan = await orchestrator.execute({
    //         userId: user.id,
    //         planName,
    //         platforms,
    //         niche: profile.question_1_niche || 'content creation',
    //         subNiche: profile.ai_context?.sub_niche,
    //         targetAudience: profile.ai_context?.target_audience || 'general audience',
    //         contentPillars: profile.ai_context?.content_pillars || ['Education', 'Entertainment', 'Inspiration'],
    //         tone: profile.ai_context?.tone_guidance?.formality || 'casual',
    //         goals: profile.question_2_goal ? [profile.question_2_goal] : [],
    //       });

    //       const duration = Date.now() - startTime;

    //       // Track successful plan generation
    //       await ContentEngineServerTracking.planGenerated({
    //         planId: contentPlan?.id,
    //         itemCount: contentPlan?.items?.length,
    //         duration,
    //         userId,
    //       });

    //       const finalData = JSON.stringify({
    //         phase: 'complete',
    //         progress: 100,
    //         message: 'Content plan created successfully',
    //         contentPlan,
    //       });
    //       controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
    //       controller.close();
    //     } catch (error) {
    //       console.error('Error in orchestrator:', error);
    //       const duration = Date.now() - startTime;

    //       // Track failed plan generation
    //       await ContentEngineServerTracking.planGenerationFailed({
    //         error: error instanceof Error ? error.message : 'Failed to generate content plan',
    //         duration,
    //         userId,
    //       });

    //       const errorData = JSON.stringify({
    //         phase: 'error',
    //         progress: 0,
    //         message: error instanceof Error ? error.message : 'Failed to generate content plan',
    //         error: true,
    //       });
    //       controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
    //       controller.close();
    //     }
    //   },
    // });

    // return new Response(stream, {
    //   headers: {
    //     'Content-Type': 'text/event-stream',
    //     'Cache-Control': 'no-cache',
    //     'Connection': 'keep-alive',
    //   },
    // });
  } catch (error) {
    console.error('Error generating content plan:', error);
    await ContentEngineServerTracking.planGenerationFailed({
      error: error instanceof Error ? error.message : 'Internal server error',
      duration: Date.now() - startTime,
      userId,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
