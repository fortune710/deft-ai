import ytdl from 'ytdl-core';
import type { Platform, MetricsScrapingResult, VideoMetrics } from '@/types/content-analytics';
import { calculateEngagementRate } from '@/lib/validations/video-analytics';

export async function scrapeYouTubeMetrics(videoUrl: string): Promise<MetricsScrapingResult> {
  try {
    if (!ytdl.validateURL(videoUrl)) {
      return {
        success: false,
        error: 'Invalid YouTube URL',
        requires_manual_input: true,
      };
    }

    const info = await ytdl.getInfo(videoUrl);
    const details = info.videoDetails;

    const views = parseInt(details.viewCount || '0', 10);
    const likes = parseInt(details.likes?.toString() || '0', 10);
    const comments = 0;
    const shares = 0;

    const metrics: VideoMetrics = {
      views,
      likes,
      comments,
      shares,
      engagement_rate: calculateEngagementRate({ views, likes, comments, shares }),
    };

    return {
      success: true,
      data: {
        ...metrics,
        title: details.title,
        description: details.description || '',
      },
      requires_manual_input: false,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to scrape YouTube metrics',
      requires_manual_input: true,
    };
  }
}

export async function scrapeInstagramMetrics(videoUrl: string): Promise<MetricsScrapingResult> {
  return {
    success: false,
    error: 'Instagram scraping is not available. Please enter metrics manually.',
    requires_manual_input: true,
  };
}

export async function scrapeTikTokMetrics(videoUrl: string): Promise<MetricsScrapingResult> {
  return {
    success: false,
    error: 'TikTok scraping is not available. Please enter metrics manually.',
    requires_manual_input: true,
  };
}

export async function scrapeVideoMetrics(videoUrl: string, platform: Platform): Promise<MetricsScrapingResult> {
  switch (platform) {
    case 'youtube':
      return scrapeYouTubeMetrics(videoUrl);
    case 'instagram':
      return scrapeInstagramMetrics(videoUrl);
    case 'tiktok':
      return scrapeTikTokMetrics(videoUrl);
    default:
      return {
        success: false,
        error: 'Unsupported platform',
        requires_manual_input: true,
      };
  }
}

export async function fetchVideoBasicInfo(
  videoUrl: string,
  platform: Platform
): Promise<{ title?: string; description?: string; thumbnail?: string }> {
  try {
    if (platform === 'youtube' && ytdl.validateURL(videoUrl)) {
      const info = await ytdl.getInfo(videoUrl);
      return {
        title: info.videoDetails.title,
        description: info.videoDetails.description || '',
        thumbnail: info.videoDetails.thumbnails?.[0]?.url,
      };
    }

    return {};
  } catch {
    return {};
  }
}
