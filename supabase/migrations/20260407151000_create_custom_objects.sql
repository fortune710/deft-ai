/*
  # Create custom_objects table

  ## Overview
  Stores user-defined "Custom Objects" (e.g., brand guides, social links, reference materials).
  Supports both text-based content and content extracted from uploaded files (PDF, DOCX, TXT).

  ## New Tables
  ### `custom_objects`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `name` (text) - Title of the object
  - `type` (text) - Category: 'brand guide', 'social link', 'others'
  - `content` (text, nullable) - The actual content or extracted text
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS
  - Authenticated users can CRUD their own data
*/

CREATE TABLE IF NOT EXISTS custom_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('brand guide', 'social link', 'others')),
  content text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE custom_objects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own custom objects"
  ON custom_objects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom objects"
  ON custom_objects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom objects"
  ON custom_objects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom objects"
  ON custom_objects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custom_objects_user_id ON custom_objects(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_objects_created_at ON custom_objects(created_at DESC);
