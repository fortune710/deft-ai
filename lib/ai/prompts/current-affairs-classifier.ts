import { ContentIdea, AgentContext } from "@/types/ai-agents";

export function buildCurrentAffairsClassifierPrompt(
  idea: ContentIdea,
  context: AgentContext
): string {
  return `
You are a content strategist deciding if an idea requires current-affairs research.

PROFILE CONTEXT:
- Niche: ${context.niche.niche}
- Sub-Niche: ${context.niche.subNiche}
- Target Audience: ${context.niche.targetAudience}
- Content Pillars: ${context.niche.contentPillars.join(", ")}

IDEA:
Title: ${idea.title}
Description: ${idea.description}
Content Pillar: ${idea.contentPillar}

Decision criteria:
1) If the idea depends on recent events, breaking news, recent policy changes, market moves, or time-sensitive claims, then research is REQUIRED.
2) If it is evergreen and can be written without citing recent developments, research is NOT required.
3) If unsure, default to research.

Return ONLY valid JSON with this exact structure:
{
  "isCurrentAffairs": true/false,
  "reason": "short reason",
  "researchQuery": "one concise query to research, or empty string"
}
  `.trim();
}
