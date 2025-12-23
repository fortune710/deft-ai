import { GoogleGenerativeAI } from '@google/generative-ai';
import { addDays, format } from 'date-fns';
import type { UserContentProfile } from '@/types/niche-mapping';
import type { Platform, ItemContent } from '@/types/content-engine';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

interface GeneratedContentItem {
  title: string;
  description: string;
  platform: Platform;
  scheduled_date: string;
  content: ItemContent;
}

export interface Generate30DayPlanConfig {
  userProfile: UserContentProfile;
  startDate: Date;
  platforms: Platform[];
}

function getPostsPerDay(frequency: string): number {
  const frequencyMap: Record<string, number> = {
    '1_2_per_week': 0.21,
    '3_4_per_week': 0.5,
    'daily': 1,
    'not_sure': 0.5,
  };
  return frequencyMap[frequency] || 0.5;
}

function distributeDates(startDate: Date, totalPosts: number, daysSpan: number = 30): string[] {
  const dates: string[] = [];
  const interval = Math.floor(daysSpan / totalPosts);

  for (let i = 0; i < totalPosts; i++) {
    const date = addDays(startDate, i * interval);
    dates.push(format(date, 'yyyy-MM-dd'));
  }

  return dates;
}

function buildContentGenerationPrompt(
  userProfile: UserContentProfile,
  platforms: Platform[],
  totalPosts: number
): string {
  const aiContext = userProfile.ai_context;
  const pillars = aiContext?.content_pillars || [];
  const toneGuidance = aiContext?.tone_guidance;

  return `You are an expert content strategist generating a 30-day content calendar.

USER PROFILE:
- Niche: ${userProfile.question_1_niche}
- Goal: ${userProfile.question_2_goal}
- Platforms: ${platforms.join(', ')}
- Experience: ${userProfile.question_4_experience}
- Content Pillars: ${pillars.join(', ')}
- Tone: ${toneGuidance?.formality || 'casual'} formality, ${toneGuidance?.energy || 'moderate'} energy

Generate ${totalPosts} content ideas distributed across 30 days. For each content piece, provide:

1. A catchy title (5-10 words)
2. A brief description (1-2 sentences)
3. Target platform from: ${platforms.join(', ')}
4. Complete content package including:
   - hook_suggestion: An attention-grabbing opening (1-2 sentences)
   - script_content: Full script/content body (150-300 words for video, 50-100 for short-form)
   - cta_suggestion: A compelling call-to-action (1 sentence)
   - hashtags: 5-10 relevant hashtags (as array of strings without # symbol)
   - clip_suggestions: 3-5 B-roll/visual ideas (as array of strings)
   - caption: Platform-optimized caption (20-100 words)

Ensure content:
- Covers all content pillars evenly
- Varies in format (educational, entertaining, inspirational, promotional)
- Is platform-appropriate (longer for YouTube, shorter for TikTok/Instagram)
- Aligns with user's niche and goals
- Has strategic CTAs (engagement, conversion, community-building)

Return ONLY a valid JSON array with this structure:
[
  {
    "title": "Content title here",
    "description": "Brief description",
    "platform": "youtube|instagram|tiktok|twitter|linkedin|facebook",
    "content": {
      "hook_suggestion": "Opening hook",
      "script_content": "Full script content here...",
      "cta_suggestion": "Call to action",
      "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
      "clip_suggestions": ["B-roll idea 1", "B-roll idea 2", "B-roll idea 3"],
      "caption": "Platform caption here..."
    }
  }
]

IMPORTANT: Return ONLY the JSON array, no additional text.`;
}

