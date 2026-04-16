import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, ChevronUp, Mic, ArrowRight, MessageSquare, Edit3, Loader2 } from 'lucide-react';
import { MessageType } from '@/types/script-chat';
import { AI_MODELS, AIModelName } from '@/types/ai-models';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { cn } from '@/lib/utils';

interface ChatInputProps {
    input: string;
    setInput: (value: string) => void;
    handleSend: () => void;
    isGenerating: boolean;
    mode: MessageType;
    setMode: (mode: MessageType) => void;
    selectedModel: AIModelName;
    setSelectedModel: (model: AIModelName) => void;
}

export function ChatInput({
    input,
    setInput,
    handleSend,
    isGenerating,
    mode,
    setMode,
    selectedModel,
    setSelectedModel
}: ChatInputProps) {
    const [modePopoverOpen, setModePopoverOpen] = React.useState(false);
    const [modelPopoverOpen, setModelPopoverOpen] = React.useState(false);

    const { isListening, toggleListening, isSupported } = useSpeechToText({
        onResult: (result) => {
            setInput(result);
        }
    });
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSend();
        }
    };

    const selectedModelConfig = Object.values(AI_MODELS).find(m => m.model === selectedModel) || AI_MODELS.GOOGLE_FLASH;

    return (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-10 pointer-events-none">
            <div className="pointer-events-auto rounded-2xl bg-[#2A2A2A]/40 dark:bg-[#1E1E1E] border border-border/50 shadow-sm transition-shadow flex flex-col p-1.5 backdrop-blur-md">
                <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything, @ to mention, / for workflows"
                    disabled={isGenerating}
                    className="w-full min-h-[56px] max-h-[200px] resize-none bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:ring-0 focus:ring-offset-0 focus:outline-none px-2.5 py-2.5 text-sm placeholder:text-muted-foreground/60 custom-scrollbar"
                    rows={1}
                />
                <div className="flex items-center justify-between px-1.5 pb-1">
                    <div className="flex items-center gap-1">
                        <Button disabled variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-white/10 text-muted-foreground">
                            <Plus className="h-3.5 w-3.5" />
                        </Button>

                        <Popover open={modePopoverOpen} onOpenChange={setModePopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 px-2 rounded-md hover:bg-white/10 text-xs font-medium text-muted-foreground hover:text-foreground group">
                                    <ChevronUp className="h-3 w-3 mr-1 opacity-50 group-hover:opacity-100" />
                                    {mode === 'ask' ? 'Ask' : 'Edit'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent side="top" align="start" className="w-28 p-1 z-[100]">
                                <div className="flex flex-col gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setMode('ask');
                                            setModePopoverOpen(false);
                                        }}
                                        className={`justify-start ${mode === 'ask' ? 'bg-secondary' : ''}`}
                                    >
                                        <MessageSquare className="h-3 w-3 mr-2" /> Ask
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setMode('edit');
                                            setModePopoverOpen(false);
                                        }}
                                        className={`justify-start ${mode === 'edit' ? 'bg-secondary' : ''}`}
                                    >
                                        <Edit3 className="h-3 w-3 mr-2" /> Edit
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>

                        <Popover open={modelPopoverOpen} onOpenChange={setModelPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 px-2 rounded-md hover:bg-white/10 text-xs font-medium text-muted-foreground hover:text-foreground group">
                                    <ChevronUp className="h-3 w-3 mr-1 opacity-50 group-hover:opacity-100" />
                                    {selectedModelConfig.name}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent side="top" align="start" className="w-56 p-1 z-[100]">
                                <div className="flex flex-col gap-1 text-sm">
                                    <p className="px-2 py-1.5 font-medium text-xs text-muted-foreground">Select Model</p>
                                    {Object.values(AI_MODELS).map((m) => (
                                        <Button
                                            key={m.model}
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedModel(m.model);
                                                setModelPopoverOpen(false);
                                            }}
                                            className={`justify-start text-xs h-7 ${selectedModel === m.model ? 'bg-secondary' : 'opacity-50 hover:opacity-100'}`}
                                        >
                                            {m.name}
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
                            className="h-6 w-6 rounded-full bg-[#1E1E1E] dark:bg-[#333333] hover:bg-[#333] text-foreground border border-border/50 transition-colors"
                            onClick={handleSend}
                            disabled={!input.trim() || isGenerating}
                        >
                            <ArrowRight className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
