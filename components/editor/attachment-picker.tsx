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
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

interface SelectedAttachmentChipsProps {
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

export function SelectedAttachmentChips({ attachments }: SelectedAttachmentChipsProps) {
  const { userId } = useAuth();
  const select = useSelectChatAttachment();
  const selected = attachments.filter((attachment) => attachment.isSelected);
  const handleDeselect = async (attachment: ChatAttachment) => {
    try {
      await select.mutateAsync({ attachmentId: attachment.id, isSelected: false });
      log.info('Deselected chat attachment from chip', {
        userId: userId || 'unknown',
        action: 'deselect_chat_attachment_chip',
        attachmentId: attachment.id,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to deselect file');
    }
  };
  if (!selected.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-2.5 pt-2" aria-label="Files available to the assistant">
      {selected.map((attachment) => (
        <div
          key={attachment.id}
          className={cn(
            'flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] leading-none',
            attachment.processingStatus === 'ready'
              ? 'border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-100'
              : 'border-amber-500/20 bg-amber-500/[0.08] text-amber-100',
          )}
        >
          {attachment.processingStatus === 'ready'
            ? <Check className="h-3 w-3 shrink-0" />
            : <Loader2 className="h-3 w-3 shrink-0 animate-spin motion-reduce:animate-none" />}
          <span className="truncate">{attachment.fileName}</span>
          <button
            type="button"
            onClick={() => void handleDeselect(attachment)}
            className="rounded-sm opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label={`Deselect ${attachment.fileName}`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function AttachmentPicker({ parentId, attachments, disabled }: AttachmentPickerProps) {
  const { userId } = useAuth();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const upload = useUploadChatAttachments(parentId, attachments.length);
  const select = useSelectChatAttachment();
  const remove = useRemoveChatAttachment();
  const retry = useRetryChatAttachment();

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;
    try {
      await upload.mutateAsync(files);
      toast.success(`${files.length} file${files.length === 1 ? '' : 's'} uploaded and queued for scanning`);
      log.info('Uploaded chat attachments from picker', {
        userId: userId || 'unknown',
        action: 'upload_chat_attachments_from_picker',
        parentId,
        fileCount: files.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to upload file';
      toast.error(message);
      log.error('Failed to upload chat attachments from picker', {
        userId: userId || 'unknown',
        action: 'upload_chat_attachments_from_picker',
        parentId,
        error,
        message,
      });
    }
  };

  const handleSelection = async (attachment: ChatAttachment, checked: boolean) => {
    try {
      await select.mutateAsync({ attachmentId: attachment.id, isSelected: checked });
      log.info('Changed attachment selection from picker', {
        userId: userId || 'unknown',
        action: 'select_chat_attachment_from_picker',
        attachmentId: attachment.id,
        isSelected: checked,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update file selection');
    }
  };

  const handleRemove = async (attachment: ChatAttachment) => {
    try {
      await remove.mutateAsync(attachment.id);
      toast.success(`${attachment.fileName} removed`);
      log.info('Removed attachment from picker', {
        userId: userId || 'unknown',
        action: 'remove_chat_attachment_from_picker',
        attachmentId: attachment.id,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to remove file');
    }
  };

  const handleRetry = async (attachment: ChatAttachment) => {
    try {
      await retry.mutateAsync(attachment.id);
      toast.success(`${attachment.fileName} queued again`);
      log.info('Retried attachment from picker', {
        userId: userId || 'unknown',
        action: 'retry_chat_attachment_from_picker',
        attachmentId: attachment.id,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to retry file');
    }
  };

  return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || upload.isPending}
            className="h-6 w-6 rounded-md text-muted-foreground hover:bg-white/10 hover:text-foreground"
            aria-label="Manage chat files"
          >
            {upload.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="z-[110] w-80 overflow-hidden rounded-xl border-border/70 p-0 shadow-2xl">
          <div className="flex items-start justify-between border-b border-border/60 bg-muted/20 px-3 py-3">
            <div>
              <p className="text-sm font-semibold">Chat references</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Selected files persist for this chat.</p>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
              {attachments.length}/10
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto p-1.5">
            {attachments.length === 0 ? (
              <div className="px-3 py-7 text-center">
                <Paperclip className="mx-auto mb-2 h-5 w-5 text-muted-foreground/50" />
                <p className="text-xs font-medium">No files in this chat</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Files are scanned before the model can use them.</p>
              </div>
            ) : attachments.map((attachment) => {
              const isBlocked = attachment.processingStatus === 'quarantined';
              const isFailed = attachment.processingStatus === 'failed';
              const isBusy = attachment.processingStatus === 'queued' || attachment.processingStatus === 'processing';
              const Icon = attachment.mimeType.startsWith('image/') ? FileImage : FileText;
              return (
                <div key={attachment.id} className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted/50">
                  <Checkbox
                    checked={attachment.isSelected}
                    disabled={isBlocked || isFailed}
                    onCheckedChange={(checked) => void handleSelection(attachment, checked === true)}
                    aria-label={`Use ${attachment.fileName}`}
                  />
                  <div className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border',
                    isBlocked ? 'border-red-500/20 bg-red-500/10 text-red-300' : 'border-border/60 bg-background/60 text-muted-foreground',
                  )}>
                    {isBlocked ? <ShieldAlert className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{attachment.fileName}</p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      {isBusy && <Loader2 className="h-2.5 w-2.5 animate-spin motion-reduce:animate-none" />}
                      {isFailed && <AlertTriangle className="h-2.5 w-2.5 text-amber-400" />}
                      <span>{statusLabel(attachment, userId || 'unknown')}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatBytes(attachment.sizeBytes, userId || 'unknown')}</span>
                    </div>
                    {isBlocked && (
                      <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-red-300/80">
                        Blocked because the file may contain instructions intended to manipulate the assistant.
                      </p>
                    )}
                    {isFailed && attachment.processingError && (
                      <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-amber-300/80">
                        {attachment.processingError}
                      </p>
                    )}
                  </div>
                  {isFailed && (
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => void handleRetry(attachment)} aria-label={`Retry ${attachment.fileName}`}>
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  )}
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground opacity-70 hover:text-destructive group-hover:opacity-100" onClick={() => void handleRemove(attachment)} aria-label={`Delete ${attachment.fileName}`}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border/60 p-2">
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
              variant="secondary"
              size="sm"
              className="h-8 w-full rounded-lg text-xs"
              disabled={attachments.length >= 10 || upload.isPending}
              onClick={() => inputRef.current?.click()}
            >
              {upload.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Paperclip className="mr-1.5 h-3.5 w-3.5" />}
              Add files
              <span className="ml-1 text-muted-foreground">· 10 MB max</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
  );
}
