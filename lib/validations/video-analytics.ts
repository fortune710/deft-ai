import { z } from 'zod';

export const platformSchema = z.enum(['youtube', 'instagram', 'tiktok']);

export const videoUrlSchema = z.object({
  url: z.string().url('Invalid URL format'),
  platform: platformSchema.optional(),
});

export const youtubeUrlRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
export const instagramUrlRegex = /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel|tv)\/.+$/;
export const tiktokUrlRegex = /^(https?:\/\/)?(www\.)?(tiktok\.com|vm\.tiktok\.com)\/.+$/;

export function detectPlatformFromUrl(url: string): 'youtube' | 'instagram' | 'tiktok' | null {
  if (youtubeUrlRegex.test(url)) return 'youtube';
  if (instagramUrlRegex.test(url)) return 'instagram';
  if (tiktokUrlRegex.test(url)) return 'tiktok';
  return null;
}

export function extractVideoId(url: string, platform: 'youtube' | 'instagram' | 'tiktok'): string | null {
  try {
    switch (platform) {
      case 'youtube': {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtu.be')) {
          return urlObj.pathname.slice(1);
        }
        return urlObj.searchParams.get('v');
      }
      case 'instagram': {
        const match = url.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
        return match ? match[2] : null;
      }
      case 'tiktok': {
        const match = url.match(/\/video\/(\d+)/);
        if (match) return match[1];
        const vmMatch = url.match(/vm\.tiktok\.com\/([A-Za-z0-9]+)/);
        return vmMatch ? vmMatch[1] : null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export const videoMetricsSchema = z.object({
  views: z.number().min(0, 'Views must be non-negative'),
  likes: z.number().min(0, 'Likes must be non-negative'),
  comments: z.number().min(0, 'Comments must be non-negative'),
  shares: z.number().min(0, 'Shares must be non-negative'),
  engagement_rate: z.number().min(0, 'Engagement rate must be non-negative').max(100, 'Engagement rate cannot exceed 100%'),
  watch_time: z.number().min(0).optional(),
  retention_rate: z.number().min(0).max(100).optional(),
});

export const manualMetricsInputSchema = z.object({
  video_id: z.string().uuid('Invalid video ID'),
  metrics: videoMetricsSchema,
  title: z.string().optional(),
  description: z.string().optional(),
});

export const videoUploadSchema = z.object({
  video_url: z.string().url('Invalid video URL'),
  platform: platformSchema.optional(),
});

export const updateVideoStatusSchema = z.object({
  video_id: z.string().uuid(),
  status: z.enum(['pending', 'downloading', 'extracting_audio', 'transcribing', 'analyzing', 'completed', 'failed']),
  error_message: z.string().optional(),
});

export const updateQueueJobSchema = z.object({
  job_id: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  current_step: z.enum(['queued', 'download', 'extract_audio', 'transcribe', 'analyze', 'completed']),
  progress_percentage: z.number().min(0).max(100),
  error_message: z.string().optional(),
});

export function calculateEngagementRate(metrics: {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}): number {
  if (metrics.views === 0) return 0;
  const totalEngagements = metrics.likes + metrics.comments + metrics.shares;
  return (totalEngagements / metrics.views) * 100;
}

export function validateVideoUrl(url: string): { valid: boolean; platform: 'youtube' | 'instagram' | 'tiktok' | null; error?: string } {
  try {
    new URL(url);
  } catch {
    return { valid: false, platform: null, error: 'Invalid URL format' };
  }

  const platform = detectPlatformFromUrl(url);
  if (!platform) {
    return { valid: false, platform: null, error: 'Unsupported platform. Please use YouTube, Instagram, or TikTok URLs.' };
  }

  const videoId = extractVideoId(url, platform);
  if (!videoId) {
    return { valid: false, platform, error: `Could not extract video ID from ${platform} URL` };
  }

  return { valid: true, platform };
}
