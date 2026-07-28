'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageType, EditorContent, MessageType } from '@/types/script-chat';
import { AI_MODELS, AIModelName } from '@/types/ai-models';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { Button } from '../ui/button';
import { X, Loader2, Sparkles } from 'lucide-react';
import { useSaveMessage } from '@/hooks/use-script-chats';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { storageKeys } from '@/utils/storage-keys';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/use-clerk-auth';
import { useChatAttachments } from '@/hooks/use-chat-attachments';
import { materializeSuggestionsForGeneration } from '@/lib/script-editing/proposals';
import type { EditProposal } from '@/types/script-chat';

const log = logger.child({ component: 'ChatPanel' });

interface ChatPanelProps {
  sessionId: string;
  messages: ChatMessageType[];
  editorContent: EditorContent | string;
  onClose: () => void;
  onContentUpdate: (content: any) => void;
  onProposalsGenerated?: (proposals: EditProposal[], messageId: string) => void;
  showHeader?: boolean;
}

export function ChatPanel({
  sessionId,
  messages,
  editorContent,
  onClose,
  onContentUpdate,
  onProposalsGenerated,
  showHeader = true,
}: ChatPanelProps) {
  const [mode, setMode] = useLocalStorage<MessageType>(storageKeys.localStorage.chatMode, 'ask');
  const [selectedModel, setSelectedModel] = useLocalStorage<AIModelName>(storageKeys.localStorage.chatModel, AI_MODELS.GOOGLE_PRO.model);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const saveMessage = useSaveMessage();
  const { userId } = useAuth();
  const { data: attachments } = useChatAttachments(sessionId);
  const hasBlockingAttachments = attachments.some((attachment) => attachment.isSelected
    && (attachment.processingStatus === 'queued' || attachment.processingStatus === 'processing'));
  const latestMessageId = messages.at(-1)?.id ?? null;

  log.debug('Rendering script chat panel', {
    action: 'render_script_chat_panel',
    userId: userId || 'signed_out',
    sessionId,
    showHeader,
  });

  useEffect(() => {
    if (!latestMessageId) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    log.debug('Scrolled the assistant panel for a newly appended message', {
      action: 'scroll_script_chat_to_latest_message',
      userId: userId || 'signed_out',
      sessionId,
      latestMessageId,
    });
  }, [latestMessageId, sessionId, userId]);

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;
    if (hasBlockingAttachments) {
      toast.info('Wait for selected files to finish scanning or deselect them');
      log.info('Blocked chat send while selected files are processing', {
        action: 'block_script_chat_send_for_processing_attachment',
        userId: userId || 'signed_out',
        sessionId,
      });
      return;
    }

    const sessionLog = log.child({
      sessionId,
      userId: userId || 'signed_out',
    });
    const userMessage = input.trim();
    const currentGenerationContent = typeof editorContent === 'string'
      ? materializeSuggestionsForGeneration(
          editorContent,
          userId || 'signed_out',
        )
      : editorContent;
    setInput('');
    setIsGenerating(true);

    try {
      sessionLog.info('User sent message', { mode, model: selectedModel });
      const savedUserMessage = await saveMessage.mutateAsync({
        sessionId,
        role: 'user',
        messageType: mode,
        content: userMessage,
      });

      if (mode === 'ask') {
        sessionLog.info('Calling /api/chat/ask');
        const response = await fetch('/api/chat/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: userMessage,
            currentContent: currentGenerationContent,
            sessionId,
            model: selectedModel,
            messageId: savedUserMessage.id,
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || `Failed to get response (${response.status})`);
        }
        sessionLog.info('Received ask response');

        await saveMessage.mutateAsync({
          sessionId,
          role: 'assistant',
          messageType: mode,
          content: data.response,
        });
      } else {
        sessionLog.info('Calling /api/chat/edit');
        const response = await fetch('/api/chat/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            editRequest: userMessage,
            currentContent: currentGenerationContent,
            sessionId,
            model: selectedModel,
            messageId: savedUserMessage.id,
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || `Failed to generate edit (${response.status})`);
        }
        sessionLog.info('Received edit proposal', {
          content: data.content,
          proposedChanges: data.proposedChanges
        });

        const savedAssistantMessage = await saveMessage.mutateAsync({
          sessionId,
          role: 'assistant',
          messageType: mode,
          content: data.content,
          proposedChanges: data.proposedChanges,
          changeStatus: 'pending',
        });
        onProposalsGenerated?.(
          data.proposedChanges as EditProposal[],
          savedAssistantMessage.id,
        );
        sessionLog.info('Forwarded exact edit proposals to the script editor', {
          action: 'highlight_generated_script_edit_proposals',
          userId: userId || 'signed_out',
          assistantMessageId: savedAssistantMessage.id,
          proposalCount: (data.proposedChanges as EditProposal[]).length,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      sessionLog.error('Error in handleSend', {
        action: 'send_script_chat_message',
        userId: userId || 'signed_out',
        error,
      });
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };
  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {showHeader && (
        <div className="border-b px-4 py-1.5 flex items-center justify-between shrink-0 bg-background/95 backdrop-blur z-10 sticky top-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Assistant</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="custom-scrollbar flex-1 space-y-4 overflow-auto px-4 pb-1 pt-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            <p className="mb-2">Start a conversation</p>
            <p className="text-xs">
              {mode === 'ask'
                ? 'Ask questions about your script or content strategy'
                : 'Request specific changes to your script'}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              sessionId={sessionId}
              onContentUpdate={onContentUpdate}
              editorContent={editorContent}
            />
          ))
        )}
        {isGenerating && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Generating response...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        input={input}
        setInput={setInput}
        handleSend={handleSend}
        isGenerating={isGenerating}
        mode={mode}
        setMode={setMode}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        parentId={sessionId}
        attachments={attachments}
        hasBlockingAttachments={hasBlockingAttachments}
      />
    </div>
  );
}