export async function generate30DayContentPlan(
  config: Generate30DayPlanConfig
): Promise<GeneratedContentItem[]> {
  try {
    const { userProfile, startDate, platforms } = config;

    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      throw new Error('API key not configured. Please check your environment variables.');
    }

    if (!platforms || platforms.length === 0) {
      throw new Error('No platforms selected');
    }

    const postsPerDay = getPostsPerDay(userProfile.question_5_frequency || 'daily');
    const totalPosts = Math.ceil(30 * postsPerDay);

    if (totalPosts === 0) {
      throw new Error('Invalid posting frequency configuration');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = buildContentGenerationPrompt(userProfile, platforms, totalPosts);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error('Empty response from AI');
    }

    const items = parseContentGenerationResponse(text);

    if (items.length === 0) {
      throw new Error('AI generated no content items');
    }

    const dates = distributeDates(startDate, items.length, 30);

    const contentItems: GeneratedContentItem[] = items.map((item, index) => ({
      ...item,
      scheduled_date: dates[index] || dates[dates.length - 1],
    }));

    return contentItems;
  } catch (error: any) {
    console.error('Error generating 30-day content plan:', error);

    if (error?.message?.includes('API key')) {
      throw error;
    }

    if (error?.message?.includes('PERMISSION_DENIED') || error?.message?.includes('403')) {
      throw new Error('API key permission denied. Please check your Gemini API key.');
    }

    if (error?.message?.includes('INVALID_ARGUMENT') || error?.message?.includes('400')) {
      throw new Error('Invalid request. Please try again.');
    }

    if (error?.message) {
      throw error;
    }

    throw new Error('Failed to generate content plan. Please try again.');
  }
}

function parseContentGenerationResponse(text: string): Omit<GeneratedContentItem, 'scheduled_date'>[] {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('Raw AI response:', text);
      throw new Error('AI response was not in expected format. Please try again.');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed)) {
      throw new Error('AI response was not a valid array');
    }

    if (parsed.length === 0) {
      throw new Error('AI generated no content items');
    }

    return parsed.map((item, index) => ({
      title: item.title || `Content Idea ${index + 1}`,
      description: item.description || 'No description provided',
      platform: item.platform || 'youtube',
      content: {
        hook_suggestion: item.content?.hook_suggestion || '',
        script_content: item.content?.script_content || '',
        cta_suggestion: item.content?.cta_suggestion || '',
        hashtags: Array.isArray(item.content?.hashtags) ? item.content.hashtags : [],
        clip_suggestions: Array.isArray(item.content?.clip_suggestions)
          ? item.content.clip_suggestions
          : [],
        caption: item.content?.caption || '',
      },
    }));
  } catch (error: any) {
    console.error('Error parsing content generation response:', error);
    if (error?.message?.includes('JSON')) {
      throw new Error('AI returned invalid data format. Please try again.');
    }
    throw error;
  }
}

export async function regenerateContentSection(
  userProfile: UserContentProfile,
  contentTitle: string,
  platform: Platform,
  section: 'hook_suggestion' | 'script_content' | 'cta_suggestion' | 'hashtags' | 'clip_suggestions' | 'caption'
): Promise<string | string[]> {
  try {
    const aiContext = userProfile.ai_context;
    const pillars = aiContext?.content_pillars || [];

    const sectionPrompts: Record<string, string> = {
      hook_suggestion: `Generate an attention-grabbing opening hook (1-2 sentences) for a ${platform} post titled "${contentTitle}" in the ${userProfile.question_1_niche} niche.`,
      script_content: `Generate a complete script (150-300 words for video, 50-100 for short-form) for a ${platform} post titled "${contentTitle}" in the ${userProfile.question_1_niche} niche. Cover: ${pillars.join(', ')}.`,
      cta_suggestion: `Generate a compelling call-to-action (1 sentence) for a ${platform} post titled "${contentTitle}" aligned with the goal: ${userProfile.question_2_goal}.`,
      hashtags: `Generate 5-10 relevant hashtags for a ${platform} post titled "${contentTitle}" in the ${userProfile.question_1_niche} niche. Return as JSON array of strings WITHOUT # symbol.`,
      clip_suggestions: `Generate 3-5 B-roll/visual clip ideas for a ${platform} post titled "${contentTitle}". Return as JSON array of strings.`,
      caption: `Generate a platform-optimized caption (20-100 words) for a ${platform} post titled "${contentTitle}" in the ${userProfile.question_1_niche} niche.`,
    };

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = sectionPrompts[section];

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (section === 'hashtags' || section === 'clip_suggestions') {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return Array.isArray(parsed) ? parsed : [];
      }
      return text.split('\n').filter((line) => line.trim());
    }

    return text.trim();
  } catch (error) {
    console.error(`Error regenerating ${section}:`, error);
    throw new Error(`Failed to regenerate ${section}. Please try again.`);
  }
}
