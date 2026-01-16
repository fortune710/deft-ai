/*
  # Cleanup Old Tables and Columns

  ## Overview
  Removes old tables and columns that are no longer needed after the content analytics refactor.

  ## Changes
  - Drop `video_feedback_history` table
  - Ensure `video_id` column is removed from `content_analytics_progress`
  - Drop old indexes related to removed tables
  - Clean up any remaining old table references
*/

-- Step 1: Drop old video_feedback_history table (no longer needed)
DROP TABLE IF EXISTS video_feedback_history CASCADE;

-- Step 2: Drop old indexes for video_feedback_history if they still exist
DROP INDEX IF EXISTS idx_video_feedback_history_user_id;
DROP INDEX IF EXISTS idx_video_feedback_history_video_id;
DROP INDEX IF EXISTS idx_video_feedback_history_feedback_generated_at;

-- Step 3: Ensure video_id column is dropped from content_analytics_progress (final cleanup)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'content_analytics_progress' 
    AND column_name = 'video_id'
  ) THEN
    ALTER TABLE content_analytics_progress DROP COLUMN video_id CASCADE;
  END IF;
END $$;

-- Step 4: Drop any old RLS policies that might still reference old table names
DROP POLICY IF EXISTS "Users can view own feedback history" ON video_feedback_history;
DROP POLICY IF EXISTS "Users can create own feedback history" ON video_feedback_history;
DROP POLICY IF EXISTS "Users can update own feedback history" ON video_feedback_history;
DROP POLICY IF EXISTS "Users can delete own feedback history" ON video_feedback_history;

-- Step 5: Drop old table names if they still exist (shouldn't, but safety check)
DROP TABLE IF EXISTS video_analytics CASCADE;
DROP TABLE IF EXISTS video_processing_queue CASCADE;
