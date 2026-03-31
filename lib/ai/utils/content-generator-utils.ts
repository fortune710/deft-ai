import { GeneratedContent } from '@/types/ai-agents';
import { PlatformContent } from '@/types/generated-content-types';

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
