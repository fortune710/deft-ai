'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot,
    Send,
    Loader2,
    Sparkles,
    Terminal,
    Cpu,
    HelpCircle,
    CheckCircle2,
    ChevronRight,
    FileText,
    ArrowRight
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import OnboardingChatInput from '../chat-input';
import { DetailedNiche, NicheAgentQuestion, NicheAgentReasoningStep, NicheAgentStreamEvent } from '@/types/niche-agent';
import { useIsMobile } from '@/hooks/use-mobile';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'components/onboarding/steps/step-1-chat-agent' });

interface Step1ChatAgentProps {
    value: DetailedNiche | null;
    onChange: (value: DetailedNiche) => void;
    error?: string;
}

export function Step1ChatAgent({ value, onChange, error }: Step1ChatAgentProps) {
    const isMobile = useIsMobile();
    const [inputValue, setInputValue] = useState(value?.niche || '');
    const [threadId, setThreadId] = useState<string | null>(null);
    const [reasoningSteps, setReasoningSteps] = useState<NicheAgentReasoningStep[]>([]);
    const [currentQuestionSet, setCurrentQuestionSet] = useState<NicheAgentQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [individualAnswer, setIndividualAnswer] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const [finalResult, setFinalResult] = useState<DetailedNiche | null>(null);
    const [isResultOpen, setIsResultOpen] = useState(false);

    const [flowState, setFlowState] = useState<'initial' | 'reasoning' | 'questions' | 'done'>('initial');
    const [isStreaming, setIsStreaming] = useState(false);

    const handleStream = async (body: any) => {
        log.debug('Starting onboarding agent stream', {
            userId: 'resolved_by_clerk',
            action: 'stream_niche_agent',
            agentAction: body.action,
        });
        setIsStreaming(true);
        // Don't clear reasoning steps if we're resuming, but clear on start
        if (body.action === 'start') {
            setReasoningSteps([]);
        }
        setFlowState('reasoning');

        try {
            const response = await fetch('/api/onboarding/niche-agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) throw new Error('Failed to connect to agent');

            const reader = response.body?.getReader();
            if (!reader) return;

            const realDecoder = new TextDecoder();

            let buffer = '';
            let currentType: string | null = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += realDecoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine) continue;

                    if (trimmedLine.startsWith('event: ')) {
                        currentType = trimmedLine.replace('event: ', '').trim();
                    } else if (trimmedLine.startsWith('data: ') && currentType) {
                        try {
                            const data = JSON.parse(trimmedLine.replace('data: ', '').trim());
                            handleAgentEvent(currentType as any, data);
                            currentType = null; // Reset for next event
                        } catch (e) {
                            log.error('Failed to parse niche agent event', {
                                userId: 'resolved_by_clerk',
                                action: 'parse_niche_agent_event',
                                error: e,
                                eventLine: trimmedLine,
                            });
                        }
                    }
                }
            }
        } catch (err) {
            log.error('Niche agent stream failed', {
                userId: 'resolved_by_clerk',
                action: 'stream_niche_agent',
                error: err,
                message: err instanceof Error ? err.message : String(err),
            });
        } finally {
            setIsStreaming(false);
        }
    };

    const handleAgentEvent = (type: NicheAgentStreamEvent['type'], data: any) => {
        switch (type) {
            case 'reasoning_step':
                setReasoningSteps(prev => [...prev.filter(s => s.id !== data.id && s.id !== 'final_result'), data]);
                break;
            case 'questions':
                setThreadId(data.threadId);
                setCurrentQuestionSet(data.questions);
                setCurrentQuestionIndex(0);
                setFlowState('questions');
                break;
            case 'final_result':
                setFinalResult(data.detailedNiche);
                setIsComplete(true);
                // Instead of switching to 'done', we append a special step to reasoning
                setReasoningSteps(prev => [
                    ...prev,
                    { content: 'Detailed Niche Determined', id: 'final_result' }
                ]);
                break;
            case 'error':
                log.error('Niche agent returned an error event', {
                    userId: 'resolved_by_clerk',
                    action: 'handle_niche_agent_error',
                    message: data.message,
                });
                break;
        }
    };

    const handleInitialSubmit = () => {
        if (!inputValue.trim()) return;
        handleStream({ action: 'start', niche: inputValue });
    };

    const handleAnswerSelect = (questionId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleContinueQuestion = () => {
        if (!currentQuestion) return;

        const currentAnswer = answers[currentQuestion.id];
        if (!currentAnswer && !individualAnswer.trim()) return;

        // Final answer might be the custom one
        const finalAnswer = (currentAnswer === 'custom' || !currentAnswer) ? individualAnswer : currentAnswer;
        const updatedAnswers = { ...answers, [currentQuestion.id]: finalAnswer };

        if (currentQuestionIndex < currentQuestionSet.length - 1) {
            setAnswers(updatedAnswers);
            setCurrentQuestionIndex(prev => prev + 1);
            setIndividualAnswer('');
        } else {
            // Last question - resume graph
            handleStream({
                action: 'resume',
                threadId,
                answers: updatedAnswers
            });
            setAnswers({});
            setIndividualAnswer('');
        }
    };

    const handleFinish = () => {
        if (finalResult) {
            onChange(finalResult);
        }
    };

    const currentQuestion = currentQuestionSet[currentQuestionIndex];
    const currentAnswer = answers[currentQuestion?.id];
    const hasAnswer = currentAnswer === 'custom'
        ? individualAnswer.trim().length > 0
        : !!currentAnswer;

    const renderMarkdown = () => {
        if (!finalResult) return null;
        return (
            <div className="space-y-6 pt-4 pb-8 px-2 overflow-y-auto max-h-[60vh]">
                <div>
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 font-lexend-deca">Niche</h4>
                    <p className="text-foreground text-lg font-medium">{finalResult.niche}</p>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 font-lexend-deca">Sub-Niche</h4>
                    <p className="text-foreground text-base">{finalResult.subNiche}</p>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 font-lexend-deca">Target Audience</h4>
                    <p className="text-foreground text-base">{finalResult.targetAudience}</p>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 font-lexend-deca">Content Pillars</h4>
                    <ul className="list-disc pl-5 space-y-1">
                        {finalResult.contentPillars.map((pillar, idx) => (
                            <li key={idx} className="text-foreground text-base">{pillar}</li>
                        ))}
                    </ul>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 font-lexend-deca">Tone</h4>
                        <p className="text-foreground text-base capitalize">{finalResult.tone}</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 font-lexend-deca">Current Affairs</h4>
                        <p className="text-foreground text-base capitalize">{finalResult.doesCurrentAffairs}</p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full w-full max-w-4xl mx-auto relative px-4 pb-12">
            <div className="flex-1 flex flex-col items-center justify-center min-h-[500px]">
                <AnimatePresence mode="wait">
                    {flowState === 'initial' && (
                        <motion.div
                            key="initial"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
                            className="w-full max-w-2xl mx-auto flex flex-col space-y-4"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground font-lexend-deca">
                                    Let's define your niche
                                </h2>
                            </div>
                            <div className="space-y-4">
                                <p className="text-sm md:text-base text-muted-foreground font-alan-sans">
                                    Type what you want to create content about. The more detail you give, the more targeted your strategy will be.
                                </p>
                            </div>

                            <OnboardingChatInput
                                value={inputValue}
                                onChange={setInputValue}
                                onSubmit={handleInitialSubmit}
                            />
                        </motion.div>
                    )}

                    {(flowState === 'reasoning' || flowState === 'done') && (
                        <motion.div
                            key="reasoning"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
                            className="w-full max-w-xl mx-auto space-y-10"
                        >
                            <div className="space-y-3 px-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-primary/60 uppercase tracking-widest font-lexend-deca">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    Current Niche Idea
                                </div>
                                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 shadow-sm">
                                    <p className="text-base text-foreground font-medium italic opacity-90 leading-relaxed whitespace-pre-wrap break-words font-alan-sans">
                                        "{inputValue}"
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6 relative px-2">
                                <div className="absolute left-6 top-3 bottom-0 w-[1px] bg-border/40 -z-10" />
                                <div className="flex items-center gap-5 text-xs font-bold text-muted-foreground/60 uppercase tracking-widest font-lexend-deca mb-8">
                                    <div className="flex w-8 shrink-0 items-center justify-center">
                                        {isStreaming ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <div className="w-3.5 h-3.5 rounded-full bg-muted-foreground/20" />
                                        )}
                                    </div>
                                    Determining Your Niche
                                </div>

                                <div className="space-y-8">
                                    {reasoningSteps.map((step, i) => {
                                        const isFinal = step.id === 'final_result';

                                        return (
                                            <motion.div
                                                key={step.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="flex items-start gap-5 relative group"
                                            >
                                                <div className="relative pt-1/2">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-full flex items-center justify-center shadow-md",
                                                        isFinal ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                                                    )}>
                                                        {isFinal ? <FileText className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1 pt-1.5 flex-1">
                                                    {isFinal ? (
                                                        <button
                                                            onClick={() => setIsResultOpen(true)}
                                                            className="text-sm font-bold text-primary hover:underline flex items-center gap-2 text-left font-lexend-deca"
                                                        >
                                                            {step.content}
                                                            <ArrowRight className="w-3.5 h-3.5" />
                                                        </button>
                                                    ) : (
                                                        <p className="text-sm font-medium text-foreground font-alan-sans">
                                                            {step.content}
                                                        </p>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                    {isStreaming && (
                                        <div className="flex items-center gap-4 animate-pulse">
                                            <div className="w-8 h-8 rounded-full bg-muted border-2 border-primary/20 flex items-center justify-center font-bold">
                                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                            </div>
                                            <div className="h-4 w-48 bg-muted rounded-full font-alan-sans" />
                                        </div>
                                    )}
                                </div>

                                {isComplete && !isStreaming && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="pt-10 flex justify-center"
                                    >
                                        <Button
                                            size="lg"
                                            onClick={handleFinish}
                                            className="rounded-2xl px-12 h-14 text-lg font-bold shadow-xl shadow-primary/20 group font-lexend-deca"
                                        >
                                            Continue to Step 2
                                            <ChevronRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                                        </Button>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {flowState === 'questions' && currentQuestion && (
                        <motion.div
                            key="question"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full max-w-xl mx-auto mt-4"
                        >
                            <div className="border border-border/40 rounded-2xl bg-background/50 backdrop-blur-sm p-5 md:p-6 shadow-sm font-alan-sans">
                                <div className="flex items-center gap-2 text-muted-foreground mb-6 text-sm font-medium">
                                    <HelpCircle className="w-4 h-4" />
                                    <span>Questions</span>
                                    <div className="ml-auto text-xs opacity-60 font-mono tracking-tight">
                                        {currentQuestionIndex + 1} / {currentQuestionSet.length}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm md:text-base font-semibold text-foreground leading-snug">
                                        {currentQuestion.content}
                                    </h3>

                                    <div className="space-y-1.5 pb-2">
                                        {currentQuestion.options.map((option, idx) => {
                                            const letter = String.fromCharCode(65 + idx);
                                            const isSelected = answers[currentQuestion.id] === option.value;

                                            return (
                                                <button
                                                    key={option.value}
                                                    onClick={() => {
                                                        handleAnswerSelect(currentQuestion.id, option.value);
                                                        setIndividualAnswer(''); // Clear custom if picking preset
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all",
                                                        isSelected ? "bg-primary/5 border-primary shadow-sm" : "bg-transparent border-transparent hover:bg-muted/30"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-5 h-5 shrink-0 flex items-center justify-center rounded text-[10px] font-bold",
                                                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                                    )}>
                                                        {letter}
                                                    </div>
                                                    <span className={cn("text-[13px]", isSelected ? "text-foreground font-medium" : "text-muted-foreground")}>
                                                        {option.label}
                                                    </span>
                                                </button>
                                            );
                                        })}

                                        {currentQuestion.allowCustom && (
                                            <div
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all mt-1",
                                                    (answers[currentQuestion.id] === 'custom' || individualAnswer) ? "bg-primary/5 border-primary shadow-sm" : "bg-transparent border-transparent hover:bg-muted/30"
                                                )}
                                                onClick={() => {
                                                    handleAnswerSelect(currentQuestion.id, 'custom');
                                                }}
                                            >
                                                <div className={cn(
                                                    "w-5 h-5 shrink-0 flex items-center justify-center rounded text-[10px] font-bold",
                                                    (answers[currentQuestion.id] === 'custom' || individualAnswer) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                                )}>
                                                    {String.fromCharCode(65 + currentQuestion.options.length)}
                                                </div>
                                                <div className="flex-1">
                                                    <Textarea
                                                        value={individualAnswer}
                                                        onChange={(e) => {
                                                            setIndividualAnswer(e.target.value);
                                                            handleAnswerSelect(currentQuestion.id, 'custom');
                                                        }}
                                                        placeholder="Specify your own answer..."
                                                        className="resize-none h-auto min-h-5 text-[13px] leading-5 bg-transparent !border-0 p-0 outline-none !ring-0 ring-offset-0 focus:border-0 focus:outline-none focus:!ring-0 focus:ring-offset-0 focus-visible:border-0 focus-visible:outline-none focus-visible:!ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 !shadow-none overflow-hidden"
                                                        rows={1}
                                                        onInput={(e) => {
                                                            const target = e.target as HTMLTextAreaElement;
                                                            target.style.height = 'auto';
                                                            target.style.height = `${target.scrollHeight}px`;
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end pt-3">
                                        <Button
                                            onClick={handleContinueQuestion}
                                            disabled={!hasAnswer}
                                            className="gap-1.5 items-center rounded-xl px-3.5 h-9 shadow-sm"
                                        >
                                            Continue
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Responsive Result Viewer */}
            {isMobile ? (
                <Drawer open={isResultOpen} onOpenChange={setIsResultOpen}>
                    <DrawerContent className="px-4 pb-12">
                        <DrawerHeader>
                            <DrawerTitle className="flex items-center gap-2 font-lexend-deca">
                                <FileText className="w-5 h-5 text-primary" />
                                Detailed Niche Analysis
                            </DrawerTitle>
                            <DrawerDescription className="font-alan-sans">
                                Your fleshed out content strategy and niche definition.
                            </DrawerDescription>
                        </DrawerHeader>
                        <div className="font-alan-sans px-4">
                            {renderMarkdown()}
                        </div>
                        <DrawerFooter className="pt-2">
                            <DrawerClose asChild>
                                <Button variant="outline" className="font-lexend-deca">Close</Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>
            ) : (
                <Dialog open={isResultOpen} onOpenChange={setIsResultOpen}>
                    <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 font-lexend-deca">
                                <FileText className="w-5 h-5 text-primary" />
                                Detailed Niche Analysis
                            </DialogTitle>
                            <DialogDescription className="font-alan-sans">
                                Your strategic niche definition created by the agent.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="font-alan-sans">
                            {renderMarkdown()}
                        </div>
                    </DialogContent>
                </Dialog>
            )}

        </div>
    );
}
