'use client';

import { useState } from 'react';
import { ChatMessage as ChatMessageType, EditorContent } from '@/types/script-chat';
import { Paperclip } from 'lucide-react';
import { useResolveEditProposal, useUpdateEditorContent } from '@/hooks/use-script-chats';
import { toast } from 'sonner';
import { EditProposalDisplay } from './edit-proposal-display';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import {
  applyEditProposalToContent,
  rejectEditProposalInContent,
} from '@/lib/script-editing/proposals';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AttachmentReference } from '@/types/chat-attachments';
import type { EditProposal } from '@/types/script-chat';

const log = logger.child({ file: 'components/editor/chat-message.tsx' });

interface ChatMessageProps {
  message: ChatMessageType;
  sessionId: string;
  onContentUpdate: (content: EditorContent | string) => void;
  editorContent: EditorContent | string;
}

function renderTaggedMessageContent(
  content: string,
  references: AttachmentReference[],
  userId: string,
  messageId: string,
) {
  const fileNames = references
    .map((reference) => reference.fileName)
    .filter((fileName, index, names) => names.indexOf(fileName) === index)
    .sort((first, second) => second.length - first.length);
  if (!fileNames.length) return content;
  const escapedNames = fileNames.map((fileName) => fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const matcher = new RegExp(`@(${escapedNames.join('|')})`, 'g');
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let mentionCount = 0;
  for (const match of content.matchAll(matcher)) {
    const start = match.index ?? 0;
    nodes.push(content.slice(cursor, start));
    nodes.push(
      <span
        key={`${start}-${match[1]}`}
        className="mx-0.5 inline-flex max-w-[90%] items-center rounded-[5px] bg-white/[0.09] px-1.5 py-0.5 align-baseline text-xs font-semibold text-primary ring-1 ring-inset ring-white/10"
        title={match[1]}
        spellCheck={false}
      >
        <span className="truncate">@{match[1]}</span>
      </span>,
    );
    cursor = start + match[0].length;
    mentionCount += 1;
  }
  nodes.push(content.slice(cursor));
  log.debug('Rendered tagged files in historical chat message', {
    userId,
    action: 'render_historical_chat_file_mentions',
    messageId,
    mentionCount,
  });
  return nodes;
}

export function ChatMessage({ message, sessionId, onContentUpdate, editorContent }: ChatMessageProps) {
  const [resolvingProposalIndex, setResolvingProposalIndex] = useState<number | null>(null);
  const resolveProposal = useResolveEditProposal();
  const updateEditorContent = useUpdateEditorContent();
  const messageLog = logger.child({
    file: 'components/editor/chat-message.tsx',
    userId: message.user_id,
    sessionId,
    messageId: message.id,
  });

  const handleAcceptProposal = async (proposal: EditProposal, proposalIndex: number) => {
    const result = applyEditProposalToContent(
      editorContent,
      proposal,
      message.user_id,
      { messageId: message.id, proposalIndex },
    );
    if (!result.applied) {
      const errorMessage = result.reason === 'scope_too_broad'
        ? 'This suggestion is too broad to apply safely. Ask the assistant for smaller edits.'
        : 'This suggestion no longer matches the current script.';
      toast.error(errorMessage);
      messageLog.warn('Refused to apply an unsafe or stale edit proposal', {
        action: 'accept_individual_edit_proposal',
        userId: message.user_id,
        proposalIndex,
        section: proposal.section,
        reason: result.reason,
      });
      return;
    }

    setResolvingProposalIndex(proposalIndex);
    try {
      messageLog.info('Applying one proposed change', {
        action: 'accept_individual_edit_proposal',
        userId: message.user_id,
        proposalIndex,
        section: proposal.section,
      });

      await updateEditorContent.mutateAsync({
        sessionId,
        editorContent: result.content,
      });

      await resolveProposal.mutateAsync({
        messageId: message.id,
        proposalIndex,
        status: 'accepted',
        sessionId,
      });

      onContentUpdate(result.content);
      toast.success('Suggestion applied');
      messageLog.info('Individual proposal accepted and applied', {
        action: 'accept_individual_edit_proposal',
        userId: message.user_id,
        proposalIndex,
      });
    } catch (error) {
      messageLog.error('Failed to apply an individual proposed change', {
        action: 'accept_individual_edit_proposal',
        userId: message.user_id,
        proposalIndex,
        error,
      });
      toast.error('Failed to apply suggestion');
    } finally {
      setResolvingProposalIndex(null);
    }
  };

  const handleRejectProposal = async (_proposal: EditProposal, proposalIndex: number) => {
    const proposal = _proposal;
    const result = rejectEditProposalInContent(
      editorContent,
      proposal,
      message.user_id,
      { messageId: message.id, proposalIndex },
    );
    setResolvingProposalIndex(proposalIndex);
    try {
      messageLog.info('Rejecting one proposed change', {
        action: 'reject_individual_edit_proposal',
        userId: message.user_id,
        proposalIndex,
      });

      if (result.content !== editorContent) {
        await updateEditorContent.mutateAsync({
          sessionId,
          editorContent: result.content,
        });
        onContentUpdate(result.content);
      }
      await resolveProposal.mutateAsync({
        messageId: message.id,
        proposalIndex,
        status: 'rejected',
        sessionId,
      });
      toast.success('Suggestion rejected');
      messageLog.info('Individual proposal rejected', {
        action: 'reject_individual_edit_proposal',
        userId: message.user_id,
        proposalIndex,
      });
    } catch (error) {
      messageLog.error('Failed to reject an individual proposed change', {
        action: 'reject_individual_edit_proposal',
        userId: message.user_id,
        proposalIndex,
        error,
      });
      toast.error('Failed to reject suggestion');
    } finally {
      setResolvingProposalIndex(null);
    }
  };

  const isUser = message.role === 'user';

  messageLog.debug('Rendering chat message', {
    action: 'render_chat_message',
    userId: message.user_id,
    role: message.role,
    attachmentCount: message.attachment_refs.length,
  });

  return (
    <div className={cn("flex", isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn("max-w-[92%] px-3 py-2", isUser
          ? 'rounded-xl border border-border/50 bg-[#2A2A2A]/40 text-foreground dark:bg-[#1E1E1E]'
          : 'rounded-lg'
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
            <div className="whitespace-pre-wrap">
              {renderTaggedMessageContent(
                message.content,
                message.attachment_refs,
                message.user_id,
                message.id,
              )}
            </div>
          )}
        </div>

        {isUser && message.attachment_refs.length > 0 && (
          <div className="mt-2 flex flex-wrap justify-end gap-1" aria-label="Files available for this message">
            {message.attachment_refs.map((reference) => (
              <span
                key={reference.attachmentId}
                className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/50 bg-background/30 px-1.5 py-1 text-[10px] text-muted-foreground"
              >
                <Paperclip className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{reference.fileName}</span>
              </span>
            ))}
          </div>
        )}

        {message.message_type === 'edit' &&
          message.role === 'assistant' &&
          message.proposed_changes &&
          message.proposed_changes.length > 0 && (
            <div className="mt-3 space-y-3">
              <EditProposalDisplay
                proposals={message.proposed_changes}
                fallbackStatus={message.change_status ?? 'pending'}
                resolvingIndex={resolvingProposalIndex}
                onAccept={handleAcceptProposal}
                onReject={handleRejectProposal}
              />
            </div>
          )}

      </div>
    </div>
  );
}
