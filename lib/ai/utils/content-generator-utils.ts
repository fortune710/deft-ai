import { GeneratedContent } from '@/types/ai-agents';
import { PlatformContent } from '@/types/generated-content-types';
import { AI_MODELS, AIModelConfig } from '@/types/ai-models';

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

export function extractMetadataFromContent(platform: string, content: any): GeneratedContent['metadata'] {
  return {
    hookType: 'generated',
    structure: 'optimized_for_platform',
    callToAction: 'engagement_focused',
    visualCues: content.visual_cues || [],
    audioSuggestion: content.audio_suggestion || '',
  };
}

/**
 * Centrailzed helper to determine the best model for a specific platform.
 * Some platforms (like Twitter/LinkedIn) benefit from reasoning models due to the nuance required.
 */
export function getModelForPlatform(platform: string, defaultConfig: AIModelConfig = AI_MODELS.GOOGLE_FLASH): AIModelConfig {
  const platformLower = platform.toLowerCase();

  if (platformLower === 'twitter' || platformLower === 'linkedin') {
    // For Twitter/LinkedIn, we use reasoning models for idea generation, 
    // and non-reasoning variants for content generation if applicable,
    // but the agents will decide which specific variant (Reasoning vs Non-Reasoning) based on the task.
    // Here we provide a sane default.
    return AI_MODELS.GROK_REASONING;
  }

  return defaultConfig;
}
