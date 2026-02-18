import ytdl from 'ytdl-core';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import type { Platform, VideoDownloadResult, AudioExtractionResult, ThumbnailExtractionResult } from '@/types/content-analytics';
import { SUPABASE_STORAGE_BUCKETS } from '@/lib/utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TEMP_DIR = '/tmp/video-processing';

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function generateTempFilePath(videoId: string, extension: string): string {
  ensureTempDir();
  return path.join(TEMP_DIR, `${videoId}.${extension}`);
}

export async function downloadYouTubeVideo(videoUrl: string, videoId: string): Promise<VideoDownloadResult> {
  try {
    if (!ytdl.validateURL(videoUrl)) {
      return { success: false, error: 'Invalid YouTube URL' };
    }

    const tempFilePath = generateTempFilePath(videoId, 'mp4');
    const videoStream = ytdl(videoUrl, { quality: 'highestvideo' });
    const writeStream = fs.createWriteStream(tempFilePath);

    return new Promise((resolve) => {
      videoStream.pipe(writeStream);

      writeStream.on('finish', async () => {
        try {
          const fileBuffer = fs.readFileSync(tempFilePath);
          const storagePath = `videos/${videoId}.mp4`;

          const { error: uploadError } = await supabase.storage
            .from('temp-videos')
            .upload(storagePath, fileBuffer, {
              contentType: 'video/mp4',
              upsert: true,
            });

          fs.unlinkSync(tempFilePath);

          if (uploadError) {
            resolve({ success: false, error: `Upload failed: ${uploadError.message}` });
            return;
          }

          resolve({ success: true, file_path: tempFilePath, storage_path: storagePath });
        } catch (err) {
          resolve({ success: false, error: err instanceof Error ? err.message : 'Unknown error during upload' });
        }
      });

      videoStream.on('error', (err) => {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        resolve({ success: false, error: `Download failed: ${err.message}` });
      });

      writeStream.on('error', (err) => {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        resolve({ success: false, error: `Write failed: ${err.message}` });
      });
    });
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function downloadInstagramVideo(videoUrl: string, videoId: string): Promise<VideoDownloadResult> {
  try {
    const storagePath = `videos/${videoId}.mp4`;
    const response = await fetch(process.env.YT_WORKER_URL + '/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: videoUrl, path: storagePath }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error };
    }
    return { success: true, storage_path: storagePath };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function downloadTikTokVideo(videoUrl: string, videoId: string): Promise<VideoDownloadResult> {
  try {
    const storagePath = `videos/${videoId}.mp4`;
    const response = await fetch(process.env.YT_WORKER_URL + '/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: videoUrl, path: storagePath }),
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error };
    }
    return { success: true, storage_path: storagePath };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function downloadVideo(
  videoUrl: string,
  videoId: string,
  platform: Platform
): Promise<VideoDownloadResult> {
  switch (platform) {
    case 'youtube':
      return downloadYouTubeVideo(videoUrl, videoId);
    case 'instagram':
      return downloadInstagramVideo(videoUrl, videoId);
    case 'tiktok':
      return downloadTikTokVideo(videoUrl, videoId);
    default:
      return { success: false, error: 'Unsupported platform' };
  }
}

export async function extractAudioFromVideo(videoId: string): Promise<AudioExtractionResult> {
  try {
    console.log(`[extractAudioFromVideo] Starting audio extraction for videoId: ${videoId}`);
    const url = process.env.YT_WORKER_URL + '/extract?audio=true&thumbnail=true';
    console.log(`[extractAudioFromVideo] Fetching: ${url} with video_id: ${videoId}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ video_id: videoId }),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    console.log(`[extractAudioFromVideo] Awaiting response...`);
    const result = await response.json();
    const data = result.data;
    console.log(`[extractAudioFromVideo] Received response, status: ${response.status} (${response.ok ? 'OK' : 'ERROR'})`);

    if (!response.ok) {
      console.error(`[extractAudioFromVideo] Extraction failed for videoId ${videoId}:`, data.error);
      return { success: false, error: data.error };
    }
    console.log(`[extractAudioFromVideo] Extraction successful for videoId ${videoId}, audio path: ${data.audio_path}`);
    return { success: true, storage_path: data.audio_path };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[extractAudioFromVideo] Exception during extraction for videoId ${videoId}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Extract thumbnail from video using the worker service
 * 
 * The worker service implements POST /extract?thumbnail=true endpoint:
 * - Accepts: { videoUrl: string, uploadPath: string }
 * - Downloads video from videoUrl
 * - Extracts thumbnail at 1 second mark using: ffmpeg -i video.mp4 -ss 00:00:01 -vframes 1 thumbnail.jpg
 * - Uploads thumbnail to Supabase storage at uploadPath
 * - Returns: { success: true, storage_path: string }
 */
export async function extractThumbnailFromVideo(
  videoId: string,
): Promise<ThumbnailExtractionResult> {
  try {
    // Call worker service to extract thumbnail using combined /extract endpoint
    const response = await fetch(process.env.YT_WORKER_URL + '/extract?thumbnail=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        video_id: videoId
      }),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      console.error('Failed to extract thumbnail:', response.statusText);
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return { success: false, error: errorData.error || 'Failed to extract thumbnail' };
    }

    const result = await response.json();
    const data = result.data;

    return {
      success: true,
      thumbnail_url: data.thumbnail_url,
      storage_path: data.thumbnail_path,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function deleteVideoFiles(videoStoragePath: string | null, audioStoragePath: string | null): Promise<void> {
  try {
    const filesToDelete: string[] = [];
    if (videoStoragePath) filesToDelete.push(videoStoragePath);
    if (audioStoragePath) filesToDelete.push(audioStoragePath);

    if (filesToDelete.length > 0) {
      await supabase.storage.from(SUPABASE_STORAGE_BUCKETS.VIDEOS).remove(filesToDelete);
    }
  } catch (err) {
    console.error('Error deleting video files:', err);
  }
}
