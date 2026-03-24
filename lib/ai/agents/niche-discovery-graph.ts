import { Annotation, StateGraph, START, END, interrupt } from "@langchain/langgraph";
import { ChatXAI } from "@langchain/xai";
import { z } from "zod";
import { NicheAgentQuestion } from "@/types/niche-agent";

// Define the state schema
export const NicheAgentState = Annotation.Root({
    initialNiche: Annotation<string>(),
    reasoningSteps: Annotation<string[]>({
        reducer: (left, right) => left.concat(right),
        default: () => [],
    }),
    questions: Annotation<NicheAgentQuestion[]>({
        reducer: (left, right) => right, // Replace with new questions
        default: () => [],
    }),
    userAnswers: Annotation<Record<string, string>>({
        reducer: (left, right) => ({ ...left, ...right }),
        default: () => ({}),
    }),
    iterationCount: Annotation<number>({
        reducer: (left, right) => right,
        default: () => 0,
    }),
    finalNicheDescription: Annotation<string | null>({
        reducer: (left, right) => right,
        default: () => null,
    }),
    isComplete: Annotation<boolean>({
        reducer: (left, right) => right,
        default: () => false,
    }),
});

// Create the model
const model = new ChatXAI({
    model: "grok-4-fast-reasoning",
    maxRetries: 3,
    apiKey: process.env.XAI_API_KEY,
});

// Schema for the agent's decision/analysis
const analysisSchema = z.object({
    reasoningSteps: z.array(z.string()).describe("A few steps of reasoning about the niche."),
    isComplete: z.boolean().describe("Whether we have enough information to describe the niche in detail."),
    questions: z.array(z.object({
        id: z.string(),
        content: z.string(),
        options: z.array(z.object({
            label: z.string(),
            value: z.string(),
        })),
        allowCustom: z.boolean().describe("Whether to allow a custom answer."),
    })).describe("Questions to ask the user if isComplete is false. An empty array if isComplete is true."),
    finalDescription: z.string().nullable().describe("The detailed niche description if isComplete is true. Otherwise null."),
});

const structuredModel = model.withStructuredOutput(analysisSchema);

// Node: Analyze the niche and decide next steps
async function analyzeNiche(state: typeof NicheAgentState.State) {
    const { initialNiche, userAnswers, iterationCount } = state;

    const prompt = `
    You are an expert creator coach and niche strategist. 
    Your goal is to help a creator define a highly specific, high-potential niche.
    
    Initial Niche Idea: "${initialNiche}"
    
    Previous Information gathered:
    ${Object.entries(userAnswers).map(([q, a]) => `- Question: ${q}\n  Answer: ${a}`).join('\n')}
    
    Current Iteration: ${iterationCount}
    
    Instructions:
    1. Reason through the niche. Is it too broad? Who is the specific audience? What is the transformation?
    2. If you need more specific details to create a "Creator DNA" strategy, ask 2-3 targeted multi-choice questions.
    3. If you have enough information (usually after 1-2 rounds of questions), mark isComplete as true and provide a detailed, "fleshed out" niche description.
    4. Provide 2-3 reasoning steps that describe your current thinking process.
  `;

    const result = await structuredModel.invoke(prompt);

    return {
        reasoningSteps: result.reasoningSteps,
        isComplete: result.isComplete,
        questions: result.questions || [],
        finalNicheDescription: result.finalDescription || null,
        iterationCount: iterationCount + 1,
    };
}

// Node: Wait for user input (HITL)
async function awaitUser(state: typeof NicheAgentState.State) {
    // LangGraph interrupt pauses execution and saves state.
    // When resumed, the 'resume' value from the Command is returned here.
    const response = interrupt({
        questions: state.questions,
    }) as Record<string, string>;

    return {
        userAnswers: response,
        questions: [], // Clear questions after they are answered
    };
}

// Logic to decide whether to continue or end
function shouldContinue(state: typeof NicheAgentState.State) {
    if (state.isComplete || state.iterationCount >= 3) {
        return END;
    }
    return "awaitUser";
}

// Build the graph
export const nicheDiscoveryWorkflow = new StateGraph(NicheAgentState)
    .addNode("analyze", analyzeNiche)
    .addNode("awaitUser", awaitUser)
    .addEdge(START, "analyze")
    .addConditionalEdges("analyze", shouldContinue)
    .addEdge("awaitUser", "analyze");

export const graph = nicheDiscoveryWorkflow.compile();
