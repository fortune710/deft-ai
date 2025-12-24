export const PLATFORM_PSYCHOLOGY = {
  twitter: {
    algorithmPreferences: [
      'Threads with high engagement rate (replies, retweets, likes)',
      'Content that keeps users on platform (no external links in first tweet)',
      'Replies and conversations (boosts all tweets in thread)',
      'Consistent posting schedule',
      'High completion rate (people read whole thread)',
    ],
    audienceBehavior: [
      'Scan first tweet to decide if worth reading',
      'Love specific numbers and data points',
      'Engage with contrarian takes',
      'Save valuable threads for later',
      'Retweet content that makes them look smart',
    ],
    contentPsychology: [
      'Hook must create curiosity gap',
      'Each tweet should be quotable',
      'Numbers and specific examples build credibility',
      'Personal stories create connection',
      'Controversy drives engagement (respectful)',
    ],
    bestPractices: [
      'One idea per tweet',
      'Line breaks for readability',
      'End with CTA for engagement',
      'Reply to your own thread to boost',
      'Pin successful threads',
    ],
  },
  instagram: {
    algorithmPreferences: [
      'Watch time and completion rate',
      'Saves (highest signal of value)',
      'Shares to Stories and DMs',
      'Comments and meaningful interactions',
      'Accounts that retain viewers (don\'t send away)',
    ],
    audienceBehavior: [
      'Decide to watch in first 0.5 seconds',
      'Save content they want to reference later',
      'Share content that makes them look good',
      'Comment when emotionally moved or have strong opinion',
      'Follow accounts that consistently provide value',
    ],
    contentPsychology: [
      'Visual hook must stop scroll',
      'Text overlay for accessibility and retention',
      'Transformation content highly valued',
      'Behind-the-scenes creates connection',
      'Educational + entertaining = most saves',
    ],
    bestPractices: [
      'First frame is everything',
      'Text overlay for silent viewers',
      'Trending audio increases reach',
      'Caption complements video',
      'CTA: Save for later (best for algorithm)',
    ],
  },
  tiktok: {
    algorithmPreferences: [
      'Completion rate (watch to end)',
      'Rewatch rate (loop back)',
      'Shares (massive signal)',
      'Comments (controversy and questions boost)',
      'Watch from For You vs Following (fresh content wins)',
    ],
    audienceBehavior: [
      'Instant judgment (swipe or stay)',
      'Love relatable content',
      'Engage with POV formats',
      'Comment to join conversation',
      'Follow if multiple videos resonate',
    ],
    contentPsychology: [
      'Relatability > production value',
      'Trending = trust (familiar patterns)',
      'Story structure with payoff keeps watching',
      'Controversy and strong opinions drive comments',
      'Authenticity resonates more than polish',
    ],
    bestPractices: [
      'Use trending sounds',
      'Fast pace (no wasted seconds)',
      'Text overlay for accessibility',
      'Hook in first second',
      'Leave comment bait',
    ],
  },
  youtube: {
    algorithmPreferences: [
      'Average view duration (retention)',
      'Click-through rate on thumbnail',
      'Watch after (suggests more)',
      'Session time (keeps users on YouTube)',
      'Likes, comments, shares (engagement)',
    ],
    audienceBehavior: [
      'Click based on thumbnail + title combo',
      'Decide to keep watching in first 3 seconds',
      'Skip if doesn\'t deliver on promise',
      'Subscribe when consistent value delivered',
      'Comment when prompted or have strong opinion',
    ],
    contentPsychology: [
      'Curiosity gap between title and answer',
      'Pattern interrupts maintain attention',
      'Promised value must be delivered',
      'Fast pacing = higher retention',
      'Visual variety keeps interest',
    ],
    bestPractices: [
      'Hook delivers on title promise',
      'Tease payoff early',
      'Mid-roll retention hook',
      'No dead air or filler',
      'Strong CTA at end',
    ],
  },
  linkedin: {
    algorithmPreferences: [
      'Dwell time (how long people read)',
      'Meaningful comments (not just emojis)',
      'Shares and reposts',
      'Professional value and insights',
      'Connection building (tags, mentions)',
    ],
    audienceBehavior: [
      'Scan first line to decide if relevant',
      'Engage with career-relevant content',
      'Share content that builds their brand',
      'Comment to network and be visible',
      'Follow thought leaders in their field',
    ],
    contentPsychology: [
      'Professional credibility is key',
      'Vulnerability when authentic resonates',
      'Data and results build authority',
      'Industry insights position as expert',
      'Challenging norms shows thought leadership',
    ],
    bestPractices: [
      'First line is hook',
      'Short paragraphs (mobile friendly)',
      '3-5 hashtags (relevant)',
      'Ask thoughtful question',
      'Respond to all comments',
    ],
  },
  facebook: {
    algorithmPreferences: [
      'Meaningful interactions (comments, shares)',
      'Content that sparks conversation',
      'Time spent reading and engaging',
      'Shares to groups and personal timelines',
      'Community building content',
    ],
    audienceBehavior: [
      'Engage with relatable stories',
      'Comment to share own experiences',
      'Share content to specific people (tagging)',
      'Join discussions on topics they care about',
      'Follow accounts that feel like friends',
    ],
    contentPsychology: [
      'Emotional stories create connection',
      'Community focus over self-promotion',
      'Vulnerability builds trust',
      'Conversational tone feels authentic',
      'Questions and discussions drive engagement',
    ],
    bestPractices: [
      'Story-based content',
      'Ask genuine questions',
      'Longer form OK (build depth)',
      'Respond to all comments',
      'Create conversation, not broadcast',
    ],
  },
};

export function getPlatformPsychology(platform: string) {
  return PLATFORM_PSYCHOLOGY[platform.toLowerCase() as keyof typeof PLATFORM_PSYCHOLOGY] || PLATFORM_PSYCHOLOGY.twitter;
}

export function buildPlatformContext(platform: string): string {
  const psychology = getPlatformPsychology(platform);

  return `
PLATFORM: ${platform.toUpperCase()}

ALGORITHM PRIORITIES:
${psychology.algorithmPreferences.map((pref, i) => `${i + 1}. ${pref}`).join('\n')}

AUDIENCE BEHAVIOR:
${psychology.audienceBehavior.map((behavior, i) => `${i + 1}. ${behavior}`).join('\n')}

CONTENT PSYCHOLOGY:
${psychology.contentPsychology.map((psych, i) => `${i + 1}. ${psych}`).join('\n')}

BEST PRACTICES:
${psychology.bestPractices.map((practice, i) => `${i + 1}. ${practice}`).join('\n')}
  `.trim();
}
