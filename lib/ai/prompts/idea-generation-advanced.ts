import { getEngagementStrategy, getContrarianAngle, RESULTS_FOCUSED_FRAMING } from './engagement-strategies';
import { buildPlatformContext } from './platform-psychology';

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

  const platformContext = buildPlatformContext(platform);
  const engagementStrategy = getEngagementStrategy(platform);

  let strategyPrompt = '';

  switch (strategy) {
    case 'contrarian':
      strategyPrompt = `
<strategy type="contrarian">
Generate ideas that challenge conventional wisdom in ${niche}. 
- Directly contradict common advice or practices
- Be backed by logic, data, or personal experience
- Create cognitive dissonance that stops scrolling
- Avoid being contrarian just for shock value

Examples:
${getContrarianAngle().examples.map(ex => `<example>${ex}</example>`).join('\n')}

Goal: Make people think "Wait, that goes against everything I've heard..."
</strategy>`;
      break;

    case 'results':
      strategyPrompt = `
<strategy type="results-focused">
Generate ideas focused on specific, measurable outcomes.
- Include specific numbers (time, money, metrics)
- Detail before and after states
- Define exact timeframe
- Highlight tangible results

Avoid vague terms like "boost", "grow", "improve", "increase" without numbers.
<example type="good">How I grew from 0 to 10K followers in 47 days</example>
<example type="bad">How to grow your following quickly</example>
<example type="good">The $3K course vs the free method that got me $15K/month</example>
<example type="bad">How to make money with your skills</example>

Framing templates:
${RESULTS_FOCUSED_FRAMING.map(rf => `- ${rf.template}`).join('\n')}
</strategy>`;
      break;

    case 'pain_point':
      strategyPrompt = `
<strategy type="pain-point">
Generate ideas that directly address specific struggles of ${targetAudience}.
- Call out a specific, relatable frustration
- Show you understand their exact situation
- Promise a concrete solution
- Create "This is exactly what I needed!" moment

Focus areas:
- Wasting time on tactics that don't work
- Feeling overwhelmed by conflicting advice
- Struggling with specific technical challenges
- Seeing others succeed while they're stuck
- Making common mistakes without realizing
</strategy>`;
      break;

    case 'transformation':
      strategyPrompt = `
<strategy type="transformation">
Generate ideas showcasing dramatic before/after journeys.
- Show clear starting point (often negative)
- Describe dramatic transformation
- Hint at the "how" to create curiosity
- Use specific timeframes and outcomes

Angles:
- Failed approach → Successful approach
- Struggling creator → Thriving creator
- Old inefficient method → New streamlined method
- Before knowledge → After knowledge
- Previous results → Current results
</strategy>`;
      break;
  }

  return `
<context>
You are an expert content strategist specializing in ${niche} content for ${targetAudience}.
Your task is to generate exactly ${count} highly engaging, scroll-stopping content ideas.

${platformContext}
</context>

<niche_details>
Primary Niche: ${niche}
${subNiche ? `Sub-Niche: ${subNiche}` : ''}
Target Audience: ${targetAudience}

Content Pillars to Cover:
${contentPillars.map((pillar, i) => `${i + 1}. ${pillar}`).join('\n')}
</niche_details>

${currentAffairsBriefing ? `<current_affairs_briefing>
${currentAffairsBriefing}
</current_affairs_briefing>` : ''}

${strategyPrompt}

<platform_requirements platform="${platform.toUpperCase()}">
Scroll-Stopping Techniques:
${engagementStrategy.scrollStopTechniques.map((tech, i) => `${i + 1}. ${tech}`).join('\n')}

Hook Types to Use:
${engagementStrategy.hooks.map((hook, i) => `${i + 1}. ${hook.type}: ${hook.template}`).join('\n')}
</platform_requirements>

<mandatory_rules>
1. SPECIFICITY: Every idea must be specific, not generic.
   YES: "The 3-tweet thread template that got me 10K followers in 30 days"
   NO: "How to grow your audience"

2. NO GENERIC ADVICE: Avoid empty phrases like "Tips and tricks", "Boost your...", "Grow your...", "Master..." unless followed by specific numbers.

3. ENGAGEMENT POTENTIAL: Ideas must naturally drive comments, saves, or shares.

4. CURRENT AFFAIRS:
   - If using the CURRENT AFFAIRS BRIEFING, set "isCurrentAffairs" to true.
   - Include 1-3 fact-based "sourceHints".
   - Include matching "sourceUrls".
   - If not relevant, set "isCurrentAffairs" to false.

5. OUTPUT: Provide EXACTLY ${count} ideas matching the expected structure.
</mandatory_rules>
  `.trim();
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
