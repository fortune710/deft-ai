'use client';

import { useMutation as useAsyncMutation } from '@tanstack/react-query';
import {
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from 'convex/react';

import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { useAuth } from '@/hooks/use-clerk-auth';
import { logger } from '@/lib/logger';
import type { ChatMessage, ChatSession, EditorContent, EditProposal } from '@/types/script-chat';

const log = logger.child({ module: 'hooks/use-script-chats' });
type ChatParentId = Id<'script_chat_sessions'> | Id<'content_items'>;

function toChatSession(document: Doc<'script_chat_sessions'>): ChatSession {
  return {
    id: document._id,
    user_id: document.user_id,
    title: document.title,
    editor_content: document.editor_content as EditorContent,
    created_at: document.created_at ?? new Date(document._creationTime).toISOString(),
    updated_at: document.updated_at ?? new Date(document._creationTime).toISOString(),
  };
}

function toChatMessage(document: Doc<'script_chat_messages'>): ChatMessage {
  return {
    id: document._id,
    session_id: document.session_id,
    user_id: document.user_id,
    role: document.role,
    message_type: document.message_type,
    content: document.content,
    proposed_changes: document.proposed_changes as EditProposal[] | undefined,
    change_status: document.change_status ?? undefined,
    created_at: document.created_at ?? new Date(document._creationTime).toISOString(),
    attachment_refs: (document.attachment_refs ?? []).map((reference) => ({
      attachmentId: reference.attachment_id,
      fileName: reference.file_name,
    })),
  };
}

export function useChatSessions() {
  const { userId } = useAuth();
  const documents = useConvexQuery(api.scriptChats.listSessions, userId ? {} : 'skip');
  log.debug('Resolved Convex script chat sessions', {
    userId: userId || 'signed_out',
    action: 'fetch_script_chat_sessions',
    sessionCount: documents?.length,
  });
  return {
    data: documents?.map(toChatSession) ?? [],
    isLoading: Boolean(userId) && documents === undefined,
  };
}

export function useSessionById(sessionId: string | undefined) {
  const { userId } = useAuth();
  const document = useConvexQuery(
    api.scriptChats.getSession,
    userId && sessionId
      ? { sessionId: sessionId as Id<'script_chat_sessions'> }
      : 'skip',
  );
  log.debug('Resolved Convex script chat session', {
    userId: userId || 'signed_out',
    action: 'fetch_script_chat_session',
    sessionId: sessionId || 'unknown',
  });
  return {
    data: document ? toChatSession(document) : undefined,
    isLoading: Boolean(userId && sessionId) && document === undefined,
  };
}

export function useSessionMessages(sessionId: string | undefined) {
  const { userId } = useAuth();
  const documents = useConvexQuery(
    api.scriptChats.listMessages,
    userId && sessionId ? { sessionId: sessionId as ChatParentId } : 'skip',
  );
  log.debug('Resolved Convex script chat messages', {
    userId: userId || 'signed_out',
    action: 'fetch_script_chat_messages',
    sessionId: sessionId || 'unknown',
    messageCount: documents?.length,
  });
  return {
    data: documents?.map(toChatMessage) ?? [],
    isLoading: Boolean(userId && sessionId) && documents === undefined,
  };
}

export function useCreateSession() {
  const { userId } = useAuth();
  const createSession = useConvexMutation(api.scriptChats.createSession);
  log.debug('Prepared Convex script chat session creation', {
    userId: userId || 'signed_out',
    action: 'prepare_create_script_chat_session',
  });

  return useAsyncMutation({
    mutationFn: async ({ title, editorContent }: { title: string; editorContent: EditorContent }) => {
      const session = await createSession({ title, editorContent });
      if (!session) throw new Error('Convex did not return the created chat session');
      log.info('Created Convex script chat session', {
        userId: userId || 'unknown',
        action: 'create_script_chat_session',
        sessionId: session._id,
      });
      return toChatSession(session);
    },
  });
}

export function useUpdateEditorContent() {
  const { userId } = useAuth();
  const updateEditorContent = useConvexMutation(api.scriptChats.updateEditorContent)
    .withOptimisticUpdate((localStore, args) => {
      const sessions = localStore.getQuery(api.scriptChats.listSessions, {});
      if (!sessions) return;
      localStore.setQuery(
        api.scriptChats.listSessions,
        {},
        sessions.map((session) => session._id === args.sessionId
          ? {
              ...session,
              editor_content: args.editorContent,
              updated_at: new Date().toISOString(),
            }
          : session),
      );
    });
  log.debug('Prepared optimistic Convex editor update', {
    userId: userId || 'signed_out',
    action: 'prepare_update_script_editor_content',
  });

  return useAsyncMutation({
    mutationFn: async ({ sessionId, editorContent }: { sessionId: string; editorContent: EditorContent }) => {
      log.info('Updating Convex script editor content', {
        userId: userId || 'unknown',
        action: 'update_script_editor_content',
        sessionId,
      });
      return await updateEditorContent({
        sessionId: sessionId as ChatParentId,
        editorContent,
      });
    },
  });
}

export function useUpdateSessionTitle() {
  const { userId } = useAuth();
  const updateSessionTitle = useConvexMutation(api.scriptChats.updateSessionTitle)
    .withOptimisticUpdate((localStore, args) => {
      const sessions = localStore.getQuery(api.scriptChats.listSessions, {});
      if (sessions) {
        localStore.setQuery(
          api.scriptChats.listSessions,
          {},
          sessions.map((session) => session._id === args.sessionId
            ? { ...session, title: args.title, updated_at: new Date().toISOString() }
            : session),
        );
      }
      const session = localStore.getQuery(api.scriptChats.getSession, { sessionId: args.sessionId });
      if (session) {
        localStore.setQuery(
          api.scriptChats.getSession,
          { sessionId: args.sessionId },
          { ...session, title: args.title, updated_at: new Date().toISOString() },
        );
      }
    });
  log.debug('Prepared optimistic Convex session title update', {
    userId: userId || 'signed_out',
    action: 'prepare_update_script_chat_title',
  });

  return useAsyncMutation({
    mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) =>
      updateSessionTitle({ sessionId: sessionId as Id<'script_chat_sessions'>, title }),
  });
}

