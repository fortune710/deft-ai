import { ContentIdea } from './ai-agents';

export interface TwitterContent {
  script_content: string;
  hashtags: string[];
}

export interface LinkedInContent {
  script_content: string;
  hashtags: string[];
}

export interface InstagramContent {
  caption: string;
  script_content: string;
  visual_cues: string[];
  audio_suggestion: string;
  hashtags: string[];
}

export interface TikTokContent {
  caption: string;
  script_content: string;
  visual_cues: string[];
  audio_suggestion: string;
  hashtags: string[];
}

export interface YouTubeContent {
  caption: string;
  script_content: string;
  visual_cues: string[];
  hashtags: string[];
}

export interface FacebookContent {
  caption: string;
  script_content: string;
  hashtags: string[];
}

export type PlatformContent =
  | { platform: 'twitter'; content: TwitterContent }
  | { platform: 'linkedin'; content: LinkedInContent }
  | { platform: 'instagram'; content: InstagramContent }
  | { platform: 'tiktok'; content: TikTokContent }
  | { platform: 'youtube'; content: YouTubeContent }
  | { platform: 'facebook'; content: FacebookContent };

export interface GeneratedContentOutput {
  idea: ContentIdea;
  platform: string;
  scheduledDate: Date;
  content: PlatformContent['content'];
  hashtags: string[];
  metadata: {
    hookType?: string;
    structure?: string;
    callToAction?: string;
    visualCues?: string[];
    audioSuggestion?: string;
  };
}
