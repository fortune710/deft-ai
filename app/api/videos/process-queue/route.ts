import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getNextPendingJob, updateJobStatus, updateVideoStatus, markJobFailed, markJobCompleted } from '@/lib/services/video-queue';
import { downloadVideo, extractAudioFromVideo } from '@/lib/services/video-processor';
import { transcribeAudioFile } from '@/lib/services/google-speech';
import { generateVideoFeedback } from '@/lib/ai/video-feedback-generator';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const job = await getNextPendingJob();

    if (!job) {
      return NextResponse.json({ message: 'No pending jobs' }, { status: 200 });
    }

    await updateJobStatus(job.id, 'processing', 'download', 10);

    const { data: video, error: videoError } = await supabase
      .from('video_analytics')
      .select('*')
      .eq('id', job.video_id)
      .maybeSingle();

    if (videoError || !video) {
      await markJobFailed(job.id, 'Video not found');
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    await updateVideoStatus(video.id, 'downloading');

    const downloadResult = await downloadVideo(video.video_url, video.id, video.platform);

    if (!downloadResult.success) {
      await markJobFailed(job.id, `Download failed: ${downloadResult.error}`);
      await updateVideoStatus(video.id, 'failed', downloadResult.error);
      return NextResponse.json({ error: downloadResult.error }, { status: 500 });
    }

    await supabase
      .from('video_analytics')
      .update({ video_file_path: downloadResult.storage_path })
      .eq('id', video.id);

    await updateJobStatus(job.id, 'processing', 'extract_audio', 30);
    await updateVideoStatus(video.id, 'extracting_audio');

    const audioResult = await extractAudioFromVideo(video.id, downloadResult.storage_path!);

    if (!audioResult.success) {
      await markJobFailed(job.id, `Audio extraction failed: ${audioResult.error}`);
      await updateVideoStatus(video.id, 'failed', audioResult.error);
      return NextResponse.json({ error: audioResult.error }, { status: 500 });
    }

    await supabase
      .from('video_analytics')
      .update({ audio_file_path: audioResult.storage_path })
      .eq('id', video.id);

    await updateJobStatus(job.id, 'processing', 'transcribe', 50);
    await updateVideoStatus(video.id, 'transcribing');

    const transcriptionResult = await transcribeAudioFile(video.id, audioResult.storage_path!);

    if (!transcriptionResult.success) {
      await markJobFailed(job.id, `Transcription failed: ${transcriptionResult.error}`);
      await updateVideoStatus(video.id, 'failed', transcriptionResult.error);
      return NextResponse.json({ error: transcriptionResult.error }, { status: 500 });
    }

    await supabase
      .from('video_analytics')
      .update({ transcript: transcriptionResult.transcript })
      .eq('id', video.id);

    await updateJobStatus(job.id, 'processing', 'analyze', 75);
    await updateVideoStatus(video.id, 'analyzing');

    const feedbackResult = await generateVideoFeedback(video.id, video.user_id);

    if (!feedbackResult.success) {
      await markJobFailed(job.id, `Feedback generation failed: ${feedbackResult.error}`);
      await updateVideoStatus(video.id, 'failed', feedbackResult.error);
      return NextResponse.json({ error: feedbackResult.error }, { status: 500 });
    }

    await updateJobStatus(job.id, 'completed', 'completed', 100);
    await updateVideoStatus(video.id, 'completed');

    return NextResponse.json({
      message: 'Video processed successfully',
      video_id: video.id,
      job_id: job.id,
    });
  } catch (err) {
    console.error('Error in process queue:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
