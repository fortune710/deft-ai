import ytdl from 'ytdl-core';
import type { ConvexHttpClient } from 'convex/browser';
import type { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import type { Platform, VideoDownloadResult, AudioExtractionResult, ThumbnailExtractionResult } from '@/types/content-analytics';
import { logger } from '@/lib/logger.server';

const log = logger.child({ module: 'lib/services/video-processor' });

async function uploadResponseToConvex(
  convex: ConvexHttpClient,
  workerSecret: string,
  response: Response,
): Promise<Id<'_storage'>> {
  if (!response.ok) throw new Error(`Asset download failed with status ${response.status}`);
  const uploadUrl = await convex.mutation(api.triggerWorkers.generateFileUploadUrl, { workerSecret });
  const uploaded = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': response.headers.get('content-type') || 'application/octet-stream' },
    body: await response.arrayBuffer(),
  });
  if (!uploaded.ok) throw new Error('Failed to store asset in Convex');
  return (await uploaded.json()).storageId as Id<'_storage'>;
}

export async function downloadVideo(
  videoUrl: string,
  videoId: string,
  platform: Platform,
  convex: ConvexHttpClient,
  workerSecret: string,
  userId: string,
): Promise<VideoDownloadResult> {
  try {
    let response: Response;
    if (platform === 'youtube') {
      if (!ytdl.validateURL(videoUrl)) return { success: false, error: 'Invalid YouTube URL' };
      const chunks: Uint8Array[] = [];
      for await (const chunk of ytdl(videoUrl, { quality: 'highestvideo' })) {
        chunks.push(chunk);
      }
      response = new Response(Buffer.concat(chunks), {
        headers: { 'content-type': 'video/mp4' },
      });
    } else if (platform === 'instagram' || platform === 'tiktok') {
      response = await fetch(`${process.env.YT_WORKER_URL}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl, return_file: true }),
      });
    } else {
      return { success: false, error: 'Unsupported platform' };
    }
    const storageId = await uploadResponseToConvex(convex, workerSecret, response);
    log.info('Stored downloaded video in Convex', { userId, action: 'store_downloaded_video', videoId, storageId });
    return { success: true, storage_path: storageId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function extractAudioFromVideo(
  sourceUrl: string,
  videoId: string,
  convex: ConvexHttpClient,
  workerSecret: string,
  userId: string,
): Promise<AudioExtractionResult> {
  try {
    const response = await fetch(`${process.env.YT_WORKER_URL}/extract?audio=true`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_url: sourceUrl, return_file: true }),
      signal: AbortSignal.timeout(30000),
    });
    const storageId = await uploadResponseToConvex(convex, workerSecret, response);
    log.info('Stored extracted audio in Convex', { userId, action: 'store_extracted_audio', videoId, storageId });
    return { success: true, storage_path: storageId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function extractThumbnailFromVideo(
  sourceUrl: string,
  videoId: string,
  convex: ConvexHttpClient,
  workerSecret: string,
  userId: string,
): Promise<ThumbnailExtractionResult> {
  try {
    const response = await fetch(`${process.env.YT_WORKER_URL}/extract?thumbnail=true`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_url: sourceUrl, return_file: true }),
      signal: AbortSignal.timeout(30000),
    });
    const storageId = await uploadResponseToConvex(convex, workerSecret, response);
    const thumbnailUrl = await convex.query(api.triggerWorkers.getFileUrl, { workerSecret, storageId });
    log.info('Stored extracted thumbnail in Convex', { userId, action: 'store_extracted_thumbnail', videoId, storageId });
    return { success: true, storage_path: storageId, thumbnail_url: thumbnailUrl || undefined };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function deleteVideoFiles(
  storageIds: Array<Id<'_storage'>>,
  convex: ConvexHttpClient,
  workerSecret: string,
  userId: string,
): Promise<void> {
  await Promise.all(storageIds.map((storageId) =>
    convex.mutation(api.triggerWorkers.deleteFile, { workerSecret, storageId }),
  ));
  log.info('Deleted Convex video assets', { userId, action: 'delete_video_assets', fileCount: storageIds.length });
}
