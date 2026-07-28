import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowUp, ChevronDown, Mic } from 'lucide-react';
import { MessageType } from '@/types/script-chat';
import { AI_MODELS, AIModelName } from '@/types/ai-models';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/use-clerk-auth';
import { ChatLine } from '@/components/icons/ask';
import { EditLine } from '@/components/icons/edit';
import { Brain as BrainIcon } from '@/components/icons/brain';
import type { ChatAttachment } from '@/types/chat-attachments';
import { AttachmentPicker, AttachmentTray } from './attachment-picker';
import { FileMentionTextarea } from './file-mention-textarea';

const log = logger.child({ module: 'components/editor/chat-input' });

interface ChatInputProps {
    input: string;
    setInput: (value: string) => void;
    handleSend: () => void;
    isGenerating: boolean;
    mode: MessageType;
    setMode: (mode: MessageType) => void;
    selectedModel: AIModelName;
    setSelectedModel: (model: AIModelName) => void;
    parentId: string;
    attachments: ChatAttachment[];
    hasBlockingAttachments: boolean;
}

export function ChatInput({
    input,
    setInput,
    handleSend,
    isGenerating,
    mode,
    setMode,
    selectedModel,
    setSelectedModel,
    parentId,
    attachments,
    hasBlockingAttachments,
}: ChatInputProps) {
    const { userId } = useAuth();
    const [modePopoverOpen, setModePopoverOpen] = React.useState(false);
    const [modelPopoverOpen, setModelPopoverOpen] = React.useState(false);

    log.debug('Rendering script chat input', {
        userId: userId || 'signed_out',
        action: 'render_script_chat_input',
        mode,
        selectedModel,
        isGenerating,
    });

    const { isListening, toggleListening, isSupported } = useSpeechToText({
        onResult: (result) => {
            setInput(result);
        }
    });
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;

        e.preventDefault();
        if (!input.trim() || isGenerating || hasBlockingAttachments) return;

        log.info('Submitting script chat input from keyboard', {
            userId: userId || 'signed_out',
            action: 'submit_script_chat_input',
            mode,
            selectedModel,
        });
        handleSend();
    };

    const handleModeSelect = (nextMode: MessageType) => {
        log.info('Changing script chat mode', {
            userId: userId || 'signed_out',
            action: 'change_script_chat_mode',
            mode: nextMode,
        });
        setMode(nextMode);
        setModePopoverOpen(false);
    };

    const handleModelSelect = (model: AIModelName) => {
        log.info('Changing script chat model', {
            userId: userId || 'signed_out',
            action: 'change_script_chat_model',
            model,
        });
        setSelectedModel(model);
        setModelPopoverOpen(false);
    };

    const selectedModelConfig = Object.values(AI_MODELS).find(m => m.model === selectedModel) || AI_MODELS.GOOGLE_FLASH;
    const SelectedModeIcon = mode === 'ask' ? ChatLine : EditLine;
    const canSubmit = Boolean(input.trim()) && !isGenerating && !hasBlockingAttachments;

    return (
        <div className="pointer-events-none relative shrink-0 bg-gradient-to-t from-background via-background to-transparent px-4 pb-4 pt-2">
            <div className="pointer-events-auto relative flex flex-col items-center">
                <AttachmentTray attachments={attachments} />
                <div className="relative z-10 -mt-px flex w-full flex-col rounded-2xl border border-border/50 bg-[#2A2A2A]/40 p-1.5 shadow-sm backdrop-blur-md transition-shadow dark:bg-[#1E1E1E]">
                    <FileMentionTextarea
                        value={input}
                        onChange={setInput}
                        onKeyDown={handleKeyDown}
                        disabled={isGenerating}
                        parentId={parentId}
                        attachments={attachments}
                    />
                    <div className="flex items-center justify-between px-1 pb-0.5">
                        <div className="flex min-w-0 items-center gap-0.5">
                            <AttachmentPicker
                                parentId={parentId}
                                attachments={attachments}
                                disabled={isGenerating}
                            />

                            <Popover open={modePopoverOpen} onOpenChange={setModePopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 gap-1.5 rounded-xl px-2 text-xs font-medium text-muted-foreground transition-[border-radius,background-color,color] hover:bg-muted hover:text-foreground"
                                    >
                                        <SelectedModeIcon
                                            aria-hidden="true"
                                            className="h-3.5 w-3.5 shrink-0"
                                        />
                                        <span>{mode === 'ask' ? 'Ask' : 'Edit'}</span>
                                        <ChevronDown className="ml-0.5 h-3 w-3 opacity-60" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    side="top"
                                    align="start"
                                    className="z-[100] w-28 rounded-lg p-0.5"
                                >
                                    <div className="flex flex-col gap-0.5">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleModeSelect('ask')}
                                            aria-pressed={mode === 'ask'}
                                            className={`h-7 justify-start rounded-md px-1.5 text-xs ${mode === 'ask' ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
                                        >
                                            <ChatLine
                                                aria-hidden="true"
                                                className="mr-1.5 h-3 w-3 shrink-0"
                                            />
                                            Ask
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleModeSelect('edit')}
                                            aria-pressed={mode === 'edit'}
                                            className={`h-7 justify-start rounded-md px-1.5 text-xs ${mode === 'edit' ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
                                        >
                                            <EditLine
                                                aria-hidden="true"
                                                className="mr-1.5 h-3 w-3 shrink-0"
                                            />
                                            Edit
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Popover open={modelPopoverOpen} onOpenChange={setModelPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 min-w-0 gap-1.5 rounded-xl px-2 text-xs font-medium text-muted-foreground transition-[border-radius,background-color,color] hover:bg-muted hover:text-foreground"
                                    >
                                        {React.createElement(selectedModelConfig.icon, {
                                            'aria-hidden': true,
                                            className: 'h-3.5 w-3.5 shrink-0',
                                        })}
                                        <span className="truncate">
                                            {selectedModelConfig.name}
                                        </span>
                                        <ChevronDown className="ml-0.5 h-3 w-3 shrink-0 opacity-60" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    side="top"
                                    align="end"
                                    className="z-[100] w-48 rounded-lg p-0.5"
                                >
                                    <div className="flex flex-col gap-0.5">
                                        {Object.values(AI_MODELS).map((model) => (
                                            <Button
                                                key={model.model}
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleModelSelect(model.model)}
                                                aria-pressed={selectedModel === model.model}
                                                className={`h-7 justify-start rounded-md px-1.5 text-xs ${selectedModel === model.model ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
                                            >
                                                {React.createElement(model.icon, {
                                                    'aria-hidden': true,
                                                    className: 'mr-1.5 h-3 w-3 shrink-0',
                                                })}
                                                {model.name}
                                                {model.isReasoningModel && (
                                                    <BrainIcon
                                                        aria-hidden="true"
                                                        className="ml-auto h-2.5 w-2.5"
                                                    />
                                                )}
                                            </Button>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                            {isSupported && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={toggleListening}
                                    className={cn(
                                        'h-8 w-8 rounded-full transition-all',
                                        isListening
                                            ? 'animate-pulse bg-red-500/20 text-red-500'
                                            : 'text-muted-foreground hover:bg-white/10',
                                    )}
                                >
                                    <Mic className="h-4 w-4" />
                                </Button>
                            )}
                            <Button
                                size="icon"
                                className={cn(
                                    'h-[34px] w-[34px] rounded-full border transition-colors disabled:opacity-100',
                                    canSubmit
                                        ? 'border-white/70 bg-[#F1F1EF] text-[#171717] hover:bg-white'
                                        : 'border-border/50 bg-[#1E1E1E] text-muted-foreground dark:bg-[#333333]',
                                )}
                                onClick={handleSend}
                                disabled={!canSubmit}
                                title={hasBlockingAttachments ? 'Wait for selected files to finish scanning or deselect them' : undefined}
                            >
                                <ArrowUp className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
