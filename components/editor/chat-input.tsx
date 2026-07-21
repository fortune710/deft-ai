import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowUp, ChevronUp, Mic } from 'lucide-react';
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
    const canSubmit = Boolean(input.trim()) && !isGenerating && !hasBlockingAttachments;

    return (
        <div className="relative shrink-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-10 pointer-events-none">
            <div className="pointer-events-auto relative flex flex-col items-center">
                <AttachmentTray attachments={attachments} />
                <div className="relative z-10 -mt-px flex w-full flex-col rounded-2xl border border-border/50 bg-[#2A2A2A]/40 p-1.5 shadow-sm backdrop-blur-md transition-shadow dark:bg-[#1E1E1E]">
                    <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything, @ to mention, / for workflows"
                    disabled={isGenerating}
                    className="custom-scrollbar min-h-[64px] max-h-[220px] w-full resize-none border-none bg-transparent px-2.5 py-3 text-sm shadow-none placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    rows={1}
                    />
                    <div className="flex items-center justify-between px-1.5 pb-1">
                    <div className="flex items-center gap-1">
                        <AttachmentPicker parentId={parentId} attachments={attachments} disabled={isGenerating} />

                        <Popover open={modePopoverOpen} onOpenChange={setModePopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 px-2 rounded-md hover:bg-white/10 text-xs font-medium text-muted-foreground hover:text-foreground group">
                                    <ChevronUp className="h-3 w-3 mr-1 opacity-50 group-hover:opacity-100" />
                                    {mode === 'ask' ? 'Ask' : 'Edit'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent side="top" align="start" className="z-[100] w-28 rounded-xl p-1">
                                <div className="flex flex-col gap-1 text-sm">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleModeSelect('ask')}
                                        aria-pressed={mode === 'ask'}
                                        className={`h-6 justify-start rounded-[7px] px-2 text-xs transition-colors duration-150 hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground ${mode === 'ask' ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
                                    >
                                        <ChatLine aria-hidden="true" className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                                        Ask
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleModeSelect('edit')}
                                        aria-pressed={mode === 'edit'}
                                        className={`h-6 justify-start rounded-[7px] px-2 text-xs transition-colors duration-150 hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground ${mode === 'edit' ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
                                    >
                                        <EditLine aria-hidden="true" className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                                        Edit
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>

                        <Popover open={modelPopoverOpen} onOpenChange={setModelPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground group">
                                    <ChevronUp className="h-3 w-3 mr-1 opacity-50 group-hover:opacity-100" />
                                    {selectedModelConfig.name}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent side="top" align="start" className="z-[100] w-52 rounded-xl p-1">
                                <div className="flex flex-col gap-1 text-sm">
                                    {Object.values(AI_MODELS).map((m) => (
                                        <Button
                                            key={m.model}
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleModelSelect(m.model)}
                                            aria-pressed={selectedModel === m.model}
                                            className={`h-6 justify-start rounded-[7px] px-2 text-xs transition-colors duration-150 hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground ${selectedModel === m.model ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
                                        >
                                            {React.createElement(m.icon, {
                                                'aria-hidden': true,
                                                className: 'mr-1.5 h-3.5 w-3.5 shrink-0',
                                            })}
                                            {m.name}
                                            {m.isReasoningModel && (
                                                <>
                                                    <BrainIcon aria-hidden="true" className="ml-auto h-3 w-3 shrink-0" />
                                                    <span className="sr-only">Reasoning model</span>
                                                </>
                                            )}
                                        </Button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {isSupported && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleListening}
                                className={cn(
                                    "h-6 w-6 rounded-full transition-all",
                                    isListening ? "bg-red-500/20 text-red-500 animate-pulse" : "hover:bg-white/10 text-muted-foreground"
                                )}
                            >
                                <Mic className={cn("h-3.5 w-3.5")} />
                            </Button>
                        )}
                        <Button
                            size="icon"
                            className={cn(
                                'h-6 w-6 rounded-full border transition-colors disabled:opacity-100',
                                canSubmit
                                    ? 'border-white/70 bg-[#F1F1EF] text-[#171717] hover:bg-white'
                                    : 'border-border/50 bg-[#1E1E1E] text-muted-foreground dark:bg-[#333333]',
                            )}
                            onClick={handleSend}
                            disabled={!canSubmit}
                            title={hasBlockingAttachments ? 'Wait for selected files to finish scanning or deselect them' : undefined}
                        >
                            <ArrowUp className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
}
