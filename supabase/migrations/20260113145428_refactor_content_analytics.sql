/*
  # Content Analytics Refactor Migration

  ## Overview
  Refactors video analytics system to support all content types (video and text) across all platforms.
  Renames tables and adds new columns for content analytics.

  ## Changes
  - Rename `video_analytics` → `content_analytics`
  - Rename `video_processing_queue` → `content_analytics_progress`
  - Remove RLS from `content_analytics_progress` (for Trigger.dev access)
  - Change `error_message` → `message` in `content_analytics_progress`
  - Add new columns: `content_type`, `content_text`, `thumbnail_url`, `analysis_results`
  - Update platform CHECK constraint to include all platforms
  - Migrate existing data
*/

-- Step 1: Add new columns to video_analytics before rename
ALTER TABLE video_analytics
  ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'video' CHECK (content_type IN ('video', 'text')),
  ADD COLUMN IF NOT EXISTS content_text text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS analysis_results jsonb;

-- Step 2: Update platform constraint to include all platforms
ALTER TABLE video_analytics
  DROP CONSTRAINT IF EXISTS video_analytics_platform_check;

ALTER TABLE video_analytics
  ADD CONSTRAINT video_analytics_platform_check 
  CHECK (platform IN ('youtube', 'instagram', 'tiktok', 'twitter', 'linkedin', 'facebook'));

-- Step 3: Migrate ai_feedback to analysis_results for existing records
UPDATE video_analytics
SET analysis_results = ai_feedback
WHERE ai_feedback IS NOT NULL AND analysis_results IS NULL;

-- Step 4: Rename video_analytics to content_analytics
ALTER TABLE video_analytics RENAME TO content_analytics;

-- Step 5: Rename indexes for content_analytics
ALTER INDEX IF EXISTS idx_video_analytics_user_id RENAME TO idx_content_analytics_user_id;
ALTER INDEX IF EXISTS idx_video_analytics_platform RENAME TO idx_content_analytics_platform;
ALTER INDEX IF EXISTS idx_video_analytics_processing_status RENAME TO idx_content_analytics_processing_status;
ALTER INDEX IF EXISTS idx_video_analytics_created_at RENAME TO idx_content_analytics_created_at;
ALTER INDEX IF EXISTS idx_video_analytics_expires_at RENAME TO idx_content_analytics_expires_at;

-- Step 6: Update RLS policies for content_analytics (rename policies)
DROP POLICY IF EXISTS "Users can view own video analytics" ON content_analytics;
DROP POLICY IF EXISTS "Users can create own video analytics" ON content_analytics;
DROP POLICY IF EXISTS "Users can update own video analytics" ON content_analytics;
DROP POLICY IF EXISTS "Users can delete own video analytics" ON content_analytics;

CREATE POLICY "Users can view own content analytics"
  ON content_analytics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own content analytics"
  ON content_analytics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own content analytics"
  ON content_analytics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own content analytics"
  ON content_analytics FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 7: Add new column to video_processing_queue before rename
ALTER TABLE video_processing_queue
  ADD COLUMN IF NOT EXISTS analytics_id uuid REFERENCES content_analytics(id) ON DELETE CASCADE;

-- Step 8: Migrate video_id to analytics_id
UPDATE video_processing_queue
SET analytics_id = video_id
WHERE analytics_id IS NULL;

-- Step 9: Rename error_message to message
ALTER TABLE video_processing_queue
  RENAME COLUMN error_message TO message;

-- Step 10: Rename video_processing_queue to content_analytics_progress
ALTER TABLE video_processing_queue RENAME TO content_analytics_progress;

-- Step 11: Handle video_id to analytics_id rename (check if analytics_id already exists)
DO $$
BEGIN
  -- Check if analytics_id column already exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'content_analytics_progress' 
    AND column_name = 'analytics_id'
  ) THEN
    -- analytics_id already exists, just migrate any remaining data and drop video_id if it exists
    UPDATE content_analytics_progress
    SET analytics_id = video_id
    WHERE analytics_id IS NULL AND video_id IS NOT NULL;
    
    -- Drop video_id column if it still exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'content_analytics_progress' 
      AND column_name = 'video_id'
    ) THEN
      ALTER TABLE content_analytics_progress DROP COLUMN video_id;
    END IF;
  ELSE
    -- analytics_id doesn't exist, rename video_id to analytics_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'content_analytics_progress' 
      AND column_name = 'video_id'
    ) THEN
      ALTER TABLE content_analytics_progress
        RENAME COLUMN video_id TO analytics_id;
    END IF;
  END IF;
END $$;

