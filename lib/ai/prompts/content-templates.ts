import { ContentTemplate } from '@/types/engagement-strategies';
import { getEngagementStrategy } from './engagement-strategies';
import { buildPlatformContext } from './platform-psychology';

export const PLATFORM_CONTENT_TEMPLATES: Record<string, ContentTemplate> = {
  twitter: {
    platform: 'twitter',
    format: 'Thread (3-10 tweets)',
    structure: [
      'Hook Tweet: Contrarian statement OR bold claim OR surprising statistic',
      'Context Tweet: Setup the problem or situation',
      'Value Tweets: 3-7 tweets of specific, actionable content',
      'Proof Tweet: Results, data, or credibility marker',
      'CTA Tweet: Engagement question or next step',
    ],
    hooks: [
      'I wasted [time/money] doing [thing]. Here\'s what actually works:',
      'Everyone says [common advice]. Here\'s why that\'s wrong:',
      '[Specific number/stat] about [niche]. Here\'s why it matters:',
      'Unpopular opinion: [contrarian take]',
      'From [bad state] to [good state] in [timeframe]. The exact process:',
    ],
    examples: [
      'Hook: "I spent $5K on growth courses. Grew 127 followers. Then I tried this free method. Result: 10K in 47 days. Thread:"\n\nContext: "Here\'s what those expensive courses taught (spoiler: not much new):"\n\nValue: "Instead, I focused on 3 things the courses barely mentioned..."\n\n[Continue thread]',
    ],
  },
  instagram: {
    platform: 'instagram',
    format: 'Reel Script (15-60 seconds)',
    structure: [
      'First 0.5sec: Pattern interrupt (visual or text hook)',
      'Hook (0-3sec): Text overlay with bold claim',
      'Value (3-45sec): Quick tips, transformation, or story',
      'Payoff (45-55sec): Key takeaway or result',
      'CTA (55-60sec): Save, follow, or comment prompt',
    ],
    hooks: [
      '[TEXT OVERLAY] Stop scrolling if you [pain point]',
      '[TEXT] POV: You just discovered [game-changer]',
      '[TEXT] [Number] signs you\'re [doing it wrong]',
      '[VISUAL] Transformation before/after split',
      '[TEXT] This is controversial but... [value bomb]',
    ],
    examples: [
      '[Visual: Hand up in "stop" gesture]\n[Text Overlay]: "Stop scrolling if you\'re tired of low engagement"\n\n[0-3sec]: "I tested 47 Reel formats in 30 days"\n[3-15sec]: "These 3 got me 50K followers:"\n[15-30sec]: "1. Pattern interrupt first frame"\n[30-45sec]: "2. Value in first 3 seconds"\n[45-55sec]: "3. Save-worthy payoff"\n[55-60sec]: "Save this for later 📌"',
    ],
  },
  tiktok: {
    platform: 'tiktok',
    format: 'TikTok Script (15-60 seconds)',
    structure: [
      'Hook (0-1sec): Instant pattern interrupt',
      'Setup (1-5sec): Relatable pain point',
      'Value (5-50sec): Quick tips or story',
      'Payoff (50-58sec): Best tip or surprising ending',
      'CTA (58-60sec): Comment bait',
    ],
    hooks: [
      '[TEXT] Things nobody tells you about [niche]',
      '[TEXT] Red flags you\'re [doing it wrong]',
      'POV: [Relatable situation]',
      '[TEXT] How [persona] actually [achieves goal]',
      '[Number] [niche] hacks that actually work',
    ],
    examples: [
      '[Trending Audio starts]\n[Text Overlay]: "Things nobody tells you about going viral"\n\n[0-1sec]: *Point to camera*\n[1-5sec]: "If you think viral = success, watch this"\n[5-20sec]: "I went viral 12 times last month"\n[20-35sec]: "Made $0. Here\'s why:"\n[35-50sec]: "Viral views ≠ followers ≠ money"\n[50-58sec]: "What actually works is..."\n[58-60sec]: "Comment if you want part 2"',
    ],
  },
  youtube: {
    platform: 'youtube',
    format: 'YouTube Short (30-60 seconds)',
    structure: [
      'Hook (0-3sec): Question, stat, or bold statement',
      'Setup (3-10sec): Context or problem',
      'Value (10-50sec): Quick solution or insight',
      'Mid-Hook (25sec): "But wait..." retention spike',
      'Payoff (50-55sec): Key takeaway',
      'CTA (55-60sec): Subscribe or watch next',
    ],
    hooks: [
      'Most people get [thing] wrong. Here\'s the right way:',
      '[Surprising stat] about [niche] that nobody talks about',
      'Before: [problem]. After: [solution]. Here\'s how:',
      'This [thing] changed everything:',
      'If you\'re doing [common practice], stop.',
    ],
    examples: [
      '[0-3sec]: "93% of YouTube Shorts fail because of THIS mistake"\n[3-10sec]: "I tested 200 Shorts. Found the pattern."\n[10-25sec]: "Most people hook the viewer..."\n[25-30sec]: "But wait - that\'s not enough."\n[30-50sec]: "You also need to [key insight]"\n[50-55sec]: "Do this and watch your views explode"\n[55-60sec]: "Subscribe for more creator tips"',
    ],
  },
  linkedin: {
    platform: 'linkedin',
    format: 'LinkedIn Post (100-300 words)',
    structure: [
      'Hook (First line): Contrarian opinion or impressive metric',
      'Context (2-3 lines): Setup the story or insight',
      'Value (3-5 paragraphs): Core content with specific examples',
      'Credibility (1-2 lines): Data or experience',
      'CTA (Last line): Thoughtful question for comments',
    ],
    hooks: [
      'Unpopular opinion in [industry]:',
      'We just hit [impressive metric]. Here\'s what we learned:',
      '[Number] things I wish I knew before [milestone]',
      'If you\'re doing [common practice], you\'re leaving money on the table',
      'Everyone talks about [thing]. Nobody talks about [real thing].',
    ],
    examples: [
      'Unpopular opinion in marketing:\nYour engagement rate doesn\'t matter.\n\nHere\'s what actually matters:\n\nLast quarter, our engagement rate dropped 40%.\nOur revenue? Up 300%.\n\nWhy?\n\nWe stopped chasing vanity metrics.\n\nStarted tracking:\n→ Sales qualified leads\n→ Customer acquisition cost  \n→ Lifetime value\n\nEngagement makes you feel good.\nRevenue keeps the lights on.\n\nWhat metrics do you prioritize? 👇',
    ],
  },
  facebook: {
    platform: 'facebook',
    format: 'Facebook Post (100-400 words)',
    structure: [
      'Hook (First 1-2 lines): Relatable story or question',
      'Story (3-8 lines): Personal experience or situation',
      'Value (4-10 lines): Insights or lessons',
      'Community Connection (2-3 lines): Make it about "us"',
      'CTA (Last line): Question to spark discussion',
    ],
    hooks: [
      'Can anyone relate? [Relatable situation]',
      'Story time: [Personal experience]',
      'Quick question for the group: [Thoughtful question]',
      'Unpopular opinion: [Take]. Change my mind.',
      'Real talk: [Vulnerable admission]',
    ],
    examples: [
      'Can anyone relate?\n\nSpent 3 hours creating content yesterday. Posted it this morning. Got 12 views.\n\nI was ready to quit.\n\nThen I remembered something my mentor said:\n\n"Your content isn\'t bad. You\'re just playing the wrong game."\n\nSo I looked at what was working for others in our niche.\n\nFound a pattern.\n\nTried it.\n\nResult? 10x the reach with half the effort.\n\nLesson: Sometimes we need to stop grinding and start learning.\n\nWhat\'s your biggest content struggle right now? Let\'s help each other out. 👇',
    ],
  },
};

