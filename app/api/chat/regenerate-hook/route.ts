import { NextRequest, NextResponse } from 'next/server';
import { regenerateHook } from '@/lib/ai/instant-execution-generator';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ScriptGeneratorServerTracking } from '@/lib/posthog/server';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;

  try {
    const { hookIndex, currentHooks, guidance } = await req.json();

    if (hookIndex === undefined || !currentHooks) {
      await ScriptGeneratorServerTracking.regenerateHook({
        status: 400,
        error: 'Hook index and current hooks are required',
        duration: Date.now() - startTime,
      });
      return NextResponse.json({ error: 'Hook index and current hooks are required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      await ScriptGeneratorServerTracking.regenerateHook({
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

    const result = await regenerateHook(hookIndex, currentHooks, guidance || '', profile);

    await ScriptGeneratorServerTracking.regenerateHook({
      userId,
      status: 200,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error regenerating hook:', error);
    await ScriptGeneratorServerTracking.regenerateHook({
      userId,
      status: 500,
      error: error instanceof Error ? error.message : 'Failed to regenerate hook',
      duration: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate hook' },
      { status: 500 }
    );
  }
}
