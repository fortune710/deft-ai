import { createClient } from '@supabase/supabase-js';
import type { ContentAnalyticsProgress, ProcessingStep, QueueStatus } from '@/types/content-analytics';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is not set');
  }
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set. Please add it to your .env file.');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

const supabase = getSupabaseClient();

export async function createProgress(
  analyticsId: string,
  userId: string,
  progress: number,
  stage: string,
  message: string | null = null
): Promise<ContentAnalyticsProgress> {
  const { data, error } = await supabase
    .from('content_analytics_progress')
    .insert({
      analytics_id: analyticsId,
      user_id: userId,
      status: 'processing',
      current_step: stage as ProcessingStep,
      progress_percentage: progress,
      message,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create progress: ${error.message}`);
  }

  return data;
}

export async function upsertProgress(
  analyticsId: string,
  userId: string,
  progress: number,
  stage: string,
  message: string | null = null
): Promise<ContentAnalyticsProgress> {
  const { data, error } = await supabase
    .from('content_analytics_progress')
    .upsert(
      {
        analytics_id: analyticsId,
        user_id: userId,
        status: 'processing',
        current_step: stage as ProcessingStep,
        progress_percentage: progress,
        message,
      },
      {
        onConflict: 'analytics_id',
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert progress: ${error.message}`);
  }

  return data;
}

export async function updateProgress(
  analyticsId: string,
  updates: {
    progress?: number;
    stage?: string;
    message?: string | null;
    status?: QueueStatus;
  }
): Promise<ContentAnalyticsProgress> {
  const updateData: Record<string, unknown> = {};

  if (updates.progress !== undefined) {
    updateData.progress_percentage = updates.progress;
  }
  if (updates.stage !== undefined) {
    updateData.current_step = updates.stage;
  }
  if (updates.message !== undefined) {
    updateData.message = updates.message;
  }
  if (updates.status !== undefined) {
    updateData.status = updates.status;
  }

  const { data, error } = await supabase
    .from('content_analytics_progress')
    .update(updateData)
    .eq('analytics_id', analyticsId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update progress: ${error.message}`);
  }

  return data;
}

export async function deleteProgress(analyticsId: string): Promise<void> {
  const { error } = await supabase
    .from('content_analytics_progress')
    .delete()
    .eq('analytics_id', analyticsId);

  if (error) {
    throw new Error(`Failed to delete progress: ${error.message}`);
  }
}

export async function getProgress(analyticsId: string): Promise<ContentAnalyticsProgress | null> {
  const { data, error } = await supabase
    .from('content_analytics_progress')
    .select('*')
    .eq('analytics_id', analyticsId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to read progress: ${error.message}`);
  }

  return data;
}

export async function getProgressByUserId(userId: string): Promise<ContentAnalyticsProgress | null> {
  const { data, error } = await supabase
    .from('content_analytics_progress')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to read progress: ${error.message}`);
  }

  return data;
}
