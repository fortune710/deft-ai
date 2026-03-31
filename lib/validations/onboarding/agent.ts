import { z } from "zod";
import { detailedNicheSchema, nicheAgentQuestionSchema } from "./niche";

// Schema for the agent's decision/analysis
export const analysisSchema = z.object({
    reasoningSteps: z.array(z.string()).describe("A few steps of reasoning about the niche."),
    isComplete: z.boolean().describe("Whether we have enough information to describe the niche in detail."),
    questions: z.array(nicheAgentQuestionSchema).describe("Questions to ask the user if isComplete is false. An empty array if isComplete is true."),
    finalDescription: detailedNicheSchema.nullable().describe("The detailed niche description object if isComplete is true. Otherwise null."),
});