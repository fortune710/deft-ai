-- Migration: Markdown Content Transition
-- Description: Adds top-level content column for MDX editor for unified Markdown storage.

-- 1. Add script_content TEXT column to content_items
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS script_content TEXT;

-- 2. Migrate existing script_content from JSONB blob to the new top-level column
UPDATE content_items 
SET script_content = content->>'script_content'
WHERE script_content IS NULL AND content ? 'script_content';