-- Step 12: Make analytics_id NOT NULL (after migration)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'content_analytics_progress' 
    AND column_name = 'analytics_id'
  ) THEN
    ALTER TABLE content_analytics_progress
      ALTER COLUMN analytics_id SET NOT NULL;
  END IF;
END $$;

-- Step 13: Drop old video_id column if it still exists (shouldn't, but just in case)
-- This is handled by the rename above, but keeping for safety

-- Step 14: Rename indexes for content_analytics_progress
ALTER INDEX IF EXISTS idx_video_processing_queue_video_id RENAME TO idx_content_analytics_progress_analytics_id;
ALTER INDEX IF EXISTS idx_video_processing_queue_user_id RENAME TO idx_content_analytics_progress_user_id;
ALTER INDEX IF EXISTS idx_video_processing_queue_status RENAME TO idx_content_analytics_progress_status;
ALTER INDEX IF EXISTS idx_video_processing_queue_created_at RENAME TO idx_content_analytics_progress_created_at;
ALTER INDEX IF EXISTS idx_video_processing_queue_priority_status RENAME TO idx_content_analytics_progress_priority_status;

-- Step 15: Remove RLS from content_analytics_progress (for Trigger.dev access)
ALTER TABLE content_analytics_progress DISABLE ROW LEVEL SECURITY;

-- Step 16: Drop old RLS policies for content_analytics_progress (no longer needed)
DROP POLICY IF EXISTS "Users can view own processing queue jobs" ON content_analytics_progress;
DROP POLICY IF EXISTS "Users can create own processing queue jobs" ON content_analytics_progress;
DROP POLICY IF EXISTS "Users can update own processing queue jobs" ON content_analytics_progress;
DROP POLICY IF EXISTS "Users can delete own processing queue jobs" ON content_analytics_progress;

-- Step 17: Update foreign key constraint name (if it exists with old name)
-- The foreign key should automatically update, but we'll ensure it's correct
DO $$
BEGIN
  -- Drop old foreign key if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'video_processing_queue_video_id_fkey'
  ) THEN
    ALTER TABLE content_analytics_progress
      DROP CONSTRAINT video_processing_queue_video_id_fkey;
  END IF;
END $$;

-- Ensure foreign key exists with correct name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'content_analytics_progress_analytics_id_fkey'
  ) THEN
    ALTER TABLE content_analytics_progress
      ADD CONSTRAINT content_analytics_progress_analytics_id_fkey
      FOREIGN KEY (analytics_id) REFERENCES content_analytics(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 18: Update current_step CHECK constraint to include text analysis steps
ALTER TABLE content_analytics_progress
  DROP CONSTRAINT IF EXISTS video_processing_queue_current_step_check;

ALTER TABLE content_analytics_progress
  DROP CONSTRAINT IF EXISTS content_analytics_progress_current_step_check;

ALTER TABLE content_analytics_progress
  ADD CONSTRAINT content_analytics_progress_current_step_check
  CHECK (current_step IN ('queued', 'download', 'extract_audio', 'transcribe', 'analyze', 'extract_thumbnail', 'completed'));

-- Step 19: Create index on content_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_content_analytics_content_type ON content_analytics(content_type);

-- Step 20: Create index on thumbnail_url for faster lookups
CREATE INDEX IF NOT EXISTS idx_content_analytics_thumbnail_url ON content_analytics(thumbnail_url) WHERE thumbnail_url IS NOT NULL;

-- Step 21: Drop old video_feedback_history table (no longer needed)
DROP TABLE IF EXISTS video_feedback_history CASCADE;

-- Step 22: Drop old indexes for video_feedback_history if they still exist
DROP INDEX IF EXISTS idx_video_feedback_history_user_id;
DROP INDEX IF EXISTS idx_video_feedback_history_video_id;
DROP INDEX IF EXISTS idx_video_feedback_history_feedback_generated_at;

-- Step 23: Ensure video_id column is dropped from content_analytics_progress (final cleanup)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'content_analytics_progress' 
    AND column_name = 'video_id'
  ) THEN
    ALTER TABLE content_analytics_progress DROP COLUMN video_id CASCADE;
  END IF;
END $$;

-- Step 21: Drop old video_feedback_history table (no longer needed)
DROP TABLE IF EXISTS video_feedback_history;

-- Step 22: Drop old indexes if they still exist with old names
DROP INDEX IF EXISTS idx_video_feedback_history_user_id;
DROP INDEX IF EXISTS idx_video_feedback_history_video_id;
DROP INDEX IF EXISTS idx_video_feedback_history_feedback_generated_at;
