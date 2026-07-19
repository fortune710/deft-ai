"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Plus, Send } from "lucide-react";
import { useAuth } from "@/hooks/use-clerk-auth";
import { logger } from "@/lib/logger";

import { useRef, useState } from "react";

const log = logger.child({ module: 'components/onboarding/chat-input' });

interface OnboardingChatInputProps {
    value?: string;
    onChange?: (val: string) => void;
    onSubmit?: () => void;
}

export default function OnboardingChatInput({ value, onChange, onSubmit }: OnboardingChatInputProps = {}) {
    const { userId } = useAuth();
    const [internalInput, setInternalInput] = useState("");
    const input = value !== undefined ? value : internalInput;
    const setInput = onChange || setInternalInput;

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e?: React.FormEvent) => {
        log.debug('Submitting onboarding niche prompt', {
            userId: userId || 'signed_out',
            action: 'submit_onboarding_niche_prompt',
            hasInput: Boolean(input.trim()),
        });
        if (e) e.preventDefault();
        if (input.trim()) {
            if (onSubmit) onSubmit();
        }
    };

    return (
        <div className="w-full">
            <div className="overflow-hidden rounded-3xl border border-border/70 bg-background/85 shadow-[0_18px_60px_-36px_hsl(var(--foreground)/0.45)] transition-[border-color,box-shadow] duration-200 focus-within:border-primary/70 focus-within:ring-3 focus-within:ring-ring/20">
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                        log.info('Selected onboarding context files', {
                            userId: userId || 'signed_out',
                            action: 'select_onboarding_context_files',
                            fileCount: event.target.files?.length || 0,
                        });
                    }}
                />

                <div className="px-5 pt-5 pb-3 grow">
                    <form onSubmit={handleSubmit}>
                        <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="eg. Finance for Gen Z, Mental Health for Entrepreneurs, etc."
                            className="w-full bg-transparent p-0 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder-muted-foreground resize-none outline-none text-base md:text-lg min-h-[70px] max-h-[40vh]"
                            rows={1}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = "auto";
                                target.style.height = target.scrollHeight + "px";
                            }}
                        />
                    </form>
                </div>

                <div className="mb-3 px-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Add context"
                                    className="h-10 w-10 p-0 rounded-full border border-border hover:bg-muted/50 transition-colors"
                                >
                                    <Plus className="h-5 w-5 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                                align="start"
                                className="max-w-xs rounded-lg p-1.5"
                            >
                                <DropdownMenuLabel className="text-xs font-semibold gap-2">Add Context</DropdownMenuLabel>
                                <DropdownMenuGroup className="space-y-1">
                                    <DropdownMenuItem
                                        className="rounded-[calc(1rem-6px)] text-xs font-semibold gap-2"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Paperclip className="w-4 h-4 opacity-60" />
                                        Attach Files
                                    </DropdownMenuItem>
                                    {/* <DropdownMenuItem
                    className="rounded-[calc(1rem-6px)] text-xs"
                    onClick={() => {}}
                  >
                    <IconCode size={16} className="opacity-60" />
                    Code Interpreter
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-[calc(1rem-6px)] text-xs"
                    onClick={() => {}}
                  >
                    <IconWorld size={16} className="opacity-60" />
                    Web Search
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-[calc(1rem-6px)] text-xs"
                    onClick={() => {}}
                  >
                    <IconHistory size={16} className="opacity-60" />
                    Chat History
                  </DropdownMenuItem> */}
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAutoMode(!autoMode)}
                            className={cn(
                                "h-10 px-4 rounded-full border border-border hover:bg-muted/50 transition-colors gap-2",
                                {
                                    "bg-primary/10 text-primary border-primary/30": autoMode,
                                    "text-muted-foreground": !autoMode,
                                }
                            )}
                        >
                            <Wand className="h-4 w-4" />
                            <span className="text-sm font-medium">Auto</span>
                        </Button> */}
                    </div>

                    <div>
                        <Button
                            type="submit"
                            disabled={!input.trim()}
                            aria-label="Submit niche idea"
                            className="h-10 w-10 rounded-full bg-primary p-0 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={handleSubmit}
                        >
                            <Send className="h-5 w-5 text-primary-foreground" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
