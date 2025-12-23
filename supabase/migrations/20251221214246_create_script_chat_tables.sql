/*
  # Script Chat Sessions System

  ## Overview
  Creates tables for the chat-based script creator with Cursor-style interface.
  Users can create script sessions with AI-generated content and refine through conversation.

  ## New Tables
  
  ### `script_chat_sessions`
  Stores script editing sessions with full editor content.
  - `id` (uuid, primary key) - Unique session identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `title` (text) - Auto-generated session title
  - `editor_content` (jsonb) - Full script content state
  - `created_at` (timestamptz) - Session creation time
  - `updated_at` (timestamptz) - Last modification time

  ### `script_chat_messages`
  Stores all messages in chat sessions with change proposals.
  - `id` (uuid, primary key) - Unique message identifier
  - `session_id` (uuid, foreign key) - References script_chat_sessions
  - `user_id` (uuid, foreign key) - References auth.users
  - `role` (text) - Either 'user' or 'assistant'
  - `message_type` (text) - Either 'ask' or 'edit'
  - `content` (text) - Message text content
  - `proposed_changes` (jsonb) - Structured edit proposals for edit mode
  - `change_status` (text) - 'pending', 'accepted', or 'rejected' for edit messages
  - `created_at` (timestamptz) - Message timestamp

  ## Security
  - Enable RLS on both tables
  - Users can only access their own sessions and messages
  - Separate policies for SELECT, INSERT, UPDATE, DELETE operations
  - Authenticated users only

  ## Indexes
  - Index on user_id for fast session lookups
  - Index on session_id for fast message queries
  - Index on updated_at for sorting recent sessions
*/

-- Create script_chat_sessions table
CREATE TABLE IF NOT EXISTS script_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  editor_content jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create script_chat_messages table
CREATE TABLE IF NOT EXISTS script_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES script_chat_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  message_type text NOT NULL CHECK (message_type IN ('ask', 'edit')),
  content text NOT NULL,
  proposed_changes jsonb,
  change_status text CHECK (change_status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_script_chat_sessions_user_id ON script_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_script_chat_sessions_updated_at ON script_chat_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_script_chat_messages_session_id ON script_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_script_chat_messages_user_id ON script_chat_messages(user_id);

-- Enable RLS
ALTER TABLE script_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for script_chat_sessions
CREATE POLICY "Users can view own sessions"
  ON script_chat_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON script_chat_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON script_chat_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON script_chat_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for script_chat_messages
CREATE POLICY "Users can view own messages"
  ON script_chat_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own messages"
  ON script_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messages"
  ON script_chat_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON script_chat_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);