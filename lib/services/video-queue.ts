import { createClient } from '@supabase/supabase-js';
import type { VideoProcessingQueue, ProcessingStep, QueueStatus } from '@/types/video-analytics';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function addToQueue(videoId: string, userId: string, priority: number = 5): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('video_processing_queue')
      .insert({
        video_id: videoId,
        user_id: userId,
        status: 'pending',
        current_step: 'queued',
        progress_percentage: 0,
        priority,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, jobId: data.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getNextPendingJob(): Promise<VideoProcessingQueue | null> {
  try {
    const { data, error } = await supabase
      .from('video_processing_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('retry_count', supabase.rpc('max_retries'))
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching next job:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error in getNextPendingJob:', err);
    return null;
  }
}

export async function updateJobStatus(
  jobId: string,
  status: QueueStatus,
  currentStep: ProcessingStep,
  progressPercentage: number,
  errorMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Record<string, unknown> = {
      status,
      current_step: currentStep,
      progress_percentage: progressPercentage,
    };

    if (status === 'processing' && !await getJobStartedAt(jobId)) {
      updateData.started_at = new Date().toISOString();
    }

    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const { error } = await supabase
      .from('video_processing_queue')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function getJobStartedAt(jobId: string): Promise<string | null> {
  const { data } = await supabase
    .from('video_processing_queue')
    .select('started_at')
    .eq('id', jobId)
    .maybeSingle();

  return data?.started_at || null;
}

export async function updateVideoStatus(
  videoId: string,
  status: string,
  errorMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Record<string, unknown> = {
      processing_status: status,
    };

    if (errorMessage) {
      updateData.processing_error = errorMessage;
    }

    const { error } = await supabase
      .from('video_analytics')
      .update(updateData)
      .eq('id', videoId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function incrementRetryCount(jobId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: currentJob, error: fetchError } = await supabase
      .from('video_processing_queue')
      .select('retry_count')
      .eq('id', jobId)
      .maybeSingle();

    if (fetchError || !currentJob) {
      return { success: false, error: 'Job not found' };
    }

    const { error: updateError } = await supabase
      .from('video_processing_queue')
      .update({
        retry_count: currentJob.retry_count + 1,
        status: 'pending',
      })
      .eq('id', jobId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getJobStatus(jobId: string): Promise<VideoProcessingQueue | null> {
  try {
    const { data, error } = await supabase
      .from('video_processing_queue')
      .select('*')
      .eq('id', jobId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching job status:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error in getJobStatus:', err);
    return null;
  }
}

export async function markJobFailed(jobId: string, errorMessage: string): Promise<void> {
  await updateJobStatus(jobId, 'failed', 'completed', 100, errorMessage);
}

export async function markJobCompleted(jobId: string): Promise<void> {
  await updateJobStatus(jobId, 'completed', 'completed', 100);
}
