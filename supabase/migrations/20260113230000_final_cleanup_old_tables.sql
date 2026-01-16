/*
  # Final Cleanup Old Tables and Columns

  ## Overview
  Final cleanup to remove old tables and columns that are no longer needed after the content analytics refactor.

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

-- Step 4: Drop any old RLS policies that might still reference old table names (only if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'video_feedback_history'
  ) THEN
    DROP POLICY IF EXISTS "Users can view own feedback history" ON video_feedback_history;
    DROP POLICY IF EXISTS "Users can create own feedback history" ON video_feedback_history;
    DROP POLICY IF EXISTS "Users can update own feedback history" ON video_feedback_history;
    DROP POLICY IF EXISTS "Users can delete own feedback history" ON video_feedback_history;
  END IF;
END $$;

-- Step 5: Drop old table names if they still exist (shouldn't, but safety check)
-- Note: These should already be renamed, but if migration failed partway, they might still exist
DROP TABLE IF EXISTS video_analytics CASCADE;
DROP TABLE IF EXISTS video_processing_queue CASCADE;
