import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateVideoUrl, detectPlatformFromUrl } from '@/lib/validations/video-analytics';
import { addToQueue } from '@/lib/services/video-queue';
import { scrapeVideoMetrics, fetchVideoBasicInfo } from '@/lib/services/platform-scrapers';

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
    const { video_url } = body;

    if (!video_url) {
      return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
    }

    const validation = validateVideoUrl(video_url);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const platform = validation.platform!;

    const basicInfo = await fetchVideoBasicInfo(video_url, platform);

    const { data: videoRecord, error: insertError } = await supabase
      .from('video_analytics')
      .insert({
        user_id: user.id,
        video_url,
        platform,
        title: basicInfo.title || '',
        description: basicInfo.description || '',
        processing_status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const { success: queueSuccess, jobId, error: queueError } = await addToQueue(videoRecord.id, user.id);

    if (!queueSuccess || !jobId) {
      return NextResponse.json({ error: queueError || 'Failed to add to queue' }, { status: 500 });
    }

    const metricsResult = await scrapeVideoMetrics(video_url, platform);

    if (metricsResult.success && metricsResult.data) {
      await supabase
        .from('video_analytics')
        .update({
          metrics: metricsResult.data,
          metrics_scraped: true,
          title: metricsResult.data.title || videoRecord.title,
          description: metricsResult.data.description || videoRecord.description,
        })
        .eq('id', videoRecord.id);
    }

    return NextResponse.json({
      video_id: videoRecord.id,
      job_id: jobId,
      message: 'Video added to processing queue',
      requires_manual_metrics: metricsResult.requires_manual_input,
    });
  } catch (err) {
    console.error('Error in video upload:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
