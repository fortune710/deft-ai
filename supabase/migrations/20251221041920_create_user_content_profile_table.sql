/*
  # Create user_content_profile table for Niche Mapping Engine

  ## Overview
  This migration creates the user_content_profile table that stores user responses to the 5-step onboarding questionnaire and AI-generated content strategy recommendations.

  ## New Tables
  ### user_content_profile
  - `id` (uuid, primary key) - Unique identifier for each profile
  - `user_id` (uuid, unique, references auth.users) - Links profile to authenticated user
  - `question_1_niche` (text) - User's content niche (free text response)
  - `question_2_goal` (text) - Primary content goal (selected from predefined options)
  - `question_3_platforms` (jsonb) - Array of selected platforms with primary platform marked
  - `question_4_experience` (text) - Content creation experience level
  - `question_5_frequency` (text) - Posting frequency commitment
  - `ai_context` (jsonb) - AI-generated content strategy including:
    - content_pillars: Array of content themes
    - mini_series_ideas: Array of recurring content series concepts
    - script_templates: Object with hooks and structures
    - posting_cadence: Recommended posting schedule
    - reference_creators: Suggested creators to study
    - cta_strategies: Call-to-action recommendations
    - tone_guidance: Tone and complexity level guidance
  - `system_prompt` (text) - Condensed prompt for LLM context injection across features
  - `completed_at` (timestamptz) - Timestamp when onboarding was completed
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  ### Row Level Security (RLS)
  - Enable RLS on user_content_profile table
  - Users can only read their own profile data
  - Users can only insert their own profile (once)
  - Users can only update their own profile
  - Users can only delete their own profile

  ## Important Notes
  1. Each user can have only one content profile (enforced by unique constraint on user_id)
  2. All question fields are nullable initially to support draft saves
  3. AI context and system prompt are generated after form completion
  4. JSONB fields allow flexible storage of structured AI-generated data
*/

CREATE TABLE IF NOT EXISTS user_content_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_1_niche text,
  question_2_goal text,
  question_3_platforms jsonb DEFAULT '[]'::jsonb,
  question_4_experience text,
  question_5_frequency text,
  ai_context jsonb DEFAULT '{}'::jsonb,
  system_prompt text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_content_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own content profile"
  ON user_content_profile
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own content profile"
  ON user_content_profile
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own content profile"
  ON user_content_profile
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own content profile"
  ON user_content_profile
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_content_profile_user_id ON user_content_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_user_content_profile_completed_at ON user_content_profile(completed_at);
