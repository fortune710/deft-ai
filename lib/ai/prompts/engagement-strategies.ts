import { EngagementStrategy, ContrarianAngle, ResultsFocusedFraming } from '@/types/engagement-strategies';

/** @deprecated Source of truth moved to lib/ai/skills/social-content */
export const PLATFORM_ENGAGEMENT_STRATEGIES: Record<string, EngagementStrategy> = {
  twitter: {
    platform: 'twitter',
    scrollStopTechniques: [
      'Bold contrarian statement in first 10 words',
      'Specific numbers/metrics that surprise',
      'Pattern interrupt with "Unpopular opinion:"',
      'Personal failure story hook',
      'Challenge conventional wisdom directly',
    ],
    hooks: [
      {
        type: 'contrarian',
        template: 'Everyone says [common advice]. Here\'s why that\'s wrong:',
        example: 'Everyone says "post daily." I posted 3x/week and grew faster. Here\'s why:',
      },
      {
        type: 'failure_story',
        template: 'I wasted [time/money] doing [thing]. Here\'s what actually works:',
        example: 'I wasted $5,000 on courses. Here\'s the free strategy that worked better:',
      },
      {
        type: 'surprising_data',
        template: '[Unexpected number/stat] about [niche]. Here\'s why it matters:',
        example: '93% of creators quit before seeing results. Here\'s the missing piece:',
      },
      {
        type: 'transformation',
        template: 'From [bad state] to [good state] in [timeframe]. The exact process:',
        example: 'From 0 to 50K followers in 90 days. The exact thread formula:',
      },
    ],
    patternInterrupts: [
      'Stop [doing common thing]',
      'Unpopular opinion:',
      'Hot take:',
      'Real talk:',
      'This will be controversial but...',
    ],
    callToActions: [
      'What\'s your experience with this?',
      'Agree or disagree?',
      'Drop a 🔥 if you needed this',
      'Save this thread. You\'ll need it later.',
      'Retweet if you found this valuable',
    ],
    retentionTactics: [
      'Number threads (1/7 format)',
      'Cliffhanger between tweets',
      'Break up walls of text',
      'Use line breaks strategically',
      'Pattern interrupt every 2-3 tweets',
    ],
  },
  instagram: {
    platform: 'instagram',
    scrollStopTechniques: [
      'First frame: text overlay with bold claim',
      'Movement in first 0.5 seconds',
      'Face close-up with emotional expression',
      'Text: "Stop scrolling if you..."',
      'Transformation before/after split screen',
    ],
    hooks: [
      {
        type: 'direct_address',
        template: 'Stop scrolling if you [pain point]',
        example: 'Stop scrolling if you\'re tired of algorithm changes killing your reach',
      },
      {
        type: 'pov_format',
        template: 'POV: You just discovered [game-changing thing]',
        example: 'POV: You just found the Reels format that changed everything',
      },
      {
        type: 'signs_format',
        template: '[Number] signs you\'re [relatable situation]',
        example: '5 signs you\'re creating content the hard way',
      },
      {
        type: 'controversial',
        template: 'This is controversial but [value statement]',
        example: 'This is controversial but daily posting is killing your growth',
      },
    ],
    patternInterrupts: [
      'Sudden hand gesture',
      'Text overlay appears',
      'Face gets close to camera',
      'Scene/background change',
      'Sound effect',
    ],
    callToActions: [
      'Save this for later',
      'Send this to someone who needs it',
      'Comment [emoji] if you agree',
      'Try this and let me know',
      'Follow for more [niche] tips',
    ],
    retentionTactics: [
      'Tease the payoff in first 2 seconds',
      'Number format (3 tips, 5 mistakes, etc.)',
      'Loop-able endings',
      'Text overlay for key points',
      'Fast transitions',
    ],
  },
  tiktok: {
    platform: 'tiktok',
    scrollStopTechniques: [
      'Trending audio + unexpected visual',
      'Relatable pain point in text overlay',
      'POV format (highly engaging)',
      'Before/after transformation',
      '"Things nobody tells you about..." format',
    ],
    hooks: [
      {
        type: 'things_nobody_tells',
        template: 'Things nobody tells you about [niche]',
        example: 'Things nobody tells you about growing on TikTok',
      },
      {
        type: 'red_flags',
        template: 'Red flags in [niche] you\'re ignoring',
        example: 'Red flags your content strategy isn\'t working',
      },
      {
        type: 'how_actually',
        template: 'How [target persona] actually [achieves goal]',
        example: 'How small creators actually go viral (not what gurus say)',
      },
      {
        type: 'numbered_hacks',
        template: '[Number] [niche] hacks that actually work',
        example: '7 TikTok hacks that got me 1M views',
      },
    ],
    patternInterrupts: [
      'Trending sound starts',
      'Text overlay reveals',
      'Camera zoom/movement',
      'Costume/prop change',
      'Jump cut',
    ],
    callToActions: [
      'Comment if you need part 2',
      'Save this before it gets taken down',
      'Try this and tag me',
      'Which one surprised you?',
      'Drop a [emoji] if you relate',
    ],
    retentionTactics: [
      'Promise specific number of tips',
      'Tease the best for last',
      'Use trending audio',
      'Fast pacing',
      'Comment bait (controversial take)',
    ],
  },
  youtube: {
    platform: 'youtube',
    scrollStopTechniques: [
      'Question that creates curiosity gap',
      'Surprising statistic in first 3 seconds',
      'Bold statement that challenges belief',
      'Visual before/after comparison',
      'Teaser of impressive result',
    ],
    hooks: [
      {
        type: 'wrong_way',
        template: 'Most people get [thing] wrong. Here\'s the right way:',
        example: 'Most people edit Shorts wrong. Here\'s what actually gets views:',
      },
      {
        type: 'surprising_number',
        template: '[Surprising stat] about [niche] that nobody talks about',
        example: '47% of YouTube Shorts fail because of THIS mistake',
      },
      {
        type: 'before_after',
        template: 'Before: [problem]. After: [solution]. Here\'s how:',
        example: 'Before: 100 views. After: 100K views. The one change I made:',
      },
    ],
    patternInterrupts: [
      'Mid-video hook: "But wait..."',
      'Visual change',
      'Text overlay appears',
      'Quick cut to different angle',
      'Sound effect',
    ],
    callToActions: [
      'Subscribe if this helped',
      'Comment your biggest takeaway',
      'Watch this next video',
      'Try this and let me know',
      'Share this with a creator friend',
    ],
    retentionTactics: [
      'Tease payoff early',
      'Mid-roll retention hook',
      'Fast pacing (no dead air)',
      'Visual variety',
      'Promise specific takeaways',
    ],
  },
  linkedin: {
    platform: 'linkedin',
    scrollStopTechniques: [
      'Contrarian professional opinion',
      'Specific metrics/results in first line',
      'Challenge industry norm',
      'Personal failure story with lesson',
      'Surprising career insight',
    ],
    hooks: [
      {
        type: 'unpopular_professional',
        template: 'Unpopular opinion in [industry]:',
        example: 'Unpopular opinion in marketing: Your engagement rate doesn\'t matter.',
      },
      {
        type: 'impressive_metric',
        template: 'We just hit [metric]. Here\'s what we learned:',
        example: 'We just hit $1M ARR. Here\'s what nobody tells you about scaling:',
      },
      {
        type: 'career_lessons',
        template: '[Number] things I wish I knew before [milestone]',
        example: '7 things I wish I knew before becoming a CMO',
      },
      {
        type: 'money_left',
        template: 'If you\'re doing [practice], you\'re leaving money on the table',
        example: 'If you\'re still using vanity metrics, you\'re leaving money on the table',
      },
    ],
    patternInterrupts: [
      'Line break for emphasis',
      'Bullet points',
      'Specific data points',
      'Personal story pivot',
      'Rhetorical question',
    ],
    callToActions: [
      'What\'s your experience with this?',
      'Thoughts?',
      'Agree or disagree?',
      'Share your take in the comments',
      'Connect with me for more insights',
    ],
    retentionTactics: [
      'Short paragraphs (2-3 lines max)',
      'Personal story arc',
      'Credibility markers',
      'Specific examples',
      'Professional vulnerability',
    ],
  },
  facebook: {
    platform: 'facebook',
    scrollStopTechniques: [
      'Relatable story opening',
      'Emotional vulnerability',
      'Community question',
      'Controversial but respectful opinion',
      'Celebration of community win',
    ],
    hooks: [
      {
        type: 'relatable',
        template: 'Can anyone relate? [situation]',
        example: 'Can anyone relate? Spent 3 hours creating content, got 12 views.',
      },
      {
        type: 'change_my_mind',
        template: 'Unpopular opinion: [take]. Change my mind.',
        example: 'Unpopular opinion: You don\'t need to post daily. Change my mind.',
      },
      {
        type: 'group_question',
        template: 'Quick question for the group: [question]',
        example: 'Quick question for the group: What\'s your biggest content struggle?',
      },
      {
        type: 'story_time',
        template: 'Story time: [personal story with lesson]',
        example: 'Story time: I almost quit content creation last month. Here\'s what changed:',
      },
    ],
    patternInterrupts: [
      'Emoji for visual break',
      'Paragraph spacing',
      'Personal aside',
      'Question to reader',
      'Story pivot',
    ],
    callToActions: [
      'Drop a comment if you agree',
      'Share your experience below',
      'Tag someone who needs this',
      'What do you think?',
      'Join the conversation',
    ],
    retentionTactics: [
      'Conversational tone',
      'Story structure',
      'Emotional connection',
      'Community focus',
      'Longer-form OK (100-300 words)',
    ],
  },
};

