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