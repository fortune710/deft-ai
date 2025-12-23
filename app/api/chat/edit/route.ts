import { NextRequest, NextResponse } from 'next/server';
import { generateEditProposal } from '@/lib/ai/instant-execution-generator';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { editRequest, currentContent } = await req.json();

    if (!editRequest) {
      return NextResponse.json({ error: 'Edit request is required' }, { status: 400 });
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

    const result = await generateEditProposal(editRequest, currentContent, profile);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating edit proposal:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate edit proposal' },
      { status: 500 }
    );
  }
}
