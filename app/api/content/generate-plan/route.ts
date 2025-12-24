import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ContentPlanOrchestrator } from '@/lib/ai/orchestrator/content-plan-orchestrator';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { planName, platforms } = body;

    if (!planName || !platforms || platforms.length === 0) {
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
      return NextResponse.json(
        { error: 'User profile not found. Please complete onboarding.' },
        { status: 404 }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const orchestrator = new ContentPlanOrchestrator((progress) => {
          const data = JSON.stringify(progress);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        });

        try {
          const contentPlan = await orchestrator.execute({
            userId: user.id,
            planName,
            platforms,
            niche: profile.question_1_niche || 'content creation',
            subNiche: profile.ai_context?.sub_niche,
            targetAudience: profile.ai_context?.target_audience || 'general audience',
            contentPillars: profile.ai_context?.content_pillars || ['Education', 'Entertainment', 'Inspiration'],
            tone: profile.ai_context?.tone_guidance?.formality || 'casual',
            goals: profile.question_2_goal ? [profile.question_2_goal] : [],
          });

          const finalData = JSON.stringify({
            phase: 'complete',
            progress: 100,
            message: 'Content plan created successfully',
            contentPlan,
          });
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
          controller.close();
        } catch (error) {
          console.error('Error in orchestrator:', error);
          const errorData = JSON.stringify({
            phase: 'error',
            progress: 0,
            message: error instanceof Error ? error.message : 'Failed to generate content plan',
            error: true,
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error generating content plan:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
