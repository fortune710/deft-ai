import { getSocialContentExpertPersona, getSkillForPlatform, POST_TEMPLATES_REFERENCE } from '../skills/social-content';
// DEPRECATED: Source of truth shifted to skill-based system
// import { getEngagementStrategy, getContrarianAngle, RESULTS_FOCUSED_FRAMING } from './engagement-strategies';
// import { buildPlatformContext } from './platform-psychology';

interface IdeaGenerationConfig {
  niche: string;
  subNiche?: string;
  targetAudience: string;
  platform: string;
  count: number;
  strategy: 'contrarian' | 'results' | 'pain_point' | 'transformation';
  contentPillars: string[];
  currentAffairsBriefing?: string;
}

export function buildIdeaGenerationPrompt(config: IdeaGenerationConfig): string {
  const { niche, subNiche, targetAudience, platform, count, strategy, contentPillars, currentAffairsBriefing } = config;

  const platformSkill = getSkillForPlatform(platform);

  // Extract relevant hook formulas from the templates reference
  const hookFormulas = POST_TEMPLATES_REFERENCE.split('## Hook Formulas')[1] || '';

  return `
<platform_expertise platform="${platform.toUpperCase()}">
${platformSkill}
</platform_expertise>

<task_context>
Task: Generate exactly ${count} highly engaging, scroll-stopping content ideas.
Primary Niche: ${niche}
${subNiche ? `Sub-Niche: ${subNiche}` : ''}
Target Audience: ${targetAudience}

Content Pillars to Cover:
${contentPillars.map((pillar, i) => `${i + 1}. ${pillar}`).join('\n')}
</task_context>

${currentAffairsBriefing ? `<current_affairs_signals>
${currentAffairsBriefing}
</current_affairs_signals>` : ''}

<strategy_layer type="${strategy}">
${getStrategyInstructions(strategy, niche, targetAudience)}
</strategy_layer>

<hook_formulas_reference>
${hookFormulas}
</hook_formulas_reference>

<mandatory_rules>
1. VOICE & TONE: Follow the "Smart friend who figured something out" voice principle. Use specific numbers, brevity, and emotion.
2. SPECIFICITY: Every idea must be concrete (YES: "How I hit $10K/mo in 47 days", NO: "How to make money").
3. NO GENERIC ADVICE: Avoid empty phrases like "Tips and tricks" or "Boost your...".
4. SCROLL-STOPPING: Hooks must be curiosity-driven, story-based, or contrarian (use the provided formulas).
5. CURRENT AFFAIRS: If using signals, set "isCurrentAffairs" to true and include source hints/URLs.
6. OUTPUT: Provide EXACTLY ${count} ideas.
</mandatory_rules>
  `.trim();
}

/**
 * @deprecated Use skill-based prompt generation
 */
function getStrategyInstructions(strategy: string, niche: string, targetAudience: string): string {
  switch (strategy) {
    case 'contrarian':
      return `Challenge conventional wisdom in ${niche}. Create cognitive dissonance.`;
    case 'results':
      return `Focus on measurable outcomes, numbers, and clear before/after states.`;
    case 'pain_point':
      return `Address specific struggles of ${targetAudience}. Show you understand their exact situation.`;
    case 'transformation':
      return `Showcase dramatic journeys from a negative starting point to a successful outcome.`;
    default:
      return '';
  }
}

