import { NextRequest, NextResponse } from 'next/server';
import { generateInitialScript } from '@/lib/ai/instant-execution-generator';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ScriptGeneratorServerTracking } from '@/lib/posthog/server';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;
  let platform: string | undefined;
  let promptLength: number | undefined;

  try {
    const body = await req.json();
    const { prompt, platform: platformParam, model } = body;
    platform = platformParam;
    promptLength = prompt?.length;

    if (!prompt) {
      await ScriptGeneratorServerTracking.generateInitial({
        status: 400,
        error: 'Prompt is required',
        duration: Date.now() - startTime,
      });
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      await ScriptGeneratorServerTracking.generateInitial({
        status: 401,
        error: 'Unauthorized',
        duration: Date.now() - startTime,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    userId = user.id;

    const { data: profile } = await supabase
      .from('user_content_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const result = await generateInitialScript(prompt, profile, platform, model as any);

    await ScriptGeneratorServerTracking.generateInitial({
      platform,
      promptLength,
      userId,
      status: 200,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating initial script:', error);
    await ScriptGeneratorServerTracking.generateInitial({
      platform,
      promptLength,
      userId,
      status: 500,
      error: error instanceof Error ? error.message : 'Failed to generate script',
      duration: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate script' },
      { status: 500 }
    );
  }
}
