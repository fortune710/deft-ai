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
    ChevronRight
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import OnboardingChatInput from '../chat-input';
import { NicheAgentQuestion, NicheAgentReasoningStep, NicheAgentStreamEvent } from '@/types/niche-agent';

interface Step1ChatAgentProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
}

export function Step1ChatAgent({ value, onChange, error }: Step1ChatAgentProps) {
    const [inputValue, setInputValue] = useState(value);
    const [threadId, setThreadId] = useState<string | null>(null);
    const [reasoningSteps, setReasoningSteps] = useState<NicheAgentReasoningStep[]>([]);
    const [currentQuestionSet, setCurrentQuestionSet] = useState<NicheAgentQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [individualAnswer, setIndividualAnswer] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const [finalResult, setFinalResult] = useState<string | null>(null);

    const [flowState, setFlowState] = useState<'initial' | 'reasoning' | 'questions' | 'done'>('initial');
    const [isStreaming, setIsStreaming] = useState(false);

    const handleStream = async (body: any) => {
        setIsStreaming(true);
        setReasoningSteps([]); // Clear old steps on new interaction
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

            const decoder = new TextEncoder().encode('').constructor === Uint8Array
                ? new TextDecoder()
                : null; // fallback for older environments if needed

            const realDecoder = new TextDecoder();

            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += realDecoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        const type = line.replace('event: ', '').trim();
                        const nextLine = lines[lines.indexOf(line) + 1] || '';
                        if (nextLine.startsWith('data: ')) {
                            const data = JSON.parse(nextLine.replace('data: ', '').trim());
                            handleAgentEvent(type as any, data);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Streaming error:', err);
        } finally {
            setIsStreaming(false);
        }
    };

    const handleAgentEvent = (type: NicheAgentStreamEvent['type'], data: any) => {
        switch (type) {
            case 'reasoning_step':
                setReasoningSteps(prev => [...prev, data]);
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
                setFlowState('done');
                break;
            case 'error':
                console.error('Agent error event:', data.message);
                break;
        }
    };

    const handleInitialSubmit = () => {
        if (!inputValue.trim()) return;
        handleStream({ action: 'start', niche: inputValue });
    };

    const handleAnswerSelect = (questionId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));

        // If not the last question in the set, move to next
        if (currentQuestionIndex < currentQuestionSet.length - 1) {
            setTimeout(() => {
                setCurrentQuestionIndex(prev => prev + 1);
                setIndividualAnswer('');
            }, 300);
        }
    };

    const handleResume = () => {
        handleStream({
            action: 'resume',
            threadId,
            answers
        });
        setAnswers({}); // Clear for next round
    };

    const handleFinish = () => {
        if (finalResult) {
            onChange(finalResult);
        }
    };

    const currentQuestion = currentQuestionSet[currentQuestionIndex];

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
                                <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                                    Let's define your niche
                                </h2>
                            </div>
                            <div className="space-y-4">
                                <p className="text-sm md:text-base text-muted-foreground">
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

                    {flowState === 'reasoning' && (
                        <motion.div
                            key="reasoning"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
                            className="w-full max-w-xl mx-auto space-y-10"
                        >
                            <div className="space-y-3 px-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-primary/60 uppercase tracking-widest font-mono">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    Current Niche Idea
                                </div>
                                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 shadow-sm">
                                    <p className="text-base text-foreground font-medium italic opacity-90 leading-relaxed">
                                        "{inputValue}"
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6 relative px-2">
                                <div className="absolute left-6 top-3 bottom-0 w-[1px] bg-border/40 -z-10" />
                                <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground/60 uppercase tracking-widest font-mono mb-8">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Agent Reasoning...
                                </div>

                                <div className="space-y-8">
                                    {reasoningSteps.map((step, i) => (
                                        <motion.div
                                            key={step.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="flex items-start gap-5 relative"
                                        >
                                            <div className="relative pt-1">
                                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1 pt-1.5 flex-1">
                                                <p className="text-sm font-medium text-foreground">
                                                    {step.content}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                    {isStreaming && (
                                        <div className="flex items-center gap-4 animate-pulse">
                                            <div className="w-8 h-8 rounded-full bg-muted border-2 border-primary/20 flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                            </div>
                                            <div className="h-4 w-48 bg-muted rounded-full" />
                                        </div>
                                    )}
                                </div>
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
                            <div className="border border-border/40 rounded-2xl bg-background/50 backdrop-blur-sm p-5 md:p-6 shadow-sm">
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
                                                    onClick={() => handleAnswerSelect(currentQuestion.id, option.value)}
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
                                            <div className="mt-4 pt-4 border-t border-border/40">
                                                <p className="text-xs font-medium text-muted-foreground mb-2">Or specify your own:</p>
                                                <div className="flex gap-2">
                                                    <Textarea
                                                        value={individualAnswer}
                                                        onChange={(e) => setIndividualAnswer(e.target.value)}
                                                        placeholder="Your custom answer..."
                                                        className="resize-none h-20 text-sm"
                                                    />
                                                    <Button
                                                        size="icon"
                                                        className="shrink-0"
                                                        onClick={() => handleAnswerSelect(currentQuestion.id, individualAnswer)}
                                                        disabled={!individualAnswer.trim()}
                                                    >
                                                        <Send className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {currentQuestionIndex === currentQuestionSet.length - 1 && answers[currentQuestion.id] && (
                                        <div className="flex justify-end pt-4">
                                            <Button onClick={handleResume} className="gap-2 rounded-xl">
                                                Continue Reasoning
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {flowState === 'done' && (
                        <motion.div
                            key="done"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full max-w-2xl mx-auto space-y-6"
                        >
                            <div className="text-center space-y-4">
                                <div className="inline-flex p-3 rounded-full bg-green-500/10 text-green-500 mb-2">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-bold text-foreground">Strategic Niche Defined!</h3>
                                <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 text-left">
                                    <p className="text-lg text-foreground leading-relaxed font-medium">
                                        {finalResult}
                                    </p>
                                </div>
                                <Button size="lg" onClick={handleFinish} className="rounded-2xl px-12 h-14 text-lg font-bold shadow-xl shadow-primary/20">
                                    Continue to Step 2
                                    <ChevronRight className="w-5 h-5 ml-2" />
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