export function buildBulkIdeaGenerationPrompt(
  niche: string,
  subNiche: string | undefined,
  targetAudience: string,
  platforms: string[],
  contentPillars: string[],
  totalIdeas: number
): string {
  const platformDistribution = distributePlatformIdeas(platforms, totalIdeas);

  return `
<context>
You are an elite content strategist creating scroll-stopping content ideas for ${targetAudience} in the ${niche} niche.
Your objective is to generate exactly ${totalIdeas} highly engaging, platform-optimized content ideas that would immediately stop scrolling and drive massive engagement.
</context>

<niche_details>
Primary Niche: ${niche}
${subNiche ? `Sub-Niche: ${subNiche}` : ''}
Target Audience: ${targetAudience}

Content Pillars:
${contentPillars.map((pillar, i) => `${i + 1}. ${pillar}`).join('\n')}
</niche_details>

<platform_distribution>
${Object.entries(platformDistribution).map(([platform, count]) => `- ${platform}: ${count} ideas`).join('\n')}
</platform_distribution>

<mandatory_rules>
1. SCROLL-STOPPING: Every idea must have a hook that stops mid-scroll.
2. CONTRARIAN: Challenge common beliefs (respectfully).
3. SPECIFIC: Use numbers, timeframes, specific examples (never vague).
4. RESULTS-FOCUSED: Show tangible outcomes.
5. NO GENERIC ADVICE: Avoid "tips", "boost", "grow" without specific context.
6. OUTPUT: Provide EXACTLY ${totalIdeas} ideas.
</mandatory_rules>

<generation_strategies>
Use a mix of these proven approaches:

A. CONTRARIAN ANGLES (${Math.floor(totalIdeas * 0.25)} ideas)
   - Challenge conventional wisdom ("Everyone says X, but here's why that's wrong")
   - Expose myths with data/experience

B. RESULTS-FOCUSED (${Math.floor(totalIdeas * 0.25)} ideas)
   - Specific transformations with numbers ("From X to Y in Z timeframe")
   - Cost vs return comparisons

C. PAIN POINT ADDRESSING (${Math.floor(totalIdeas * 0.25)} ideas)
   - Call out specific struggles ("If you're struggling with X, here's why")
   - Solve a real, specific problem

D. TRANSFORMATION STORIES (${Math.floor(totalIdeas * 0.25)} ideas)
   - Before/after narratives
   - Failed method vs successful method
</generation_strategies>

<quality_standards>
Each idea MUST score high on:
- Engagement potential (will people comment/share?)
- Specificity (is it concrete or vague?)
- Contrarian factor (does it challenge norms?)
- Results focus (are outcomes measurable?)
- Platform fit (optimized for the specific platform format?)
</quality_standards>

<examples>
❌ Bad: "5 tips to grow on Instagram"
✅ Good: "I tested 47 Reel formats in 30 days. These 3 got me from 0 to 50K followers."

❌ Bad: "How to improve your content strategy"
✅ Good: "Everyone says 'post consistently.' I posted 3x/week and grew faster than friends posting daily. Here's why:"

❌ Bad: "Learn to master [skill]"
✅ Good: "Spent $5K on courses learning [skill]. This free method got better results in 1/10th the time."
</examples>
  `.trim();
}

function distributePlatformIdeas(platforms: string[], totalIdeas: number): Record<string, number> {
  const distribution: Record<string, number> = {};

  const highEngagementPlatforms = ['twitter', 'tiktok', 'instagram'];
  const mediumEngagementPlatforms = ['youtube', 'linkedin'];
  const communityPlatforms = ['facebook'];

  let remaining = totalIdeas;

  platforms.forEach(platform => {
    const platformLower = platform.toLowerCase();

    if (highEngagementPlatforms.includes(platformLower)) {
      const count = Math.floor(totalIdeas * 0.25);
      distribution[platform] = count;
      remaining -= count;
    } else if (mediumEngagementPlatforms.includes(platformLower)) {
      const count = Math.floor(totalIdeas * 0.15);
      distribution[platform] = count;
      remaining -= count;
    } else if (communityPlatforms.includes(platformLower)) {
      const count = Math.floor(totalIdeas * 0.10);
      distribution[platform] = count;
      remaining -= count;
    }
  });

  if (remaining > 0 && platforms.length > 0) {
    distribution[platforms[0]] = (distribution[platforms[0]] || 0) + remaining;
  }

  return distribution;
}