/** @deprecated Source of truth moved to lib/ai/skills/social-content */
export const CONTRARIAN_ANGLES: ContrarianAngle[] = [
  {
    type: 'challenge_status_quo',
    template: 'Everyone in [niche] does [common practice]. Here\'s why that\'s backwards:',
    examples: [
      'Everyone in content creation posts daily. Here\'s why that\'s backwards:',
      'Everyone in marketing focuses on reach. Here\'s why that\'s backwards:',
    ],
  },
  {
    type: 'reveal_truth',
    template: '[Guru advice] worked in [past year]. It doesn\'t work anymore. Here\'s what does:',
    examples: [
      'Hashtag spam worked in 2020. It doesn\'t work anymore. Here\'s what does:',
      'Posting at "optimal times" worked last year. It doesn\'t work anymore. Here\'s what does:',
    ],
  },
  {
    type: 'expose_myth',
    template: 'Myth: [common belief]. Reality: [truth]. Here\'s the data:',
    examples: [
      'Myth: You need 10K followers to make money. Reality: I made $5K with 500. Here\'s how:',
      'Myth: Viral content = business success. Reality: It killed my business. Here\'s why:',
    ],
  },
  {
    type: 'unpopular_opinion',
    template: 'Unpopular opinion: [controversial take supported by evidence]',
    examples: [
      'Unpopular opinion: Your engagement rate is a vanity metric',
      'Unpopular opinion: Content consistency is overrated. Quality beats quantity.',
    ],
  },
];

