import { getSocialContentExpertPersona, getSkillForPlatform, POST_TEMPLATES_REFERENCE } from '../skills/social-content';

/**
 * Skill-powered content generation prompt builder.
 * Replaces the old content-templates.ts system.
 */
export function buildSkillContentPrompt(
  platform: string,
  idea: { title: string; description: string; contentPillar: string; hook?: string },
  niche: string,
  targetAudience: string,
  research?: {
    summary?: string;
    sources?: Array<{ title: string; url: string }>;
  }
): string {
  const platformSkill = getSkillForPlatform(platform);

  // Extract specific platform templates from the reference
  const platformTemplates = extractPlatformTemplates(POST_TEMPLATES_REFERENCE, platform);

  return `
<platform_dominance_strategy platform="${platform.toUpperCase()}">
${platformSkill}
</platform_dominance_strategy>

<task_objective>
Create a high-performing piece of content based on this idea:
Title: ${idea.title}
Description: ${idea.description}
Content Pillar: ${idea.contentPillar}
${idea.hook ? `Suggested Hook: ${idea.hook}` : ''}

Niche: ${niche}
Target Audience: ${targetAudience}
</task_objective>

${research?.summary ? `<research_data>
ONLY use these verified facts. Do not hallucinate data.
${research.summary}

Sources:
${(research.sources || []).map((s) => `- ${s.title}: ${s.url}`).join('\n')}
</research_data>` : ''}

<templates_and_formulas>
${platformTemplates}
</templates_and_formulas>

<mandatory_delivery_rules>
1. VOICE: Native to ${platform}. Follow "Smart friend" voice principles.
2. STRUCTURE: Adhere to the templates provided for ${platform}.
3. HOOK: Use a scroll-stopping formula first.
4. SPECIFICITY: Mention concrete results, timeframes, and steps.
5. NO HALLUCINATION: If research is provided, stick to it.
6. FORMATTING: Use platform-native formatting (line breaks, emojis, bullet points).
7. CALL TO ACTION: Include a platform-appropriate CTA.
</mandatory_delivery_rules>
  `.trim();
}

/**
 * Extract templates for a specific platform from the markdown.
 */
function extractPlatformTemplates(markdown: string, platform: string): string {
  const platformLower = platform.toLowerCase();
  const sections = markdown.split('---');

  // Try to find the platform-specific template section
  const section = sections.find(s => s.toLowerCase().includes(platformLower));

  // Also include the general hook formulas
  const hookFormulas = markdown.split('## Hook Formulas')[1] || '';

  return `
${section || ''}

## Hook Formulas
${hookFormulas}
  `.trim();
}
