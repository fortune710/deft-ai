export interface NicheAgentOption {
    label: string;
    value: string;
}

export interface NicheAgentQuestion {
    id: string;
    content: string;
    options: NicheAgentOption[];
    allowCustom?: boolean;
}

export interface NicheAgentQuestionSet {
    questions: NicheAgentQuestion[];
}

export interface NicheAgentReasoningStep {
    content: string;
    id: string;
}

export interface NicheAgentFinalResult {
    detailedNiche: string;
    reasoningSummary: string;
}

export type NicheAgentStreamEvent =
    | { type: 'reasoning_step'; data: NicheAgentReasoningStep }
    | { type: 'questions'; data: { questions: NicheAgentQuestion[], threadId: string } }
    | { type: 'final_result'; data: NicheAgentFinalResult }
    | { type: 'error'; data: { message: string } };

export interface NicheAgentAnswer {
    questionId: string;
    answer: string;
}

export interface NicheAgentResponse {
    answers: NicheAgentAnswer[];
}
