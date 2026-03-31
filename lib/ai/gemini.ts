import { GoogleGenerativeAI } from '@google/generative-ai';
import { OnboardingFormData, AIContext } from '@/types/niche-mapping';
import {
  GOAL_OPTIONS,
  PLATFORM_OPTIONS,
  EXPERIENCE_OPTIONS,
  FREQUENCY_OPTIONS,
} from '@/lib/validations/onboarding/options';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export function buildOnboardingPrompt(data: OnboardingFormData): string {
  const goalLabel =
    GOAL_OPTIONS.find((o) => o.value === data.question_2_goal)?.label || data.question_2_goal;
  const platforms = data.question_3_platforms
    .map((p) => {
      const platform = PLATFORM_OPTIONS.find((o) => o.value === p.name);
      return `${platform?.label || p.name}${p.isPrimary ? ' (PRIMARY)' : ''}`;
    })
    .join(', ');
  const experienceLabel =
    EXPERIENCE_OPTIONS.find((o) => o.value === data.question_4_experience)?.label ||
    data.question_4_experience;
  const frequencyLabel =
    FREQUENCY_OPTIONS.find((o) => o.value === data.question_5_frequency)?.label ||
    data.question_5_frequency;

  return `You are an expert content strategist. A content creator has completed an onboarding questionnaire. Based on their responses, generate a comprehensive content strategy.

USER PROFILE:
- Niche: ${data.question_1_niche}
- Primary Goal: ${goalLabel}
- Platforms: ${platforms}
- Experience Level: ${experienceLabel}
- Posting Frequency: ${frequencyLabel}

Generate a detailed content strategy as a JSON object with the following structure:

{
  "content_pillars": [
    "Pillar 1 title and brief description",
    "Pillar 2 title and brief description",
    "Pillar 3 title and brief description",
    "Pillar 4 title and brief description (optional)",
    "Pillar 5 title and brief description (optional)"
  ],
  "mini_series_ideas": [
    {
      "title": "Series title",
      "description": "What this series is about",
      "episode_count": 5
    }
  ],
  "script_templates": {
    "hooks": [
      "Hook template 1 for their primary platform",
      "Hook template 2",
      "Hook template 3"
    ],
    "structures": [
      {
        "name": "Structure name (e.g., Problem-Solution-CTA)",
        "template": "Step-by-step template description"
      }
    ]
  },
  "posting_cadence": {
    "frequency": "Recommended posting schedule based on their answer",
    "best_times": ["Time recommendation 1", "Time recommendation 2"],
    "consistency_tips": ["Tip 1", "Tip 2", "Tip 3"]
  },
  "reference_creators": [
    {
      "name": "Creator name",
      "platform": "Their platform",
      "why": "Why studying them helps"
    }
  ],
  "cta_strategies": [
    {
      "type": "CTA type (e.g., engagement, conversion)",
      "examples": ["Example 1", "Example 2"]
    }
  ],
  "tone_guidance": {
    "formality": "casual|professional|mix",
    "energy": "high|moderate|calm",
    "complexity": "beginner-friendly|intermediate|advanced",
    "voice_notes": ["Note about voice 1", "Note about voice 2"]
  }
}

IMPORTANT:
- Tailor everything specifically to their niche: "${data.question_1_niche}"
- Align all recommendations with their goal: "${goalLabel}"
- Optimize for their primary platform
- Match the complexity to their experience level
- Be specific and actionable, not generic
- Return ONLY valid JSON, no additional text`;
}

export async function generateAIContext(data: OnboardingFormData): Promise<AIContext> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = buildOnboardingPrompt(data);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const aiContext = parseAIResponse(text);
    return aiContext;
  } catch (error) {
    console.error('Error generating AI context:', error);
    throw new Error('Failed to generate AI content strategy');
  }
}

export function parseAIResponse(text: string): AIContext {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const aiContext: AIContext = {
      content_pillars: parsed.content_pillars || [],
      mini_series_ideas: parsed.mini_series_ideas || [],
      script_templates: parsed.script_templates || { hooks: [], structures: [] },
      posting_cadence: parsed.posting_cadence || {
        frequency: '',
        best_times: [],
        consistency_tips: [],
      },
      reference_creators: parsed.reference_creators || [],
      cta_strategies: parsed.cta_strategies || [],
      tone_guidance: parsed.tone_guidance || {
        formality: 'casual',
        energy: 'moderate',
        complexity: 'intermediate',
        voice_notes: [],
      },
    };

    return aiContext;
  } catch (error) {
    console.error('Error parsing AI response:', error);
    throw new Error('Failed to parse AI response');
  }
}

export function buildSystemPrompt(
  data: OnboardingFormData,
  aiContext: AIContext
): string {
  const primaryPlatform = data.question_3_platforms.find((p) => p.isPrimary);
  const platformLabel =
    PLATFORM_OPTIONS.find((o) => o.value === primaryPlatform?.name)?.label ||
    primaryPlatform?.name;
  const goalLabel =
    GOAL_OPTIONS.find((o) => o.value === data.question_2_goal)?.label || data.question_2_goal;

  const pillarsText = aiContext.content_pillars.join(', ');
  const toneText = `${aiContext.tone_guidance.formality} formality, ${aiContext.tone_guidance.energy} energy, ${aiContext.tone_guidance.complexity} complexity`;

  return `You are creating content for the "${data.question_1_niche}" niche. The primary goal is to ${goalLabel.toLowerCase()}, and the content is optimized for ${platformLabel}.

Content should focus on these pillars: ${pillarsText}.

Maintain a ${toneText}. ${aiContext.tone_guidance.voice_notes.join(' ')}

CTAs should ${aiContext.cta_strategies.map((cta) => cta.type).join(' and ')}.`;
}
