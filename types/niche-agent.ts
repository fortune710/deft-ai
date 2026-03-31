import { z } from "zod";
import { detailedNicheSchema } from "@/lib/validations/onboarding/niche";
import { nicheAgentQuestionSchema } from "@/lib/validations/onboarding/niche";


export interface NicheAgentOption {
    label: string;
    value: string;
}

export type NicheAgentQuestion = z.infer<typeof nicheAgentQuestionSchema>;

export interface NicheAgentQuestionSet {
    questions: NicheAgentQuestion[];
}

export interface NicheAgentReasoningStep {
    content: string;
    id: string;
}

export type DetailedNiche = z.infer<typeof detailedNicheSchema>;

export interface NicheAgentFinalResult {
    detailedNiche: DetailedNiche;
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
