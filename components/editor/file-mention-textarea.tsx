'use client';

import * as React from 'react';
import { FileImage, FileText, Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  useSelectChatAttachment,
  useUploadChatAttachments,
} from '@/hooks/use-chat-attachments';
import { useAuth } from '@/hooks/use-clerk-auth';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import type { ChatAttachment } from '@/types/chat-attachments';

const log = logger.child({ file: 'components/editor/file-mention-textarea.tsx' });
const MENTION_MENU_WIDTH = 208;

interface FileMentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  parentId: string;
  attachments: ChatAttachment[];
}

interface MentionState {
  start: number;
  end: number;
  query: string;
  left: number;
  top: number;
}

interface MentionRange {
  attachment: ChatAttachment;
  token: string;
  start: number;
  end: number;
}

interface FileMentionChipProps {
  range: MentionRange;
  userId: string;
  maxWidth?: number;
  onRemove: (range: MentionRange) => void | Promise<void>;
}

function FileMentionChip({ range, userId, maxWidth, onRemove }: FileMentionChipProps) {
  const handleRemove = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void onRemove(range);
    log.info('Removed file mention with chip button', {
      userId,
      action: 'remove_chat_file_mention_with_button',
      attachmentId: range.attachment.id,
    });
  };

  log.debug('Rendering atomic chat file mention chip', {
    userId,
    action: 'render_chat_file_mention_chip',
    attachmentId: range.attachment.id,
  });

  return (
    <span className="relative inline font-normal" data-file-mention-layout={range.attachment.id}>
      <span className="invisible" aria-hidden="true">{range.token}</span>
      <button
        type="button"
        className="group pointer-events-auto absolute left-0 top-1/2 inline-flex w-max -translate-y-1/2 items-center gap-0.5 rounded-[5px] bg-white/[0.09] px-1.5 py-0.5 text-xs font-semibold text-primary ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.13] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
        style={maxWidth ? { maxWidth } : undefined}
        data-file-mention={range.attachment.id}
        spellCheck={false}
        onMouseDown={(event) => event.preventDefault()}
        onClick={handleRemove}
        aria-label={`Remove ${range.attachment.fileName} mention`}
        title={range.attachment.fileName}
      >
        <span className="relative inline-flex h-3.5 w-[1ch] shrink-0 items-center justify-center">
          <span className="transition-opacity group-hover:opacity-0" aria-hidden="true">@</span>
          <X
            aria-hidden="true"
            className="absolute h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-100"
          />
        </span>
        <span className="min-w-0 truncate">{range.attachment.fileName}</span>
      </button>
    </span>
  );
}

function resolveMentionTrigger(value: string, caret: number, userId: string) {
  const beforeCaret = value.slice(0, caret);
  const match = beforeCaret.match(/(?:^|\s)@([^@\n]*)$/);
  const trigger = match
    ? {
        start: beforeCaret.length - match[1].length - 1,
        end: caret,
        query: match[1],
      }
    : null;
  log.debug('Resolved file mention trigger', {
    userId,
    action: 'resolve_chat_file_mention_trigger',
    hasTrigger: Boolean(trigger),
    caret,
  });
  return trigger;
}

function measureCaretPosition(textarea: HTMLTextAreaElement, caret: number, userId: string) {
  const computed = window.getComputedStyle(textarea);
  const mirror = document.createElement('div');
  mirror.style.position = 'fixed';
  mirror.style.left = '-9999px';
  mirror.style.top = '0';
  mirror.style.visibility = 'hidden';
  mirror.style.boxSizing = 'border-box';
  mirror.style.width = `${textarea.clientWidth}px`;
  mirror.style.height = `${textarea.clientHeight}px`;
  mirror.style.overflow = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordBreak = 'break-word';
  mirror.style.overflowWrap = 'break-word';
  mirror.style.font = computed.font;
  mirror.style.fontFamily = computed.fontFamily;
  mirror.style.fontSize = computed.fontSize;
  mirror.style.fontWeight = computed.fontWeight;
  mirror.style.letterSpacing = computed.letterSpacing;
  mirror.style.lineHeight = computed.lineHeight;
  mirror.style.padding = computed.padding;
  mirror.style.border = computed.border;
  mirror.textContent = textarea.value.slice(0, caret);

  const marker = document.createElement('span');
  marker.textContent = '\u200b';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const position = {
    left: marker.offsetLeft - textarea.scrollLeft,
    top: marker.offsetTop - textarea.scrollTop,
  };
  document.body.removeChild(mirror);
  log.debug('Measured chat file mention position', {
    userId,
    action: 'measure_chat_file_mention_position',
    caret,
    left: position.left,
    top: position.top,
  });
  return position;
}

