import { z } from "zod";

// Schema for the niche discovery questions
export const nicheAgentQuestionSchema = z.object({
    id: z.string(),
    content: z.string(),
    options: z.array(z.object({
        label: z.string(),
        value: z.string(),
    })),
    allowCustom: z.boolean().describe("Whether to allow a custom answer."),
});

// Schema for the detailed niche description
export const detailedNicheSchema = z.object({
    niche: z.string().describe("The high-level category of content (e.g., Fitness, Finance, Gaming)."),
    subNiche: z.string().describe("A more specific segment within the niche (e.g., Kettlebell workouts for busy dads, DeFi for beginners)."),
    contentPillars: z.array(z.string()).describe("3-4 main topics or themes that the content will revolve around."),
    targetAudience: z.string().describe("A detailed description of the ideal viewer or follower, including their pain points and desires."),
    tone: z.string().describe("The personality and style of the content (e.g., Authoritative yet accessible, High-energy and comedic)."),
    doesCurrentAffairs: z.enum(["never", "sometimes", "always"]).describe("How often the content will reference news, current events, or trending topics.")
});