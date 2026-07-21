'use client';

import * as React from 'react';
import {
  AlertTriangle,
  Check,
  FileImage,
  FileText,
  Loader2,
  Paperclip,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useRemoveChatAttachment,
  useRetryChatAttachment,
  useSelectChatAttachment,
  useUploadChatAttachments,
} from '@/hooks/use-chat-attachments';
import { useAuth } from '@/hooks/use-clerk-auth';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import type { ChatAttachment } from '@/types/chat-attachments';

const log = logger.child({ file: 'components/editor/attachment-picker.tsx' });

interface AttachmentPickerProps {
  parentId: string;
  attachments: ChatAttachment[];
  disabled?: boolean;
}

interface AttachmentTrayProps {
  attachments: ChatAttachment[];
}

function formatBytes(bytes: number, userId: string) {
  const formatted = bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  log.debug('Formatted chat attachment size', {
    userId,
    action: 'format_chat_attachment_size',
    sizeBytes: bytes,
  });
  return formatted;
}

function statusLabel(attachment: ChatAttachment, userId: string) {
  const label = attachment.processingStatus === 'queued'
    ? 'Queued'
    : attachment.processingStatus === 'processing'
      ? 'Scanning'
      : attachment.processingStatus === 'ready'
        ? 'Ready'
        : attachment.processingStatus === 'quarantined'
          ? 'Blocked'
          : 'Failed';
  log.debug('Resolved chat attachment status label', {
    userId,
    action: 'resolve_chat_attachment_status_label',
    attachmentId: attachment.id,
    processingStatus: attachment.processingStatus,
  });
  return label;
}

export function AttachmentPicker({ parentId, attachments, disabled }: AttachmentPickerProps) {
  const { userId } = useAuth();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const upload = useUploadChatAttachments(parentId, attachments.length);

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;
    try {
      await upload.mutateAsync(files);
      toast.success(`${files.length} file${files.length === 1 ? '' : 's'} uploaded and queued for scanning`);
      log.info('Uploaded chat attachments from upload button', {
        userId: userId || 'unknown',
        action: 'upload_chat_attachments_from_button',
        parentId,
        fileCount: files.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to upload file';
      toast.error(message);
      log.error('Failed to upload chat attachments from upload button', {
        userId: userId || 'unknown',
        action: 'upload_chat_attachments_from_button',
        parentId,
        error,
        message,
      });
    }
  };

  const handleUploadClick = () => {
    log.debug('Opened the chat attachment file chooser', {
      userId: userId || 'unknown',
      action: 'open_chat_attachment_file_chooser',
      parentId,
    });
    inputRef.current?.click();
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
        onChange={(event) => void handleFiles(event)}
        className="sr-only"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled || upload.isPending || attachments.length >= 10}
        className="h-6 w-6 rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground"
        onClick={handleUploadClick}
        aria-label={attachments.length >= 10 ? 'Chat file limit reached' : 'Upload files'}
        title="Upload a file"
      >
        {upload.isPending
          ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
          : <Paperclip className="h-3.5 w-3.5" />}
      </Button>
    </>
  );
}

