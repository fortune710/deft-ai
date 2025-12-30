import { SupabaseClient } from "@supabase/supabase-js";


/**
 * Content Engine Progress record
 */
export interface ContentEngineProgress {
  id: string;
  user_id: string;
  progress: number;
  stage: string;
  message: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Create a new progress record
 */
export async function createProgress(
  supabase: SupabaseClient,
  userId: string,
  progress: number,
  stage: string,
  message: string | null = null
): Promise<ContentEngineProgress> {
  const { data, error } = await supabase
    .from('content_engine_progress')
    .upsert(
      {
        user_id: userId,
        progress,
        stage,
        message,
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create progress: ${error.message}`);
  }

  return data;
}

/**
 * Read a progress record by ID
 */
export async function readProgress(supabase: SupabaseClient, progressId: string): Promise<ContentEngineProgress | null> {
  const { data, error } = await supabase
    .from('content_engine_progress')
    .select('*')
    .eq('id', progressId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to read progress: ${error.message}`);
  }

  return data;
}

/**
 * Read the latest progress record for a user
 */
export async function readLatestProgress(supabase: SupabaseClient, userId: string): Promise<ContentEngineProgress | null> {
  const { data, error } = await supabase
    .from('content_engine_progress')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to read latest progress: ${error.message}`);
  }

  return data;
}

/**
 * Read all progress records for a user
 */
export async function readAllProgress(supabase: SupabaseClient, userId: string): Promise<ContentEngineProgress[]> {
  const { data, error } = await supabase
    .from('content_engine_progress')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to read progress records: ${error.message}`);
  }

  return data || [];
}

/**
 * Update a progress record by user_id
 */
export async function updateProgress(
  supabase: SupabaseClient,
  userId: string,
  updates: {
    progress?: number;
    stage?: string;
    message?: string | null;
  }
): Promise<ContentEngineProgress> {
  const { data, error } = await supabase
    .from('content_engine_progress')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update progress: ${error.message}`);
  }

  return data;
}

/**
 * Update or create progress for a user (upsert by user_id)
 * This is useful for ensuring only one active progress record per user
 * Uses onConflict to handle the upsert operation efficiently
 */
export async function upsertProgress(
  supabase: SupabaseClient,
  userId: string,
  progress: number,
  stage: string,
  message: string | null = null
): Promise<ContentEngineProgress> {
  const { data, error } = await supabase
    .from('content_engine_progress')
    .upsert(
      {
        user_id: userId,
        progress,
        stage,
        message,
      },
      {
        onConflict: 'user_id',
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert progress: ${error.message}`);
  }

  return data;
}

/**
 * Delete a progress record by user_id
 */
export async function deleteProgress(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase
    .from('content_engine_progress')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete progress: ${error.message}`);
  }
}

/**
 * Delete all progress records for a user
 */
export async function deleteAllProgress(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase
    .from('content_engine_progress')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete progress records: ${error.message}`);
  }
}