function resolveMentionRanges(value: string, attachments: ChatAttachment[], userId: string) {
  const fileNames = attachments
    .map((attachment) => attachment.fileName)
    .filter((fileName, index, names) => names.indexOf(fileName) === index)
    .sort((first, second) => second.length - first.length);
  if (!fileNames.length) return [];
  const escapedNames = fileNames.map((fileName) => fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const matcher = new RegExp(`@(${escapedNames.join('|')})`, 'g');
  const ranges: MentionRange[] = [];
  for (const match of value.matchAll(matcher)) {
    const start = match.index ?? 0;
    const attachment = attachments.find((candidate) => candidate.fileName === match[1]);
    if (!attachment) continue;
    ranges.push({
      attachment,
      token: match[0],
      start,
      end: start + match[0].length,
    });
  }
  log.debug('Resolved atomic chat file mention ranges', {
    userId,
    action: 'resolve_chat_file_mention_ranges',
    attachmentCount: attachments.length,
    mentionCount: ranges.length,
  });
  return ranges;
}

export function FileMentionTextarea({
  value,
  onChange,
  onKeyDown,
  disabled,
  parentId,
  attachments,
}: FileMentionTextareaProps) {
  const { userId } = useAuth();
  const effectiveUserId = userId || 'signed_out';
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const uploadInputRef = React.useRef<HTMLInputElement>(null);
  const [mention, setMention] = React.useState<MentionState | null>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [textareaWidth, setTextareaWidth] = React.useState(0);
  const select = useSelectChatAttachment();
  const upload = useUploadChatAttachments(parentId, attachments.length);

  React.useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      log.warn('Skipped measuring chat file mention width without textarea', {
        userId: effectiveUserId,
        action: 'measure_chat_file_mention_width',
        parentId,
      });
      return;
    }
    const updateWidth = () => {
      setTextareaWidth(textarea.clientWidth);
      log.debug('Measured chat file mention textarea width', {
        userId: effectiveUserId,
        action: 'measure_chat_file_mention_width',
        parentId,
        textareaWidth: textarea.clientWidth,
      });
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(textarea);
    return () => {
      observer.disconnect();
      log.debug('Stopped observing chat file mention textarea width', {
        userId: effectiveUserId,
        action: 'stop_measuring_chat_file_mention_width',
        parentId,
      });
    };
  }, [effectiveUserId, parentId]);
  const mentionableAttachments = React.useMemo(() => attachments.filter((attachment) => (
    attachment.processingStatus !== 'quarantined' && attachment.processingStatus !== 'failed'
  )), [attachments]);
  const suggestions = React.useMemo(() => {
    if (!mention) return [];
    const query = mention.query.trim().toLocaleLowerCase();
    return mentionableAttachments.filter((attachment) => (
      !query || attachment.fileName.toLocaleLowerCase().includes(query)
    )).slice(0, 6);
  }, [mention, mentionableAttachments]);
  const mentionRanges = React.useMemo(
    () => resolveMentionRanges(value, attachments, effectiveUserId),
    [attachments, effectiveUserId, value],
  );

  const removeMention = React.useCallback(async (range: MentionRange) => {
    const removeTrailingSpace = value[range.end] === ' ';
    const deletionEnd = range.end + (removeTrailingSpace ? 1 : 0);
    const nextValue = `${value.slice(0, range.start)}${value.slice(deletionEnd)}`;
    onChange(nextValue);
    setMention(null);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(range.start, range.start);
    });
    try {
      if (!nextValue.includes(range.token)) {
        await select.mutateAsync({
          attachmentId: range.attachment.id,
          isSelected: false,
        });
      }
      log.info('Removed atomic file mention from chat input', {
        userId: effectiveUserId,
        action: 'remove_atomic_chat_file_mention',
        parentId,
        attachmentId: range.attachment.id,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update file selection');
      log.error('Failed to update selection after removing atomic file mention', {
        userId: effectiveUserId,
        action: 'remove_atomic_chat_file_mention',
        parentId,
        attachmentId: range.attachment.id,
        error,
      });
    }
  }, [effectiveUserId, onChange, parentId, select, value]);

  const highlightedContent = React.useMemo(() => {
    if (!mentionRanges.length) return { content: value, hasMention: false };
    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    for (const range of mentionRanges) {
      nodes.push(value.slice(cursor, range.start));
      nodes.push(
        <FileMentionChip
          key={`${range.start}-${range.attachment.id}`}
          range={range}
          userId={effectiveUserId}
          maxWidth={textareaWidth ? textareaWidth * 0.9 : undefined}
          onRemove={removeMention}
        />,
      );
      cursor = range.end;
    }
    nodes.push(value.slice(cursor));
    log.debug('Built highlighted chat file mentions', {
      userId: effectiveUserId,
      action: 'highlight_chat_file_mentions',
      attachmentCount: attachments.length,
      mentionCount: mentionRanges.length,
    });
    return { content: nodes, hasMention: true };
  }, [attachments.length, effectiveUserId, mentionRanges, removeMention, textareaWidth, value]);
  const hasHighlightedMention = highlightedContent.hasMention;

  const refreshMention = (textarea: HTMLTextAreaElement) => {
    const caret = textarea.selectionStart;
    const trigger = resolveMentionTrigger(textarea.value, caret, effectiveUserId);
    if (!trigger) {
      setMention(null);
      return;
    }
    const followsInsertedMention = mentionableAttachments.some((attachment) => (
      trigger.query.startsWith(`${attachment.fileName} `)
    ));
    if (followsInsertedMention) {
      setMention(null);
      log.debug('Closed suggestions after a complete chat file mention', {
        userId: effectiveUserId,
        action: 'close_completed_chat_file_mention_suggestions',
        parentId,
      });
      return;
    }
    const position = measureCaretPosition(textarea, trigger.start, effectiveUserId);
    setMention({ ...trigger, ...position });
    setActiveIndex(0);
    log.debug('Refreshed chat file mention suggestions', {
      userId: effectiveUserId,
      action: 'refresh_chat_file_mention_suggestions',
      parentId,
      suggestionQueryLength: trigger.query.length,
    });
  };

  const insertMention = async (attachment: ChatAttachment) => {
    if (!mention) return;
    try {
      if (!attachment.isSelected) {
        await select.mutateAsync({ attachmentId: attachment.id, isSelected: true });
      }
      const replacement = `@${attachment.fileName} `;
      const nextValue = `${value.slice(0, mention.start)}${replacement}${value.slice(mention.end)}`;
      const nextCaret = mention.start + replacement.length;
      onChange(nextValue);
      setMention(null);
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(nextCaret, nextCaret);
      });
      log.info('Inserted a selected file mention into chat input', {
        userId: effectiveUserId,
        action: 'insert_chat_file_mention',
        parentId,
        attachmentId: attachment.id,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to mention this file');
      log.error('Failed to insert a selected file mention into chat input', {
        userId: effectiveUserId,
        action: 'insert_chat_file_mention',
        parentId,
        attachmentId: attachment.id,
        error,
      });
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
    refreshMention(event.target);
    log.debug('Changed chat input with file mention support', {
      userId: effectiveUserId,
      action: 'change_chat_input_with_file_mentions',
      parentId,
      inputLength: event.target.value.length,
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Backspace' && !event.nativeEvent.isComposing) {
      const selectionStart = event.currentTarget.selectionStart;
      const selectionEnd = event.currentTarget.selectionEnd;
      const rangeToRemove = mentionRanges.find((range) => {
        if (selectionStart !== selectionEnd) {
          return selectionStart < range.end && selectionEnd > range.start;
        }
        const directlyAfterMention = selectionStart === range.end
          || (selectionStart === range.end + 1 && value[range.end] === ' ');
        const insideMention = selectionStart > range.start && selectionStart < range.end;
        return directlyAfterMention || insideMention;
      });
      if (rangeToRemove) {
        event.preventDefault();
        void removeMention(rangeToRemove);
        log.info('Removed entire file mention with backspace', {
          userId: effectiveUserId,
          action: 'remove_chat_file_mention_with_backspace',
          parentId,
          attachmentId: rangeToRemove.attachment.id,
        });
        return;
      }
    }
    if (!mention) {
      onKeyDown(event);
      return;
    }
    const optionCount = suggestions.length + 1;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % optionCount);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + optionCount) % optionCount);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setMention(null);
    } else if (
      (event.key === 'Enter' || event.key === 'Tab')
      && activeIndex < suggestions.length
    ) {
      event.preventDefault();
      void insertMention(suggestions[activeIndex] ?? suggestions[0]);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      handleUploadClick();
    } else {
      onKeyDown(event);
    }
    log.debug('Handled chat file mention keyboard navigation', {
      userId: effectiveUserId,
      action: 'navigate_chat_file_mention_suggestions',
      parentId,
      key: event.key,
    });
  };

  const handleUploadClick = () => {
    if (upload.isPending || attachments.length >= 10) {
      log.warn('Skipped file upload from chat mention suggestions', {
        userId: effectiveUserId,
        action: 'open_chat_file_mention_upload',
        parentId,
        uploadPending: upload.isPending,
        attachmentCount: attachments.length,
      });
      return;
    }
    uploadInputRef.current?.click();
    log.debug('Opened file upload from chat mention suggestions', {
      userId: effectiveUserId,
      action: 'open_chat_file_mention_upload',
      parentId,
    });
  };

  const handleMentionUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const uploaded = await upload.mutateAsync([file]);
      const attachment = uploaded[0];
      if (attachment) await insertMention(attachment);
      toast.success(`${file.name} uploaded and mentioned`);
      log.info('Uploaded and inserted a file from chat mention suggestions', {
        userId: effectiveUserId,
        action: 'upload_chat_file_from_mention',
        parentId,
        attachmentId: attachment?.id,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to upload file');
      log.error('Failed to upload a file from chat mention suggestions', {
        userId: effectiveUserId,
        action: 'upload_chat_file_from_mention',
        parentId,
        error,
      });
    }
  };

  const handleScroll = (event: React.UIEvent<HTMLTextAreaElement>) => {
    if (overlayRef.current) {
      overlayRef.current.scrollTop = event.currentTarget.scrollTop;
      overlayRef.current.scrollLeft = event.currentTarget.scrollLeft;
    }
    if (mention) refreshMention(event.currentTarget);
    log.debug('Synchronized highlighted chat file mention scroll', {
      userId: effectiveUserId,
      action: 'scroll_chat_file_mention_textarea',
      parentId,
    });
  };

  const handleKeyUp = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const menuNavigationKeys = ['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'];
    if (!menuNavigationKeys.includes(event.key)) refreshMention(event.currentTarget);
    log.debug('Handled key release in chat file mention textarea', {
      userId: effectiveUserId,
      action: 'release_key_in_chat_file_mention_textarea',
      parentId,
      key: event.key,
    });
  };

  const handleClick = (event: React.MouseEvent<HTMLTextAreaElement>) => {
    refreshMention(event.currentTarget);
    log.debug('Handled click in chat file mention textarea', {
      userId: effectiveUserId,
      action: 'click_chat_file_mention_textarea',
      parentId,
    });
  };

  const popupLeft = mention && textareaRef.current
    ? Math.max(4, Math.min(mention.left, textareaRef.current.clientWidth - MENTION_MENU_WIDTH - 4))
    : 4;
  const popupBottom = mention && textareaRef.current
    ? Math.max(28, textareaRef.current.clientHeight - mention.top + 5)
    : 28;

  return (
    <div className="relative min-h-[64px] w-full">
      <input
        ref={uploadInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
        className="sr-only"
        onChange={(event) => void handleMentionUpload(event)}
      />
      {hasHighlightedMention && (
        <div
          ref={overlayRef}
          className="pointer-events-none absolute inset-0 z-20 min-h-[64px] max-h-[220px] overflow-hidden whitespace-pre-wrap break-words px-2.5 py-3 text-sm leading-5 text-foreground"
        >
          {highlightedContent.content}
          {'\u200b'}
        </div>
      )}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onKeyUp={handleKeyUp}
        onScroll={handleScroll}
        placeholder="Ask anything, @ to mention, / for workflows"
        spellCheck={false}
        disabled={disabled}
        className={cn(
          'custom-scrollbar relative z-10 min-h-[64px] max-h-[220px] w-full resize-none border-none bg-transparent px-2.5 py-3 text-sm leading-5 shadow-none placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0',
          hasHighlightedMention && 'text-transparent caret-foreground selection:bg-primary/30 selection:text-transparent',
        )}
        rows={1}
        aria-autocomplete="list"
        aria-controls={mention ? 'chat-file-mention-suggestions' : undefined}
        aria-expanded={Boolean(mention)}
      />

      {mention && (
        <div
          id="chat-file-mention-suggestions"
          role="listbox"
          aria-label="Chat files"
          className="absolute z-[120] w-52 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-xl"
          style={{ left: popupLeft, bottom: popupBottom }}
        >
          <div className="flex flex-col gap-1 text-sm">
            {suggestions.map((attachment, index) => {
              const Icon = attachment.mimeType.startsWith('image/') ? FileImage : FileText;
              return (
                <Button
                  key={attachment.id}
                  type="button"
                  variant="ghost"
                  size="sm"
                  role="option"
                  aria-selected={activeIndex === index}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void insertMention(attachment)}
                  className={cn(
                    'h-6 justify-start rounded-[7px] px-2 text-xs text-muted-foreground transition-colors duration-150 hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground',
                    activeIndex === index && 'bg-secondary text-foreground',
                  )}
                >
                  <Icon aria-hidden="true" className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{attachment.fileName}</span>
                </Button>
              );
            })}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              role="option"
              aria-selected={activeIndex === suggestions.length}
              disabled={upload.isPending || attachments.length >= 10}
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleUploadClick}
              className={cn(
                'h-6 justify-start rounded-[7px] px-2 text-xs text-muted-foreground transition-colors duration-150 hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground',
                activeIndex === suggestions.length && 'bg-secondary text-foreground',
              )}
            >
              {upload.isPending
                ? <Loader2 aria-hidden="true" className="mr-1.5 h-3.5 w-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
                : <Upload aria-hidden="true" className="mr-1.5 h-3.5 w-3.5 shrink-0" />}
              <span className="truncate">
                {attachments.length >= 10 ? 'File limit reached' : 'Upload a new file'}
              </span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
