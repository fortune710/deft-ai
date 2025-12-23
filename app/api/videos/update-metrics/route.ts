import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { manualMetricsInputSchema } from '@/lib/validations/video-analytics';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const validation = manualMetricsInputSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors }, { status: 400 });
    }

    const { video_id, metrics, title, description } = validation.data;

    const { data: video, error: fetchError } = await supabase
      .from('video_analytics')
      .select('user_id')
      .eq('id', video_id)
      .maybeSingle();

    if (fetchError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (video.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {
      metrics,
      metrics_scraped: false,
    };

    if (title) updateData.title = title;
    if (description) updateData.description = description;

    const { error: updateError } = await supabase
      .from('video_analytics')
      .update(updateData)
      .eq('id', video_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Metrics updated successfully' });
  } catch (err) {
    console.error('Error updating metrics:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
