import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SUPABASE_STORAGE_BUCKETS = {
  VIDEOS: 'tmp_videos',
} as const;

export function getVideoStoragePath(videoId: string) {
  return `videos/${videoId}.mp4`;
}

export function getAudioStoragePath(videoId: string) {
  return `audios/${videoId}.mp3`;
}

//Content Analytics
export const PLATFORM_COLORS: Record<string, string> = {
  youtube: 'bg-red-500',
  instagram: 'bg-pink-500',
  tiktok: 'bg-black',
  twitter: 'bg-blue-500',
  linkedin: 'bg-blue-600',
  facebook: 'bg-blue-700',
};

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-800' },
  downloading: { bg: 'bg-blue-100', text: 'text-blue-800' },
  extracting_audio: { bg: 'bg-blue-100', text: 'text-blue-800' },
  transcribing: { bg: 'bg-purple-100', text: 'text-purple-800' },
  analyzing: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  extracting_thumbnail: { bg: 'bg-cyan-100', text: 'text-cyan-800' },
  completed: { bg: 'bg-green-100', text: 'text-green-800' },
  failed: { bg: 'bg-red-100', text: 'text-red-800' },
};

export const SCORE_COLORS: Record<string, string> = {
  high: 'oklch(0.601 0.154 151.71)', // green-600
  medium: 'oklch(0.588 0.207 76.521)',
  low: 'oklch(0.862 0.133 251.455)',
};

export function getScoreColor(score: number) {
  if (score >= 8) return SCORE_COLORS.high;
  if (score >= 6 && score < 8) return SCORE_COLORS.medium;
  return SCORE_COLORS.low;
}
