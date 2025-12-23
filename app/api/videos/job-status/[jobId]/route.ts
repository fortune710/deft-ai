import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getJobStatus } from '@/lib/services/video-queue';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = params;

    const job = await getJobStatus(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { data: videoData } = await supabase
      .from('video_analytics')
      .select('*')
      .eq('id', job.video_id)
      .maybeSingle();

    return NextResponse.json({
      job_id: job.id,
      video_id: job.video_id,
      status: job.status,
      current_step: job.current_step,
      progress_percentage: job.progress_percentage,
      error_message: job.error_message,
      video_data: videoData,
    });
  } catch (err) {
    console.error('Error fetching job status:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