export function buildContentGenerationPrompt(
  platform: string,
  idea: { title: string; description: string; contentPillar: string; hook?: string },
  niche: string,
  targetAudience: string
): string {
  const template = PLATFORM_CONTENT_TEMPLATES[platform.toLowerCase()] || PLATFORM_CONTENT_TEMPLATES.twitter;
  const platformContext = buildPlatformContext(platform);
  const engagementStrategy = getEngagementStrategy(platform);
  const isTwitter = platform.toLowerCase() === 'twitter';

  return `
You are an expert ${platform} content creator specializing in ${niche} content for ${targetAudience}.

${platformContext}

${isTwitter ? `CRITICAL TWITTER THREAD REQUIREMENT:
You MUST generate a COMPLETE Twitter thread with 3-10 tweets.
- DO NOT generate only one tweet
- Include all tweets in the script_content field
- Each tweet on a separate line
- Number each tweet (1/X, 2/X, etc.)
- Every single tweet must be included in your response
- Example format:
  1/5 Hook tweet here...
  2/5 Context tweet here...
  3/5 Value tweet here...
  4/5 More value here...
  5/5 CTA tweet here...
` : ''}

CONTENT IDEA TO DEVELOP:
Title: ${idea.title}
Description: ${idea.description}
Content Pillar: ${idea.contentPillar}
${idea.hook ? `Suggested Hook: ${idea.hook}` : ''}

CONTENT FORMAT: ${template.format}

STRUCTURE TO FOLLOW:
${template.structure.map((step, i) => `${i + 1}. ${step}`).join('\n')}

PLATFORM-SPECIFIC HOOKS:
${template.hooks.map((hook, i) => `${i + 1}. ${hook}`).join('\n')}

EXAMPLE FOR INSPIRATION:
${template.examples[0]}

MANDATORY REQUIREMENTS:

1. SCROLL-STOPPING HOOK:
   ${engagementStrategy.hooks[0].template}
   - Must grab attention in first 0.5-3 seconds
   - Use contrarian angle or surprising data
   - Create curiosity gap

2. SPECIFIC, NOT GENERIC:
   ✅ Use: Exact numbers, specific examples, concrete steps
   ❌ Avoid: "Tips", "boost", "grow" without specifics
   ✅ Good: "The 3-tweet thread format that got me 10K followers in 30 days"
   ❌ Bad: "How to grow your followers"

3. RESULTS-FOCUSED:
   - Include specific outcomes
   - Use timeframes
   - Show transformation

4. ENGAGEMENT OPTIMIZATION:
   Pattern Interrupts: ${engagementStrategy.patternInterrupts.slice(0, 3).join(', ')}
   CTA Options: ${engagementStrategy.callToActions.slice(0, 3).join(' OR ')}

5. PLATFORM NATIVE:
   - Use platform-specific language
   - Follow format conventions
   - Optimize for algorithm preferences

6. VALUE DELIVERY:
   - Educational OR entertaining OR inspiring
   - Actionable insights
   - Save-worthy content

OUTPUT FORMAT:

Return ONLY a JSON object (no markdown, no code blocks) with this exact structure:

${getSchemaInstructions(platform)}

PLATFORM-SPECIFIC FORMATTING:

${getPlatformFormattingGuide(platform)}

Now create scroll-stopping, engagement-driving content for this idea. Return ONLY the JSON object:
  `.trim();
}

