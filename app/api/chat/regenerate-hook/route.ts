import { NextRequest, NextResponse } from 'next/server';
import { regenerateHook } from '@/lib/ai/instant-execution-generator';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { hookIndex, currentHooks, guidance } = await req.json();

    if (hookIndex === undefined || !currentHooks) {
      return NextResponse.json({ error: 'Hook index and current hooks are required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_content_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const result = await regenerateHook(hookIndex, currentHooks, guidance || '', profile);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error regenerating hook:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate hook' },
      { status: 500 }
    );
  }
}
