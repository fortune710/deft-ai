'use client';

import { ChatMessage as ChatMessageType, EditorContent } from '@/types/script-chat';
import { Button } from '../ui/button';
import { Check, X } from 'lucide-react';
import { useUpdateMessageStatus, useUpdateEditorContent } from '@/hooks/use-script-chats';
import { toast } from 'sonner';
import { EditProposalDisplay } from './edit-proposal-display';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: ChatMessageType;
  sessionId: string;
  onContentUpdate: (content: any) => void;
  editorContent: any;
}

export function ChatMessage({ message, sessionId, onContentUpdate, editorContent }: ChatMessageProps) {
  const updateStatus = useUpdateMessageStatus();
  const updateEditorContent = useUpdateEditorContent();
  const messageLog = logger.child({
    file: 'components/editor/chat-message.tsx',
    userId: message.user_id,
    sessionId,
    messageId: message.id,
  });

  const handleAccept = async () => {
    if (!message.proposed_changes) {
      messageLog.warn('No proposed changes to accept', {
        action: 'accept_proposed_changes',
        userId: message.user_id,
      });
      return;
    }

    try {
      messageLog.info('Applying proposed changes', {
        action: 'accept_proposed_changes',
        userId: message.user_id,
        proposedChangesCount: message.proposed_changes.length,
      });

      let updatedContent = typeof editorContent === 'string' ? editorContent : { ...editorContent };

      for (const change of message.proposed_changes) {
        if (typeof updatedContent === 'string') {
          // If the section is 'markdown' or generic, we just replace the entire content or try string replacement
          if (change.section === 'markdown') {
            updatedContent = change.after;
          } else {
            // Apply diff or simple string replacement if possible
            if (updatedContent.includes(change.before) && change.before.trim() !== '') {
              updatedContent = updatedContent.replace(change.before, change.after);
            } else {
              updatedContent = change.after; // Fallback replacing the whole document
            }
          }
        } else {
          // Legacy object updating
          if (change.section === 'fullScript') {
            updatedContent.fullScript = change.after;
          } else if (change.section === 'goalAlignedCTA') {
            updatedContent.goalAlignedCTA = change.after;
          } else if (change.section === 'hookOptions') {
            try {
              const newHooks = JSON.parse(change.after);
              updatedContent.hookOptions = newHooks;
            } catch (error) {
              messageLog.error('Failed to parse hook options from proposal', {
                action: 'parse_hook_options',
                userId: message.user_id,
                section: change.section,
                error,
              });
            }
          }
        }
      }

      await updateEditorContent.mutateAsync({
        sessionId,
        editorContent: updatedContent,
      });

      await updateStatus.mutateAsync({
        messageId: message.id,
        status: 'accepted',
        sessionId,
      });

      onContentUpdate(updatedContent);
      toast.success('Changes applied');
      messageLog.info('Proposed changes accepted and applied', {
        action: 'accept_proposed_changes',
        userId: message.user_id,
      });
    } catch (error) {
      messageLog.error('Failed to apply proposed changes', {
        action: 'accept_proposed_changes',
        userId: message.user_id,
        error,
      });
      toast.error('Failed to apply changes');
    }
  };

  const handleReject = async () => {
    try {
      messageLog.info('Rejecting proposed changes', {
        action: 'reject_proposed_changes',
        userId: message.user_id,
      });

      await updateStatus.mutateAsync({
        messageId: message.id,
        status: 'rejected',
        sessionId,
      });
      toast.success('Changes rejected');
      messageLog.info('Proposed changes rejected', {
        action: 'reject_proposed_changes',
        userId: message.user_id,
      });
    } catch (error) {
      messageLog.error('Failed to reject proposed changes', {
        action: 'reject_proposed_changes',
        userId: message.user_id,
        error,
      });
      toast.error('Failed to reject changes');
    }
  };

  const isUser = message.role === 'user';

  return (
    <div className={cn("flex", isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn("max-w-[87%] rounded-lg px-3 py-2", isUser
          ? 'bg-primary text-primary-foreground'
          : ''
        )}
      >
        <div className="text-sm">
          {message.role === 'assistant' ? (
            <div className="prose prose-sm max-w-none break-words prose-invert text-white prose-headings:text-white prose-p:text-white prose-strong:text-white prose-em:text-white prose-li:text-white prose-a:text-white prose-code:text-white prose-pre:text-white prose-blockquote:text-white prose-p:my-2 prose-pre:my-2 prose-ul:my-2 prose-ol:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}
        </div>

        {message.message_type === 'edit' &&
          message.role === 'assistant' &&
          message.proposed_changes &&
          message.change_status === 'pending' && (
            <div className="mt-3 space-y-3">
              <EditProposalDisplay proposals={message.proposed_changes} />
              <div className="flex gap-2 w-full md:w-1/2">
                <Button
                  size="sm"
                  onClick={handleAccept}
                  disabled={updateStatus.isPending}
                  className="flex-1 rounded-lg"
                >
                  <Check className="h-4 w-4" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReject}
                  disabled={updateStatus.isPending}
                  className="flex-1 rounded-lg"
                >
                  <X className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            </div>
          )}

        {message.change_status === 'accepted' && (
          <div className="mt-2 text-xs opacity-70">✓ Changes applied</div>
        )}

        {message.change_status === 'rejected' && (
          <div className="mt-2 text-xs opacity-70">✗ Changes rejected</div>
        )}

        <div className="text-xs opacity-70 mt-2">
          {new Date(message.created_at).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
