/*
  # Video Analytics System

  ## Overview
  Creates tables for the video analytics feature that allows users to upload videos,
  process them (download, transcribe, analyze), and receive AI-generated feedback.

  ## New Tables
  
  ### `video_analytics`
  Main table storing video analytics data including metrics, transcripts, and AI feedback.
  - `id` (uuid, primary key) - Unique video identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `video_url` (text) - Original video URL from platform
  - `platform` (text) - Platform type: 'youtube', 'instagram', or 'tiktok'
  - `title` (text) - Video title
  - `description` (text) - Video description
  - `transcript` (text) - Full video transcript
  - `metrics` (jsonb) - Video metrics (views, likes, comments, shares, engagement_rate, etc.)
  - `metrics_scraped` (boolean) - Whether metrics were successfully scraped
  - `ai_feedback` (jsonb) - AI-generated feedback including hook analysis, content quality, retention tips
  - `video_file_path` (text, nullable) - Path to downloaded video file
  - `audio_file_path` (text, nullable) - Path to extracted audio file
  - `processing_status` (text) - Current processing status
  - `processing_error` (text, nullable) - Error message if processing failed
  - `created_at` (timestamptz) - Record creation timestamp
  - `expires_at` (timestamptz) - When video files should be cleaned up
  - `updated_at` (timestamptz) - Last update timestamp

  ### `video_processing_queue`
  Queue table for tracking video processing jobs.
  - `id` (uuid, primary key) - Unique job identifier
  - `video_id` (uuid, foreign key) - References video_analytics
  - `user_id` (uuid, foreign key) - References auth.users
  - `status` (text) - Queue status: 'pending', 'processing', 'completed', or 'failed'
  - `current_step` (text) - Current processing step
  - `progress_percentage` (integer) - Processing progress (0-100)
  - `error_message` (text, nullable) - Error message if job failed
  - `retry_count` (integer) - Number of retry attempts
  - `max_retries` (integer) - Maximum retry attempts allowed
  - `priority` (integer, nullable) - Job priority (higher = more important)
  - `started_at` (timestamptz, nullable) - When processing started
  - `completed_at` (timestamptz, nullable) - When processing completed
  - `created_at` (timestamptz) - Job creation timestamp

  ### `video_feedback_history`
  Historical record of AI feedback scores for analytics and trend tracking.
  - `id` (uuid, primary key) - Unique history record identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `video_id` (uuid, foreign key) - References video_analytics
  - `feedback_generated_at` (timestamptz) - When feedback was generated
  - `overall_score` (numeric) - Overall feedback score
  - `hook_score` (numeric, nullable) - Hook analysis score
  - `content_score` (numeric, nullable) - Content quality score
  - `engagement_rate` (numeric, nullable) - Video engagement rate
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - Enable RLS on all tables
  - Users can only access their own video analytics, queue jobs, and feedback history
  - Separate policies for SELECT, INSERT, UPDATE, DELETE operations
  - Authenticated users only

  ## Indexes
  - Indexes on user_id for fast user lookups
  - Indexes on video_id for fast video lookups
  - Indexes on status and processing_status for queue filtering
  - Indexes on created_at for sorting
  - Index on expires_at for cleanup queries
*/

-- Create video_analytics table
CREATE TABLE IF NOT EXISTS video_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_url text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok')),
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  transcript text DEFAULT '',
  metrics jsonb DEFAULT '{}'::jsonb,
  metrics_scraped boolean DEFAULT false,
  ai_feedback jsonb,
  video_file_path text,
  audio_file_path text,
  processing_status text NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'downloading', 'extracting_audio', 'transcribing', 'analyzing', 'completed', 'failed')),
  processing_error text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  updated_at timestamptz DEFAULT now()
);

-- Create video_processing_queue table
CREATE TABLE IF NOT EXISTS video_processing_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES video_analytics(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  current_step text NOT NULL DEFAULT 'queued' CHECK (current_step IN ('queued', 'download', 'extract_audio', 'transcribe', 'analyze', 'completed')),
  progress_percentage integer NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  priority integer DEFAULT 5,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create video_feedback_history table
CREATE TABLE IF NOT EXISTS video_feedback_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id uuid REFERENCES video_analytics(id) ON DELETE CASCADE NOT NULL,
  feedback_generated_at timestamptz NOT NULL,
  overall_score numeric NOT NULL,
  hook_score numeric,
  content_score numeric,
  engagement_rate numeric,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for video_analytics
CREATE INDEX IF NOT EXISTS idx_video_analytics_user_id ON video_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_video_analytics_platform ON video_analytics(platform);
CREATE INDEX IF NOT EXISTS idx_video_analytics_processing_status ON video_analytics(processing_status);
CREATE INDEX IF NOT EXISTS idx_video_analytics_created_at ON video_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_analytics_expires_at ON video_analytics(expires_at);

-- Create indexes for video_processing_queue
CREATE INDEX IF NOT EXISTS idx_video_processing_queue_video_id ON video_processing_queue(video_id);
CREATE INDEX IF NOT EXISTS idx_video_processing_queue_user_id ON video_processing_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_video_processing_queue_status ON video_processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_video_processing_queue_created_at ON video_processing_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_video_processing_queue_priority_status ON video_processing_queue(priority DESC, status, created_at);

-- Create indexes for video_feedback_history
CREATE INDEX IF NOT EXISTS idx_video_feedback_history_user_id ON video_feedback_history(user_id);
CREATE INDEX IF NOT EXISTS idx_video_feedback_history_video_id ON video_feedback_history(video_id);
CREATE INDEX IF NOT EXISTS idx_video_feedback_history_feedback_generated_at ON video_feedback_history(feedback_generated_at DESC);

-- Enable RLS
ALTER TABLE video_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_feedback_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_analytics
DROP POLICY IF EXISTS "Users can view own video analytics" ON video_analytics;
CREATE POLICY "Users can view own video analytics"
  ON video_analytics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own video analytics" ON video_analytics;
CREATE POLICY "Users can create own video analytics"
  ON video_analytics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own video analytics" ON video_analytics;
CREATE POLICY "Users can update own video analytics"
  ON video_analytics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own video analytics" ON video_analytics;
CREATE POLICY "Users can delete own video analytics"
  ON video_analytics FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for video_processing_queue
DROP POLICY IF EXISTS "Users can view own processing queue jobs" ON video_processing_queue;
CREATE POLICY "Users can view own processing queue jobs"
  ON video_processing_queue FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own processing queue jobs" ON video_processing_queue;
CREATE POLICY "Users can create own processing queue jobs"
  ON video_processing_queue FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own processing queue jobs" ON video_processing_queue;
CREATE POLICY "Users can update own processing queue jobs"
  ON video_processing_queue FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own processing queue jobs" ON video_processing_queue;
CREATE POLICY "Users can delete own processing queue jobs"
  ON video_processing_queue FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for video_feedback_history
DROP POLICY IF EXISTS "Users can view own feedback history" ON video_feedback_history;
CREATE POLICY "Users can view own feedback history"
  ON video_feedback_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own feedback history" ON video_feedback_history;
CREATE POLICY "Users can create own feedback history"
  ON video_feedback_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own feedback history" ON video_feedback_history;
CREATE POLICY "Users can update own feedback history"
  ON video_feedback_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own feedback history" ON video_feedback_history;
CREATE POLICY "Users can delete own feedback history"
  ON video_feedback_history FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
