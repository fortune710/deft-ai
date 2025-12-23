import { GoogleGenerativeAI } from '@google/generative-ai';
import type { UserContentProfile } from '@/types/niche-mapping';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

interface GenerateScriptConfig {
  userProfile: UserContentProfile;
  topic: string;
  contentPillar: string;
  platform: string;
}

interface GeneratedScript {
  hook: string;
  fullScript: string;
  cta: string;
  hashtags: string[];
  bRollSuggestions: string[];
  duration: string;
}

function buildScriptPrompt(
  userProfile: UserContentProfile,
  topic: string,
  contentPillar: string,
  platform: string
): string {
  const aiContext = userProfile.ai_context;
  const toneGuidance = aiContext?.tone_guidance;
  const niche = userProfile.question_1_niche;
  const goal = userProfile.question_2_goal;
  const experience = userProfile.question_4_experience;

  const platformGuidance: Record<string, string> = {
    youtube: 'YouTube (2-10 minutes, detailed and educational)',
    instagram: 'Instagram Reels (15-60 seconds, visually engaging)',
    tiktok: 'TikTok (15-60 seconds, fast-paced and trendy)',
    twitter: 'Twitter/X (30-60 seconds, concise and punchy)',
    linkedin: 'LinkedIn (1-3 minutes, professional and insightful)',
    facebook: 'Facebook (1-3 minutes, community-focused)',
  };

  return `You are an expert content creator and scriptwriter specializing in ${niche}.

USER PROFILE:
- Niche: ${niche}
- Content Pillar: ${contentPillar}
- Goal: ${goal}
- Platform: ${platformGuidance[platform.toLowerCase()] || platform}
- Experience Level: ${experience}
- Tone: ${toneGuidance?.formality || 'casual'} formality, ${toneGuidance?.energy || 'moderate'} energy

TASK:
Generate a complete video script for the following topic: "${topic}"

The script MUST align with the content pillar "${contentPillar}" and should help achieve the goal: "${goal}".

Provide a JSON response with the following structure:
{
  "hook": "An attention-grabbing opening (1-2 sentences that make viewers stop scrolling)",
  "fullScript": "The complete script content (150-400 words depending on platform)",
  "cta": "A compelling call-to-action (1 sentence encouraging specific viewer action)",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"] (5-8 relevant hashtags WITHOUT # symbol),
  "bRollSuggestions": ["suggestion1", "suggestion2", "suggestion3"] (4-6 visual/B-roll ideas),
  "duration": "Estimated duration in format like '0:45' or '2:30'"
}

SCRIPT REQUIREMENTS:
1. Hook must be irresistible and create curiosity
2. Script should flow naturally in a conversational tone
3. Content must be valuable and actionable
4. Include storytelling elements where appropriate
5. CTA should align with "${goal}"
6. Hashtags must be specific to ${niche} and ${contentPillar}
7. B-roll suggestions should be practical and achievable

PLATFORM-SPECIFIC GUIDANCE:
${platform.toLowerCase() === 'youtube' ? '- Detailed explanations with clear structure\n- Include timestamps mentally (intro, main points, conclusion)\n- Educational and thorough' : ''}
${platform.toLowerCase() === 'instagram' || platform.toLowerCase() === 'tiktok' ? '- Fast-paced and engaging\n- Hook within first 2 seconds\n- Visual and trendy\n- Short and punchy' : ''}
${platform.toLowerCase() === 'linkedin' ? '- Professional and insightful\n- Data or experience-backed\n- Value-driven for professionals' : ''}

Return ONLY valid JSON, no additional text.`;
}

export async function generateScript(
  config: GenerateScriptConfig
): Promise<GeneratedScript> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = buildScriptPrompt(
      config.userProfile,
      config.topic,
      config.contentPillar,
      config.platform
    );

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return parseScriptResponse(text);
  } catch (error) {
    console.error('Error generating script:', error);
    throw new Error('Failed to generate script. Please try again.');
  }
}

function parseScriptResponse(text: string): GeneratedScript {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      hook: parsed.hook || 'Want to know the secret?',
      fullScript: parsed.fullScript || 'Script content would go here...',
      cta: parsed.cta || 'Follow for more tips!',
      hashtags: Array.isArray(parsed.hashtags)
        ? parsed.hashtags.map((h: string) => h.replace(/^#/, ''))
        : [],
      bRollSuggestions: Array.isArray(parsed.bRollSuggestions)
        ? parsed.bRollSuggestions
        : [],
      duration: parsed.duration || '1:00',
    };
  } catch (error) {
    console.error('Error parsing script response:', error);
    throw new Error('Failed to parse AI response. Please try again.');
  }
}

export async function regenerateScriptSection(
  userProfile: UserContentProfile,
  topic: string,
  contentPillar: string,
  platform: string,
  section: 'hook' | 'cta' | 'hashtags' | 'bRollSuggestions'
): Promise<string | string[]> {
  try {
    const niche = userProfile.question_1_niche;
    const goal = userProfile.question_2_goal;

    const sectionPrompts: Record<string, string> = {
      hook: `Generate an attention-grabbing hook (1-2 sentences) for a ${platform} video about "${topic}" in the ${niche} niche, focusing on ${contentPillar}. Make it irresistible.`,
      cta: `Generate a compelling call-to-action (1 sentence) for a ${platform} video about "${topic}" that aligns with the goal: ${goal}.`,
      hashtags: `Generate 5-8 relevant hashtags for a ${platform} video about "${topic}" in the ${niche} niche, focusing on ${contentPillar}. Return as JSON array WITHOUT # symbol.`,
      bRollSuggestions: `Generate 4-6 practical B-roll/visual suggestions for a ${platform} video about "${topic}" in the ${niche} niche. Return as JSON array.`,
    };

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = sectionPrompts[section];

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (section === 'hashtags' || section === 'bRollSuggestions') {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return Array.isArray(parsed)
          ? parsed.map((item: string) => item.replace(/^#/, ''))
          : [];
      }
      return text.split('\n').filter((line) => line.trim());
    }

    return text.trim();
  } catch (error) {
    console.error(`Error regenerating ${section}:`, error);
    throw new Error(`Failed to regenerate ${section}. Please try again.`);
  }
}