function getSchemaInstructions(platform: string): string {
  const platformLower = platform.toLowerCase();

  switch (platformLower) {
    case 'twitter':
      return `{
  "script_content": "Complete thread with ALL tweets (3-10 tweets). Format each tweet on separate lines with thread number prefix (1/X, 2/X, etc.). Keep each tweet under 280 characters. Example:\\n1/5 Hook tweet...\\n2/5 Context tweet...\\n3/5 Value tweet...",
  "hashtags": ["array", "of", "hashtags"]
}`;
    case 'linkedin':
      return `{
  "script_content": "The main post content",
  "hashtags": ["array", "of", "hashtags"]
}`;

    case 'instagram':
    case 'tiktok':
      return `{
  "caption": "Short caption for the post",
  "script_content": "Full script with timing and descriptions",
  "visual_cues": ["List", "of", "visual", "suggestions"],
  "audio_suggestion": "Trending audio or music style recommendation",
  "hashtags": ["array", "of", "relevant", "hashtags"]
}`;

    case 'youtube':
      return `{
  "caption": "Video description",
  "script_content": "Full script with timing and retention hooks",
  "visual_cues": ["List", "of", "visual", "suggestions"],
  "hashtags": ["array", "of", "hashtags"]
}`;

    case 'facebook':
      return `{
  "caption": "The post content",
  "script_content": "Full post text",
  "hashtags": ["array", "of", "hashtags"]
}`;

    default:
      return `{
  "script_content": "The main content",
  "hashtags": ["hashtags"]
}`;
  }
}

function getPlatformFormattingGuide(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'twitter':
      return `
- GENERATE A COMPLETE THREAD (3-10 tweets minimum)
- INCLUDE ALL TWEETS IN THE RESPONSE
- Each tweet on a new line
- Start each tweet with thread number: "1/X", "2/X", etc.
- Keep each individual tweet under 280 characters
- Make each tweet self-contained and quotable
- Build momentum across tweets
- End final tweet with engaging CTA
- Use line breaks within tweets for readability
      `.trim();

    case 'instagram':
      return `
- Use [TEXT OVERLAY: "text"] for on-screen text
- Use [VISUAL: description] for visual cues
- Include timestamps in seconds
- Suggest trending audio style
- Include caption for post
- Add 5-10 relevant hashtags
      `.trim();

    case 'tiktok':
      return `
- Use [TEXT: "text"] for on-screen text
- Include timestamps in seconds
- Suggest trending audio
- Note visual cues and transitions
- Add comment bait
- Include 3-5 trending hashtags
      `.trim();

    case 'youtube':
      return `
- Include timestamps (0-3sec, 3-10sec, etc.)
- Note retention hooks
- Suggest thumbnail text
- Fast pacing (no filler)
- Include [VISUAL: suggestion] for variety
      `.trim();

    case 'linkedin':
      return `
- Short paragraphs (2-3 lines max)
- Use line breaks for readability
- Include bullet points with → or •
- First line is hook
- End with question
- Add 3-5 professional hashtags
      `.trim();

    case 'facebook':
      return `
- Conversational tone
- Short paragraphs
- Use emojis sparingly (1-2 max)
- Story structure
- End with discussion question
- 100-400 words OK (build depth)
      `.trim();

    default:
      return 'Follow standard content formatting for the platform.';
  }
}

export function getContentTemplate(platform: string): ContentTemplate {
  return PLATFORM_CONTENT_TEMPLATES[platform.toLowerCase()] || PLATFORM_CONTENT_TEMPLATES.twitter;
}
