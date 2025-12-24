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
}

export function buildIdeaGenerationPrompt(config: IdeaGenerationConfig): string {
  const { niche, subNiche, targetAudience, platform, count, strategy, contentPillars } = config;

  const platformContext = buildPlatformContext(platform);
  const engagementStrategy = getEngagementStrategy(platform);

  let strategyPrompt = '';

  switch (strategy) {
    case 'contrarian':
      strategyPrompt = `
STRATEGY: CONTRARIAN ANGLES

Generate ideas that challenge conventional wisdom in ${niche}. Each idea should:
- Directly contradict common advice or practices
- Be backed by logic, data, or personal experience
- Create cognitive dissonance that stops scrolling
- Avoid being contrarian just for shock value

Examples of contrarian angles:
${getContrarianAngle().examples.map(ex => `- ${ex}`).join('\n')}

Your ideas should make people think: "Wait, that goes against everything I've heard..."
      `;
      break;

    case 'results':
      strategyPrompt = `
STRATEGY: RESULTS-FOCUSED

Generate ideas focused on specific, measurable outcomes. Each idea MUST include:
- Specific numbers (time, money, metrics)
- Before and after states
- Exact timeframe
- Tangible results

Avoid vague terms like "boost", "grow", "improve", "increase" without numbers.

Good: "How I grew from 0 to 10K followers in 47 days"
Bad: "How to grow your following quickly"

Good: "The $3K course vs the free method that got me $15K/month"
Bad: "How to make money with your skills"

Results framing templates:
${RESULTS_FOCUSED_FRAMING.map(rf => `- ${rf.template}`).join('\n')}
      `;
      break;

    case 'pain_point':
      strategyPrompt = `
STRATEGY: PAIN POINT TARGETING

Generate ideas that directly address specific struggles of ${targetAudience}. Each idea should:
- Call out a specific, relatable frustration
- Show you understand their exact situation
- Promise a concrete solution
- Create "This is exactly what I needed!" moment

Focus on pain points like:
- Wasting time on tactics that don't work
- Feeling overwhelmed by conflicting advice
- Struggling with specific technical challenges
- Seeing others succeed while they're stuck
- Making common mistakes without realizing

Your ideas should make them think: "How did you know I struggle with this?"
      `;
      break;

    case 'transformation':
      strategyPrompt = `
STRATEGY: TRANSFORMATION STORIES

Generate ideas showcasing dramatic before/after journeys. Each idea should:
- Show clear starting point (often negative)
- Describe dramatic transformation
- Hint at the "how" to create curiosity
- Use specific timeframes and outcomes

Transformation angles:
- Failed approach → Successful approach
- Struggling creator → Thriving creator
- Old inefficient method → New streamlined method
- Before knowledge → After knowledge
- Previous results → Current results

Make the transformation aspirational but believable.
      `;
      break;
  }

  return `
You are an expert content strategist specializing in ${niche} content for ${targetAudience}.

${platformContext}

NICHE CONTEXT:
Primary Niche: ${niche}
${subNiche ? `Sub-Niche: ${subNiche}` : ''}
Target Audience: ${targetAudience}

CONTENT PILLARS TO COVER:
${contentPillars.map((pillar, i) => `${i + 1}. ${pillar}`).join('\n')}

${strategyPrompt}

PLATFORM-SPECIFIC REQUIREMENTS FOR ${platform.toUpperCase()}:

Scroll-Stopping Techniques:
${engagementStrategy.scrollStopTechniques.map((tech, i) => `${i + 1}. ${tech}`).join('\n')}

Hook Types to Use:
${engagementStrategy.hooks.map((hook, i) => `${i + 1}. ${hook.type}: ${hook.template}`).join('\n')}

MANDATORY REQUIREMENTS:

1. SPECIFICITY: Every idea must be specific, not generic
   ❌ Bad: "How to grow your audience"
   ✅ Good: "The 3-tweet thread template that got me 10K followers in 30 days"

2. NO GENERIC ADVICE: Avoid phrases like:
   - "Tips and tricks"
   - "Boost your [thing]"
   - "Grow your [thing]"
   - "Master [thing]"
   - "Ultimate guide to [thing]"
   Unless followed by specific numbers or unique angles.

3. ENGAGEMENT POTENTIAL: Each idea should naturally drive:
   - Comments (controversial or question-based)
   - Saves (valuable reference)
   - Shares (makes sharer look smart)

4. CONTENT PILLAR BALANCE: Distribute ideas across all pillars

5. TARGET AUDIENCE RESONANCE: Use language and concerns specific to ${targetAudience}

OUTPUT FORMAT:

Generate exactly ${count} content ideas. For each idea, provide:

{
  "title": "Compelling title that stops scroll",
  "description": "2-3 sentence description of what the content will cover",
  "contentPillar": "Which pillar this falls under",
  "hook": "The opening line/hook",
  "platform": "${platform}"
}

Return ONLY a valid JSON array of ${count} ideas. No markdown, no explanations, just the JSON array.

Example output format:
[
  {
    "title": "I spent $5K on courses. This free method worked better.",
    "description": "Breakdown of the expensive courses I bought vs the free YouTube/article method that actually got me results. Includes specific ROI comparison and exact resources.",
    "contentPillar": "Education/Learning",
    "hook": "Everyone says invest in yourself. I did. $5K later, I was still stuck. Then I found this:",
    "platform": "${platform}"
  }
]

Generate ${count} scroll-stopping, engagement-driving ideas NOW:
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
You are an expert content strategist creating scroll-stopping content ideas for ${targetAudience} in the ${niche} niche.

OBJECTIVE: Generate ${totalIdeas} highly engaging, platform-optimized content ideas that would immediately stop scrolling and drive massive engagement.

NICHE CONTEXT:
- Primary Niche: ${niche}
${subNiche ? `- Sub-Niche: ${subNiche}` : ''}
- Target Audience: ${targetAudience}

CONTENT PILLARS:
${contentPillars.map((pillar, i) => `${i + 1}. ${pillar}`).join('\n')}

PLATFORM DISTRIBUTION:
${Object.entries(platformDistribution).map(([platform, count]) => `- ${platform}: ${count} ideas`).join('\n')}

MANDATORY REQUIREMENTS:

1. SCROLL-STOPPING: Every idea must have a hook that stops mid-scroll
2. CONTRARIAN: Challenge common beliefs (respectfully)
3. SPECIFIC: Use numbers, timeframes, specific examples (never vague)
4. RESULTS-FOCUSED: Show tangible outcomes
5. NO GENERIC ADVICE: Avoid "tips", "boost", "grow" without specific context

IDEA GENERATION STRATEGIES:

Use a mix of these proven approaches:

A. CONTRARIAN ANGLES (${Math.floor(totalIdeas * 0.25)} ideas)
   - Challenge conventional wisdom
   - "Everyone says X, but here's why that's wrong"
   - Expose myths with data/experience

B. RESULTS-FOCUSED (${Math.floor(totalIdeas * 0.25)} ideas)
   - Specific transformations with numbers
   - "From X to Y in Z timeframe"
   - Cost vs return comparisons

C. PAIN POINT ADDRESSING (${Math.floor(totalIdeas * 0.25)} ideas)
   - Call out specific struggles
   - "If you're struggling with X, here's why"
   - Solve a real, specific problem

D. TRANSFORMATION STORIES (${Math.floor(totalIdeas * 0.25)} ideas)
   - Before/after narratives
   - Failed method vs successful method
   - What changed everything

QUALITY STANDARDS:

Each idea must score high on:
- Engagement potential (will people comment/share?)
- Specificity (is it concrete or vague?)
- Contrarian factor (does it challenge norms?)
- Results focus (are outcomes measurable?)
- Platform fit (optimized for the platform?)

OUTPUT FORMAT:

Return a JSON array of exactly ${totalIdeas} content ideas:

[
  {
    "title": "Scroll-stopping title with specific hook",
    "description": "2-3 sentences explaining the content value",
    "contentPillar": "Which pillar it falls under",
    "hook": "The opening line that stops scrolling",
    "platform": "platform name"
  }
]

EXAMPLES OF GREAT IDEAS:

❌ Bad: "5 tips to grow on Instagram"
✅ Good: "I tested 47 Reel formats in 30 days. These 3 got me from 0 to 50K followers."

❌ Bad: "How to improve your content strategy"
✅ Good: "Everyone says 'post consistently.' I posted 3x/week and grew faster than friends posting daily. Here's why:"

❌ Bad: "Learn to master [skill]"
✅ Good: "Spent $5K on courses learning [skill]. This free method got better results in 1/10th the time."

Now generate ${totalIdeas} platform-optimized, scroll-stopping content ideas as a valid JSON array:
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
