-- Migration: Drop Chat Session Foreign Key Constraint
-- Description: Removes the foreign key constraint on script_chat_messages.session_id referencing script_chat_sessions.id.
-- This allows messages to be associated with content_items directly in the new MDX editor workflow without failing DB inserts.

ALTER TABLE script_chat_messages
DROP CONSTRAINT IF EXISTS script_chat_messages_session_id_fkey;
