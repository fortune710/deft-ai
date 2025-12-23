'use client';

import { ChatMessage as ChatMessageType, EditorContent } from '@/types/script-chat';
import { Button } from '../ui/button';
import { Check, X } from 'lucide-react';
import { useUpdateMessageStatus, useUpdateEditorContent } from '@/hooks/use-script-chats';
import { toast } from 'sonner';
import { EditProposalDisplay } from './edit-proposal-display';

interface ChatMessageProps {
  message: ChatMessageType;
  sessionId: string;
  onContentUpdate: (content: EditorContent) => void;
  editorContent: EditorContent;
}

export function ChatMessage({ message, sessionId, onContentUpdate, editorContent }: ChatMessageProps) {
  const updateStatus = useUpdateMessageStatus();
  const updateEditorContent = useUpdateEditorContent();

  const handleAccept = async () => {
    if (!message.proposed_changes) return;

    try {
      let updatedContent = { ...editorContent };

      for (const change of message.proposed_changes) {
        if (change.section === 'fullScript') {
          updatedContent.fullScript = change.after;
        } else if (change.section === 'goalAlignedCTA') {
          updatedContent.goalAlignedCTA = change.after;
        } else if (change.section === 'hookOptions') {
          try {
            const newHooks = JSON.parse(change.after);
            updatedContent.hookOptions = newHooks;
          } catch (e) {
            console.error('Failed to parse hooks:', e);
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
    } catch (error) {
      toast.error('Failed to apply changes');
    }
  };

  const handleReject = async () => {
    try {
      await updateStatus.mutateAsync({
        messageId: message.id,
        status: 'rejected',
        sessionId,
      });
      toast.success('Changes rejected');
    } catch (error) {
      toast.error('Failed to reject changes');
    }
  };

  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}
      >
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>

        {message.message_type === 'edit' &&
          message.role === 'assistant' &&
          message.proposed_changes &&
          message.change_status === 'pending' && (
            <div className="mt-3 space-y-3">
              <EditProposalDisplay proposals={message.proposed_changes} />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAccept}
                  disabled={updateStatus.isPending}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReject}
                  disabled={updateStatus.isPending}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-1" />
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
