import ytdl from 'ytdl-core';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import type { Platform, VideoDownloadResult, AudioExtractionResult } from '@/types/video-analytics';

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
  return {
    success: false,
    error: 'Instagram video download not yet implemented. Please provide video file manually.',
  };
}

export async function downloadTikTokVideo(videoUrl: string, videoId: string): Promise<VideoDownloadResult> {
  return {
    success: false,
    error: 'TikTok video download not yet implemented. Please provide video file manually.',
  };
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

export async function extractAudioFromVideo(videoId: string, videoStoragePath: string): Promise<AudioExtractionResult> {
  try {
    // const ffmpeg = await import('fluent-ffmpeg').then(m => m.default);
    // const ffmpegPath = await import('@ffmpeg-installer/ffmpeg').then(m => m.default);

    // ffmpeg.setFfmpegPath(ffmpegPath.path);

    // const { data: videoData, error: downloadError } = await supabase.storage
    //   .from('temp-videos')
    //   .download(videoStoragePath);

    // if (downloadError || !videoData) {
    //   return { success: false, error: `Failed to download video: ${downloadError?.message}` };
    // }

    // const videoTempPath = generateTempFilePath(videoId, 'mp4');
    // const audioTempPath = generateTempFilePath(videoId, 'mp3');

    // const videoBuffer = await videoData.arrayBuffer();
    // fs.writeFileSync(videoTempPath, Buffer.from(videoBuffer));

    // return new Promise((resolve) => {
    //   let duration: number | undefined;

    //   ffmpeg(videoTempPath)
    //     .toFormat('mp3')
    //     .audioCodec('libmp3lame')
    //     .audioBitrate('128k')
    //     .on('codecData', (data) => {
    //       const durationMatch = data.duration.match(/(\d{2}):(\d{2}):(\d{2})/);
    //       if (durationMatch) {
    //         const hours = parseInt(durationMatch[1], 10);
    //         const minutes = parseInt(durationMatch[2], 10);
    //         const seconds = parseInt(durationMatch[3], 10);
    //         duration = hours * 3600 + minutes * 60 + seconds;
    //       }
    //     })
    //     .on('end', async () => {
    //       try {
    //         const audioBuffer = fs.readFileSync(audioTempPath);
    //         const storagePath = `audio/${videoId}.mp3`;

    //         const { error: uploadError } = await supabase.storage
    //           .from('temp-videos')
    //           .upload(storagePath, audioBuffer, {
    //             contentType: 'audio/mpeg',
    //             upsert: true,
    //           });

    //         fs.unlinkSync(videoTempPath);
    //         fs.unlinkSync(audioTempPath);

    //         if (uploadError) {
    //           resolve({ success: false, error: `Upload failed: ${uploadError.message}` });
    //           return;
    //         }

    //         resolve({
    //           success: true,
    //           audio_path: audioTempPath,
    //           storage_path: storagePath,
    //           duration_seconds: duration,
    //         });
    //       } catch (err) {
    //         resolve({ success: false, error: err instanceof Error ? err.message : 'Unknown error during upload' });
    //       }
    //     })
    //     .on('error', (err) => {
    //       if (fs.existsSync(videoTempPath)) fs.unlinkSync(videoTempPath);
    //       if (fs.existsSync(audioTempPath)) fs.unlinkSync(audioTempPath);
    //       resolve({ success: false, error: `Audio extraction failed: ${err.message}` });
    //     })
    //     .save(audioTempPath);
    //});
    return { success: false, error: 'Audio extraction not yet implemented' };
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
      await supabase.storage.from('temp-videos').remove(filesToDelete);
    }
  } catch (err) {
    console.error('Error deleting video files:', err);
  }
}
