import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchChatSessions,
  fetchSessionById,
  fetchSessionMessages,
  createChatSession,
  updateSessionEditorContent,
  updateSessionTitle,
  deleteChatSession,
  createChatMessage,
  updateMessageChangeStatus,
} from '@/lib/api/script-chats';
import type { EditorContent, EditProposal } from '@/types/script-chat';
import { storageKeys } from '@/utils/storage-keys';

export function useChatSessions() {
  return useQuery({
    queryKey: storageKeys.reactQuery.scriptChatSessions,
    queryFn: fetchChatSessions,
  });
}

export function useSessionById(sessionId: string | undefined) {
  return useQuery({
    queryKey: storageKeys.reactQuery.scriptChatSession(sessionId!),
    queryFn: () => fetchSessionById(sessionId!),
    enabled: !!sessionId,
  });
}

export function useSessionMessages(sessionId: string | undefined) {
  return useQuery({
    queryKey: storageKeys.reactQuery.scriptChatMessages(sessionId!),
    queryFn: () => fetchSessionMessages(sessionId!),
    enabled: !!sessionId,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ title, editorContent }: { title: string; editorContent: EditorContent }) =>
      createChatSession(title, editorContent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storageKeys.reactQuery.scriptChatSessions });
    },
  });
}

export function useUpdateEditorContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, editorContent }: { sessionId: string; editorContent: EditorContent }) =>
      updateSessionEditorContent(sessionId, editorContent),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: storageKeys.reactQuery.scriptChatSession(variables.sessionId) });
      queryClient.invalidateQueries({ queryKey: storageKeys.reactQuery.scriptChatSessions });
    },
  });
}

export function useUpdateSessionTitle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) =>
      updateSessionTitle(sessionId, title),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: storageKeys.reactQuery.scriptChatSession(variables.sessionId) });
      queryClient.invalidateQueries({ queryKey: storageKeys.reactQuery.scriptChatSessions });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => deleteChatSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['script-chat-sessions'] });
    },
  });
}

export function useSaveMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      role,
      messageType,
      content,
      proposedChanges,
      changeStatus,
    }: {
      sessionId: string;
      role: 'user' | 'assistant';
      messageType: 'ask' | 'edit';
      content: string;
      proposedChanges?: EditProposal[];
      changeStatus?: 'pending' | 'accepted' | 'rejected';
    }) => createChatMessage(sessionId, role, messageType, content, proposedChanges, changeStatus),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: storageKeys.reactQuery.scriptChatMessages(variables.sessionId) });
      queryClient.invalidateQueries({ queryKey: storageKeys.reactQuery.scriptChatSessions });
    },
  });
}

export function useUpdateMessageStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      messageId,
      status,
      sessionId,
    }: {
      messageId: string;
      status: 'accepted' | 'rejected';
      sessionId: string;
    }) => updateMessageChangeStatus(messageId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: storageKeys.reactQuery.scriptChatMessages(variables.sessionId) });
    },
  });
}
