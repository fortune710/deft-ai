import { generateObjectWithModel, generateTextWithModel } from '../models';
import { AIModelConfig } from '@/types/ai-models';
import { ScoredContentIdea } from '@/types/ai-agents';
import { PlatformContent } from '@/types/generated-content-types';
import { getContentSchema } from '../schemas/content-schemas';

export async function generatePlatformContent(
  idea: ScoredContentIdea,
  context: { niche: string; targetAudience: string },
  prompt: string,
  modelConfig: AIModelConfig
): Promise<PlatformContent['content']> {
  const schema = getContentSchema(idea.platform);

  const systemPrompt =
    'You are an expert content creator. Return ONLY valid JSON with the exact structure requested. No markdown, no explanations, no code blocks.';

  const content = await generateObjectWithModel(modelConfig, schema, prompt, systemPrompt);

  return content;
}

export async function generateFallbackContent(idea: ScoredContentIdea, modelConfig: AIModelConfig): Promise<string> {
  const fallbackPrompt = `
Create a simple, short social media post based on this idea:
Title: ${idea.title}
Description: ${idea.description}
Platform: ${idea.platform}

Keep it concise and engaging. Just return the post text, no JSON.
  `.trim();

  const systemPrompt = 'You are a content creator. Return only the post text, no explanations.';

  return generateTextWithModel(modelConfig, fallbackPrompt, systemPrompt);
}

export function validatePlatformContent(
  platform: string,
  content: any
): content is PlatformContent['content'] {
  const platformLower = platform.toLowerCase();

  switch (platformLower) {
    case 'twitter':
    case 'linkedin':
      return (
        typeof content === 'object' &&
        typeof content.script_content === 'string' &&
        Array.isArray(content.hashtags)
      );
    case 'instagram':
    case 'tiktok':
      return (
        typeof content === 'object' &&
        typeof content.caption === 'string' &&
        typeof content.script_content === 'string' &&
        Array.isArray(content.visual_cues) &&
        typeof content.audio_suggestion === 'string' &&
        Array.isArray(content.hashtags)
      );
    case 'youtube':
      return (
        typeof content === 'object' &&
        typeof content.caption === 'string' &&
        typeof content.script_content === 'string' &&
        Array.isArray(content.visual_cues) &&
        Array.isArray(content.hashtags)
      );
    case 'facebook':
      return (
        typeof content === 'object' &&
        typeof content.caption === 'string' &&
        typeof content.script_content === 'string' &&
        Array.isArray(content.hashtags)
      );
    default:
      return false;
  }
}

export function extractMetadataFromContent(platform: string, content: any) {
  return {
    hookType: 'generated',
    structure: 'optimized_for_platform',
    callToAction: 'engagement_focused',
    visualCues: content.visual_cues || [],
    audioSuggestion: content.audio_suggestion || '',
  };
}
