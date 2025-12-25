import { z } from 'zod';

export const TwitterContentSchema = z.object({
  script_content: z.string().describe('Complete Twitter thread with all tweets (3-10 tweets). Each tweet should be numbered (1/X, 2/X, etc.) and separated by line breaks. Keep each tweet under 280 characters. Include all tweets in this single field.'),
  hashtags: z.array(z.string()).describe('Relevant hashtags for the thread (without # symbol)'),
});

export const LinkedInContentSchema = z.object({
  script_content: z.string().describe('The main LinkedIn post content'),
  hashtags: z.array(z.string()).describe('Professional hashtags'),
});

export const InstagramContentSchema = z.object({
  caption: z.string().describe('The Instagram caption for the post'),
  script_content: z.string().describe('The reel script with timing and visual cues'),
  visual_cues: z.array(z.string()).describe('List of visual suggestions and transitions'),
  audio_suggestion: z.string().describe('Suggested trending audio or music style'),
  hashtags: z.array(z.string()).describe('Instagram hashtags (10-30)'),
});

export const TikTokContentSchema = z.object({
  caption: z.string().describe('The TikTok caption'),
  script_content: z.string().describe('The TikTok script with timing and actions'),
  visual_cues: z.array(z.string()).describe('Visual transitions and on-screen text suggestions'),
  audio_suggestion: z.string().describe('Trending audio recommendation or music style'),
  hashtags: z.array(z.string()).describe('TikTok hashtags (3-5 trending)'),
});

export const YouTubeContentSchema = z.object({
  caption: z.string().describe('The YouTube Short description'),
  script_content: z.string().describe('The script with timing and retention hooks'),
  visual_cues: z.array(z.string()).describe('Visual suggestions and B-roll notes'),
  hashtags: z.array(z.string()).describe('Relevant YouTube hashtags'),
});

export const FacebookContentSchema = z.object({
  caption: z.string().describe('The Facebook post content'),
  script_content: z.string().describe('The full post text'),
  hashtags: z.array(z.string()).describe('Facebook hashtags'),
});

export function getContentSchema(platform: string): z.ZodSchema {
  switch (platform.toLowerCase()) {
    case 'twitter':
      return TwitterContentSchema;
    case 'linkedin':
      return LinkedInContentSchema;
    case 'instagram':
      return InstagramContentSchema;
    case 'tiktok':
      return TikTokContentSchema;
    case 'youtube':
      return YouTubeContentSchema;
    case 'facebook':
      return FacebookContentSchema;
    default:
      return TwitterContentSchema;
  }
}
