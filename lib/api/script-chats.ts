import { supabase } from '@/lib/supabase/client';
import type { ChatSession, ChatMessage, EditorContent, EditProposal } from '@/types/script-chat';

export async function fetchChatSessions(): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from('script_chat_sessions')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch chat sessions: ${error.message}`);
  }

  return data as ChatSession[];
}

export async function fetchSessionById(sessionId: string): Promise<ChatSession> {
  const { data, error } = await supabase
    .from('script_chat_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch session: ${error.message}`);
  }

  if (!data) {
    throw new Error('Session not found');
  }

  return data as ChatSession;
}

export async function fetchSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('script_chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  return data as ChatMessage[];
}

export async function createChatSession(
  title: string,
  editorContent: EditorContent
): Promise<ChatSession> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('script_chat_sessions')
    .insert({
      user_id: user.id,
      title,
      editor_content: editorContent,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }

  return data as ChatSession;
}

export async function updateSessionEditorContent(
  sessionId: string,
  editorContent: EditorContent
): Promise<void> {
  const { error } = await supabase
    .from('script_chat_sessions')
    .update({
      editor_content: editorContent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    throw new Error(`Failed to update session: ${error.message}`);
  }
}

export async function updateSessionTitle(
  sessionId: string,
  title: string
): Promise<void> {
  const { error } = await supabase
    .from('script_chat_sessions')
    .update({
      title,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    throw new Error(`Failed to update session title: ${error.message}`);
  }
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('script_chat_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    throw new Error(`Failed to delete session: ${error.message}`);
  }
}

export async function createChatMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  messageType: 'ask' | 'edit',
  content: string,
  proposedChanges?: EditProposal[],
  changeStatus?: 'pending' | 'accepted' | 'rejected'
): Promise<ChatMessage> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('script_chat_messages')
    .insert({
      session_id: sessionId,
      user_id: user.id,
      role,
      message_type: messageType,
      content,
      proposed_changes: proposedChanges,
      change_status: changeStatus,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create message: ${error.message}`);
  }

  return data as ChatMessage;
}

export async function updateMessageChangeStatus(
  messageId: string,
  status: 'accepted' | 'rejected'
): Promise<void> {
  const { error } = await supabase
    .from('script_chat_messages')
    .update({ change_status: status })
    .eq('id', messageId);

  if (error) {
    throw new Error(`Failed to update message status: ${error.message}`);
  }
}
