import { NextRequest, NextResponse } from 'next/server';
import { generateEditProposal } from '@/lib/ai/instant-execution-generator';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ScriptGeneratorServerTracking } from '@/lib/posthog/server';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;
  let editRequestLength: number | undefined;

  try {
    const { editRequest, currentContent } = await req.json();
    editRequestLength = editRequest?.length;

    if (!editRequest) {
      await ScriptGeneratorServerTracking.edit({
        status: 400,
        error: 'Edit request is required',
        duration: Date.now() - startTime,
      });
      return NextResponse.json({ error: 'Edit request is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      await ScriptGeneratorServerTracking.edit({
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

    const result = await generateEditProposal(editRequest, currentContent, profile);

    await ScriptGeneratorServerTracking.edit({
      editRequestLength,
      userId,
      status: 200,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating edit proposal:', error);
    await ScriptGeneratorServerTracking.edit({
      editRequestLength,
      userId,
      status: 500,
      error: error instanceof Error ? error.message : 'Failed to generate edit proposal',
      duration: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate edit proposal' },
      { status: 500 }
    );
  }
}