/** @deprecated Source of truth moved to lib/ai/skills/social-content */
export const RESULTS_FOCUSED_FRAMING: ResultsFocusedFraming[] = [
  {
    type: 'time_bound_transformation',
    template: 'From [starting point] to [endpoint] in [specific timeframe]. The exact process:',
    requiredElements: ['Specific starting metric', 'Specific ending metric', 'Exact timeframe', 'Concrete steps'],
  },
  {
    type: 'cost_benefit',
    template: 'I spent [amount] on [thing]. Here\'s the [$ amount/metric] return and how:',
    requiredElements: ['Specific investment', 'Specific return', 'ROI calculation', 'Method used'],
  },
  {
    type: 'failure_to_success',
    template: '[Failed attempt] cost me [specific loss]. [New approach] generated [specific gain]. The difference:',
    requiredElements: ['Failed method', 'Quantified loss', 'New method', 'Quantified gain'],
  },
  {
    type: 'comparative_results',
    template: 'Method A: [result]. Method B: [result]. I tested both for [timeframe]. Winner:',
    requiredElements: ['Two specific methods', 'Results for each', 'Test duration', 'Clear winner'],
  },
];

/** @deprecated Source of truth moved to lib/ai/skills/social-content */
export function getEngagementStrategy(platform: string): EngagementStrategy {
  return PLATFORM_ENGAGEMENT_STRATEGIES[platform.toLowerCase()] || PLATFORM_ENGAGEMENT_STRATEGIES['twitter'];
}

/** @deprecated Source of truth moved to lib/ai/skills/social-content */
export function getRandomHook(platform: string): string {
  const strategy = getEngagementStrategy(platform);
  const hooks = strategy.hooks;
  return hooks[Math.floor(Math.random() * hooks.length)].template;
}

/** @deprecated Source of truth moved to lib/ai/skills/social-content */
export function getContrarianAngle(type?: ContrarianAngle['type']): ContrarianAngle {
  if (type) {
    return CONTRARIAN_ANGLES.find(angle => angle.type === type) || CONTRARIAN_ANGLES[0];
  }
  return CONTRARIAN_ANGLES[Math.floor(Math.random() * CONTRARIAN_ANGLES.length)];
}