export function useDeleteSession() {
  const { userId } = useAuth();
  const removeSession = useConvexMutation(api.scriptChats.removeSession)
    .withOptimisticUpdate((localStore, args) => {
      const sessions = localStore.getQuery(api.scriptChats.listSessions, {});
      if (!sessions) return;
      localStore.setQuery(
        api.scriptChats.listSessions,
        {},
        sessions.filter((session) => session._id !== args.sessionId),
      );
    });
  log.debug('Prepared optimistic Convex session deletion', {
    userId: userId || 'signed_out',
    action: 'prepare_delete_script_chat_session',
  });

  return useAsyncMutation({
    mutationFn: (sessionId: string) => {
      log.info('Deleting Convex script chat session', {
        userId: userId || 'unknown',
        action: 'delete_script_chat_session',
        sessionId,
      });
      return removeSession({ sessionId: sessionId as Id<'script_chat_sessions'> });
    },
  });
}

export function useSaveMessage() {
  const { userId } = useAuth();
  const createMessage = useConvexMutation(api.scriptChats.createMessage)
    .withOptimisticUpdate((localStore, args) => {
      const messages = localStore.getQuery(
        api.scriptChats.listMessages,
        { sessionId: args.sessionId },
      );
      if (!messages) return;
      const now = new Date();
      localStore.setQuery(
        api.scriptChats.listMessages,
        { sessionId: args.sessionId },
        [...messages, {
          _id: `optimistic:${now.getTime()}` as Id<'script_chat_messages'>,
          _creationTime: now.getTime(),
          session_id: args.sessionId,
          user_id: userId || 'unknown',
          role: args.role,
          message_type: args.messageType,
          content: args.content,
          proposed_changes: args.proposedChanges ?? null,
          change_status: args.changeStatus ?? null,
          created_at: now.toISOString(),
          attachment_refs: [],
        }],
      );
    });
  log.debug('Prepared optimistic Convex chat message creation', {
    userId: userId || 'signed_out',
    action: 'prepare_create_script_chat_message',
  });

  return useAsyncMutation({
    mutationFn: async ({
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
    }) => {
      log.info('Saving Convex script chat message', {
        userId: userId || 'unknown',
        action: 'create_script_chat_message',
        sessionId,
        role,
        messageType,
      });
      const message = await createMessage({
        sessionId: sessionId as ChatParentId,
        role,
        messageType,
        content,
        proposedChanges,
        changeStatus,
      });
      if (!message) throw new Error('Convex did not return the created chat message');
      return toChatMessage(message);
    },
  });
}

export function useUpdateMessageStatus() {
  const { userId } = useAuth();
  const updateMessageStatus = useConvexMutation(api.scriptChats.updateMessageStatus)
    .withOptimisticUpdate((localStore, args) => {
      const parentIds = [
        ...localStore.getAllQueries(api.scriptChats.listMessages),
      ];
      for (const query of parentIds) {
        if (!query.value) continue;
        localStore.setQuery(
          api.scriptChats.listMessages,
          query.args,
          query.value.map((message) => message._id === args.messageId
            ? { ...message, change_status: args.status }
            : message),
        );
      }
    });
  log.debug('Prepared optimistic Convex message status update', {
    userId: userId || 'signed_out',
    action: 'prepare_update_script_chat_message_status',
  });

  return useAsyncMutation({
    mutationFn: ({ messageId, status, sessionId }: {
      messageId: string;
      status: 'accepted' | 'rejected';
      sessionId: string;
    }) => {
      log.info('Updating Convex script chat message status', {
        userId: userId || 'unknown',
        action: 'update_script_chat_message_status',
        sessionId,
        messageId,
        status,
      });
      return updateMessageStatus({
        messageId: messageId as Id<'script_chat_messages'>,
        status,
      });
    },
  });
}
