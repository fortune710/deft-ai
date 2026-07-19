import type { ConvexHttpClient } from 'convex/browser';
import type { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import type { AIFeedback, ContentAnalytics, ProcessingStep } from '@/types/content-analytics';
import { downloadVideo, extractAudioFromVideo, extractThumbnailFromVideo } from '@/lib/services/video-processor';
import { transcribeAudioFile } from '@/lib/services/transcription';
import { ContentAnalysisAgent } from '@/lib/ai/agents/content-analysis-agent';

export interface ContentAnalysisProgressEvent {
  step: ProcessingStep;
  progress: number;
  message: string;
  details?: string;
}

export interface ContentAnalysisOrchestratorLogger {
  log: (message: string, meta?: Record<string, unknown>) => void;
  warn?: (message: string, meta?: Record<string, unknown>) => void;
  error?: (message: string, meta?: Record<string, unknown>) => void;
}

export interface ContentAnalysisOrchestratorOptions {
  convex: ConvexHttpClient;
  workerSecret: string;
  analyticsId: Id<'content_analytics'>;
  userId: string;
  onProgress?: (event: ContentAnalysisProgressEvent) => void | Promise<void>;
  logger?: ContentAnalysisOrchestratorLogger;
}

export interface ContentAnalysisOrchestratorResult {
  content: ContentAnalytics;
  feedback: AIFeedback;
}

export async function runContentAnalysisOrchestrator(
  options: ContentAnalysisOrchestratorOptions
): Promise<ContentAnalysisOrchestratorResult> {
  const { convex, workerSecret, analyticsId, userId, onProgress, logger } = options;
  const reportProgress = async (event: ContentAnalysisProgressEvent) => {
    await onProgress?.(event);
    logger?.log?.('Content analysis progress', { analyticsId, userId, ...event });
  };

  const record = await convex.query(api.triggerWorkers.getContentAnalytics, {
    workerSecret, userId, analyticsId,
  });
  const content = record ? { ...record, id: record._id } as unknown as ContentAnalytics : null;

  if (!content) {
    throw new Error(`Content not found for analytics ID ${analyticsId}`);
  }

  if (content.content_type === 'video') {
    await handleVideoContent({
      convex,
      workerSecret,
      analyticsId,
      userId,
      content,
      reportProgress,
      logger,
    });
  } else {
    await handleTextContent({
      convex,
      workerSecret,
      analyticsId,
      userId,
      content,
      reportProgress,
      logger,
    });
  }

  const refreshedRecord = await convex.query(api.triggerWorkers.getContentAnalytics, {
    workerSecret, userId, analyticsId,
  });
  const refreshedContent = refreshedRecord
    ? { ...refreshedRecord, id: refreshedRecord._id } as unknown as ContentAnalytics
    : null;

  if (!refreshedContent) {
    throw new Error(`Failed to reload content analytics record ${analyticsId}`);
  }

  if (!refreshedContent.analysis_results) {
    throw new Error('Content analysis results were not saved.');
  }

  return {
    content: refreshedContent,
    feedback: refreshedContent.analysis_results,
  };
}

async function handleVideoContent(params: {
  convex: ConvexHttpClient;
  workerSecret: string;
  analyticsId: Id<'content_analytics'>;
  userId: string;
  content: ContentAnalytics;
  reportProgress: (event: ContentAnalysisProgressEvent) => Promise<void>;
  logger?: ContentAnalysisOrchestratorLogger;
}): Promise<void> {
  const { convex, workerSecret, analyticsId, userId, content, reportProgress, logger } = params;

  await reportProgress({
    step: 'download',
    progress: 10,
    message: content.video_file_path ? 'Using existing uploaded video' : 'Downloading video file',
  });

  let videoFilePath = content.video_file_path;
  if (!videoFilePath && content.video_url) {
    const downloadResult = await downloadVideo(content.video_url, analyticsId, content.platform, convex, workerSecret, userId);
    if (!downloadResult.success) {
      throw new Error(`Video download failed: ${downloadResult.error}`);
    }

    videoFilePath = downloadResult.storage_path ?? downloadResult.file_path ?? null;
    if (!videoFilePath) {
      throw new Error('Video download completed without a file path.');
    }

    await updateContentRecord(
      convex,
      workerSecret,
      userId,
      analyticsId,
      { video_file_path: videoFilePath },
      { required: true, label: 'video file path', logger }
    );
  }

  await reportProgress({
    step: 'extract_thumbnail',
    progress: 25,
    message: 'Extracting thumbnail',
  });

  if (!videoFilePath) throw new Error('Video storage ID is missing');
  const sourceUrl = await convex.query(api.triggerWorkers.getFileUrl, {
    workerSecret,
    storageId: videoFilePath as Id<'_storage'>,
  });
  if (!sourceUrl) throw new Error('Unable to resolve Convex video URL');

  const thumbnailResult = await extractThumbnailFromVideo(sourceUrl, analyticsId, convex, workerSecret, userId);
  if (thumbnailResult.success && thumbnailResult.thumbnail_url) {
    await updateContentRecord(
      convex,
      workerSecret,
      userId,
      analyticsId,
      { thumbnail_url: thumbnailResult.storage_path || thumbnailResult.thumbnail_url },
      { required: false, label: 'thumbnail URL', logger }
    );
  } else if (thumbnailResult.error) {
    logger?.warn?.('Thumbnail extraction failed', {
      analyticsId,
      error: thumbnailResult.error,
    });
  }

  await reportProgress({
    step: 'extract_audio',
    progress: 40,
    message: 'Extracting audio',
  });

  const audioResult = await extractAudioFromVideo(sourceUrl, analyticsId, convex, workerSecret, userId);
  if (!audioResult.success || !audioResult.storage_path) {
    throw new Error(`Audio extraction failed: ${audioResult.error}`);
  }

  await updateContentRecord(
    convex,
    workerSecret,
    userId,
    analyticsId,
    { audio_file_path: audioResult.storage_path },
    { required: true, label: 'audio file path', logger }
  );

  await reportProgress({
    step: 'transcribe',
    progress: 60,
    message: 'Transcribing audio',
  });

  const audioUrl = await convex.query(api.triggerWorkers.getFileUrl, {
    workerSecret,
    storageId: audioResult.storage_path as Id<'_storage'>,
  });
  if (!audioUrl) throw new Error('Unable to resolve Convex audio URL');
  const transcriptionResult = await transcribeAudioFile(audioUrl);
  if (!transcriptionResult.success || !transcriptionResult.transcript) {
    throw new Error(`Transcription failed: ${transcriptionResult.error}`);
  }

  await updateContentRecord(
    convex,
    workerSecret,
    userId,
    analyticsId,
    { transcript: transcriptionResult.transcript },
    { required: true, label: 'transcript', logger }
  );

  await analyzeContent({ convex, workerSecret, analyticsId, userId, contentType: 'video', reportProgress, logger });
}

async function handleTextContent(params: {
  convex: ConvexHttpClient;
  workerSecret: string;
  analyticsId: Id<'content_analytics'>;
  userId: string;
  content: ContentAnalytics;
  reportProgress: (event: ContentAnalysisProgressEvent) => Promise<void>;
  logger?: ContentAnalysisOrchestratorLogger;
}): Promise<void> {
  const { convex, workerSecret, analyticsId, userId, content, reportProgress, logger } = params;

  if (!content.content_text || content.content_text.trim().length === 0) {
    throw new Error('Content text is required for text analysis');
  }

  await analyzeContent({ convex, workerSecret, analyticsId, userId, contentType: 'text', reportProgress, logger });
}

async function analyzeContent(params: {
  convex: ConvexHttpClient;
  workerSecret: string;
  analyticsId: Id<'content_analytics'>;
  userId: string;
  contentType: 'video' | 'text';
  reportProgress: (event: ContentAnalysisProgressEvent) => Promise<void>;
  logger?: ContentAnalysisOrchestratorLogger;
}): Promise<void> {
  const { convex, workerSecret, analyticsId, userId, contentType, reportProgress, logger } = params;
  const agent = new ContentAnalysisAgent();

  await reportProgress({
    step: 'analyze',
    progress: 80,
    message: `Analyzing ${contentType} content`,
  });

  const feedbackResult = await agent.execute(
    {
      convex,
      workerSecret,
      analyticsId,
      userId,
      contentType,
    },
    async (event) => {
      logger?.log?.('Content analysis agent progress', { analyticsId, userId, ...event });
    }
  );

  if (!feedbackResult.success || !feedbackResult.feedback) {
    throw new Error(`Content analysis failed: ${feedbackResult.error}`);
  }

  await updateContentRecord(
    convex,
    workerSecret,
    userId,
    analyticsId,
    { analysis_results: feedbackResult.feedback },
    { required: true, label: 'analysis results', logger }
  );
}

async function updateContentRecord(
  convex: ConvexHttpClient,
  workerSecret: string,
  userId: string,
  analyticsId: Id<'content_analytics'>,
  updates: Partial<ContentAnalytics>,
  options: { required: boolean; label: string; logger?: ContentAnalysisOrchestratorLogger }
): Promise<void> {
  const { required, label, logger } = options;
  try {
    await convex.mutation(api.triggerWorkers.updateContentAnalytics, {
      workerSecret,
      userId,
      analyticsId,
      updates: updates as any,
    });
  } catch (error) {
    logger?.error?.(`Failed to update content analytics ${label}`, {
      analyticsId,
      error: error instanceof Error ? error.message : String(error),
    });
    if (required) {
      throw new Error(`Failed to update content analytics ${label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