export function AttachmentTray({ attachments }: AttachmentTrayProps) {
  const { userId } = useAuth();
  const [expanded, setExpanded] = React.useState(false);
  const select = useSelectChatAttachment();
  const remove = useRemoveChatAttachment();
  const retry = useRetryChatAttachment();
  const selectableAttachments = attachments.filter((attachment) => (
    attachment.processingStatus !== 'quarantined' && attachment.processingStatus !== 'failed'
  ));
  const allSelected = selectableAttachments.length > 0
    && selectableAttachments.every((attachment) => attachment.isSelected);

  const handleExpandedChange = () => {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);
    log.debug('Changed chat attachment tray visibility', {
      userId: userId || 'unknown',
      action: 'toggle_chat_attachment_tray',
      expanded: nextExpanded,
      attachmentCount: attachments.length,
    });
  };

  const handleSelection = async (attachment: ChatAttachment, checked: boolean) => {
    try {
      await select.mutateAsync({ attachmentId: attachment.id, isSelected: checked });
      log.info('Changed attachment selection from tray', {
        userId: userId || 'unknown',
        action: 'select_chat_attachment_from_tray',
        attachmentId: attachment.id,
        isSelected: checked,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update file selection');
      log.error('Failed to change attachment selection from tray', {
        userId: userId || 'unknown',
        action: 'select_chat_attachment_from_tray',
        attachmentId: attachment.id,
        error,
      });
    }
  };

  const handleRemove = async (attachment: ChatAttachment) => {
    try {
      await remove.mutateAsync(attachment.id);
      toast.success(`${attachment.fileName} removed`);
      log.info('Removed attachment from tray', {
        userId: userId || 'unknown',
        action: 'remove_chat_attachment_from_tray',
        attachmentId: attachment.id,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to remove file');
      log.error('Failed to remove attachment from tray', {
        userId: userId || 'unknown',
        action: 'remove_chat_attachment_from_tray',
        attachmentId: attachment.id,
        error,
      });
    }
  };

  const handleRetry = async (attachment: ChatAttachment) => {
    try {
      await retry.mutateAsync(attachment.id);
      toast.success(`${attachment.fileName} queued again`);
      log.info('Retried attachment from tray', {
        userId: userId || 'unknown',
        action: 'retry_chat_attachment_from_tray',
        attachmentId: attachment.id,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to retry file');
      log.error('Failed to retry attachment from tray', {
        userId: userId || 'unknown',
        action: 'retry_chat_attachment_from_tray',
        attachmentId: attachment.id,
        error,
      });
    }
  };

  if (!attachments.length) return null;

  return (
    <section
      className={cn(
        'relative z-0 w-[90%] overflow-hidden border border-border/60 bg-[#222222]/95 shadow-[0_-10px_28px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-[max-height,border-radius] duration-200 ease-out motion-reduce:transition-none',
        expanded ? 'max-h-64 rounded-t-xl' : 'h-7 max-h-7 rounded-t-lg',
      )}
      aria-label="Uploaded chat files"
    >
      <button
        type="button"
        className="flex h-7 w-full items-center justify-between px-3 text-[10px] font-medium leading-none text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
        onClick={handleExpandedChange}
        aria-expanded={expanded}
        aria-controls="chat-attachment-list"
      >
        <span className="tabular-nums">
          {attachments.length} file{attachments.length === 1 ? '' : 's'}
        </span>
        <Check
          className={cn('h-2.5 w-2.5 transition-opacity', allSelected ? 'text-emerald-300 opacity-100' : 'opacity-20')}
          aria-label={allSelected ? 'All available files selected' : 'Some files are not selected'}
        />
      </button>

      <div id="chat-attachment-list" className="max-h-[226px] overflow-y-auto px-1.5 pb-2 pt-0">
        {attachments.map((attachment) => {
          const isBlocked = attachment.processingStatus === 'quarantined';
          const isFailed = attachment.processingStatus === 'failed';
          const isBusy = attachment.processingStatus === 'queued' || attachment.processingStatus === 'processing';
          const Icon = attachment.mimeType.startsWith('image/') ? FileImage : FileText;
          return (
            <div key={attachment.id} className="group flex items-center gap-1.5 rounded-md px-1.5 py-1 hover:bg-white/[0.045]">
              <Checkbox
                checked={attachment.isSelected}
                disabled={isBlocked || isFailed}
                onCheckedChange={(checked) => void handleSelection(attachment, checked === true)}
                className="h-3 w-3 [&_svg]:h-2.5 [&_svg]:w-2.5"
                aria-label={`Use ${attachment.fileName}`}
              />
              <div className={cn(
                'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border',
                isBlocked
                  ? 'border-red-500/20 bg-red-500/10 text-red-300'
                  : 'border-border/50 bg-background/40 text-muted-foreground',
              )}>
                {isBlocked ? <ShieldAlert className="h-[9px] w-[9px]" /> : <Icon className="h-[9px] w-[9px]" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-medium leading-none text-foreground/90">{attachment.fileName}</p>
                <div className="mt-0.5 flex items-center gap-1 text-[8px] leading-none text-muted-foreground">
                  {isBusy && <Loader2 className="h-2.5 w-2.5 animate-spin motion-reduce:animate-none" />}
                  {isFailed && <AlertTriangle className="h-2.5 w-2.5 text-amber-400" />}
                  <span>{statusLabel(attachment, userId || 'unknown')}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatBytes(attachment.sizeBytes, userId || 'unknown')}</span>
                </div>
              </div>
              {isFailed && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-muted-foreground"
                  onClick={() => void handleRetry(attachment)}
                  aria-label={`Retry ${attachment.fileName}`}
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground opacity-70 hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100"
                onClick={() => void handleRemove(attachment)}
                aria-label={`Remove ${attachment.fileName}`}
              >
                <X className="h-2.5 w-2.5" />
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
