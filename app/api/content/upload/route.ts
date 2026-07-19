import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger.server';
import { processContentAnalyticsTask } from '@/trigger/process-content-analytics';
import type { Platform, ContentType } from '@/types/content-analytics';
import { format } from 'date-fns';
import { trackServerError } from '@/lib/posthog/server';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { ConvexServerAuthError, getAuthenticatedConvexClient } from '@/lib/convex/server';



export async function POST(request: NextRequest) {
  const requestLogger = logger.child({ endpoint: '/api/content/upload', method: 'POST' });
  let body: any = await request.json();
  const file: File | null = body.file;
  const contentText: string | undefined = body.content_text;
  const platform: Platform | undefined = body.platform;
  const contentTypeParam: ContentType | undefined = body.content_type;
  const userId: string | undefined = body.user_id;
  const videoUrlInput: string | null = body.video_url || null;
  const videoStorageId: Id<'_storage'> | null = body.video_storage_id || null;

  const missingFields: Record<string, any> = {};
  if (!userId) missingFields.user_id = userId;
  if (!platform) missingFields.platform = platform;
  if (!contentTypeParam) missingFields.content_type = contentTypeParam;

  if (Object.keys(missingFields).length > 0) {
    return NextResponse.json(
      { error: 'Missing required fields', missing: missingFields },
      { status: 400 }
    );
  }

  
  try {
    requestLogger.info('Content upload request received');

    // Step 1: Parse request (multipart/form-data or JSON)
    requestLogger.debug('Parsing request');
    requestLogger.info('Request parsed', { 
      userId,
      platform,
      contentTypeParam,
      contentText,
      file,
    });

    const authenticated = await getAuthenticatedConvexClient('upload_content');
    const clerkUserId = authenticated.userId;

    if (clerkUserId !== userId) {
      requestLogger.warn('User mismatch for upload request', { userId, authedUserId: clerkUserId });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (contentTypeParam === 'text' && (!contentText || contentText.trim().length === 0)) {
      requestLogger.warn('Content text required for text content');
      return NextResponse.json({ error: 'Content text is required for text content' }, { status: 400 });
    }

    // Step 7: Generate default title from timestamp
    const now = new Date();
    const defaultTitle = `Content - ${format(now, 'MMM dd, yyyy HH:mm')}`;

    // Step 8: Insert content record into database
    requestLogger.debug('Inserting content record into database', { 
      userId: userId, 
      platform: platform, 
      content_type: contentTypeParam 
    });

    const contentRecordId = await authenticated.convex.mutation(api.contentAnalytics.create, {
      video_url: videoUrlInput,
      platform: platform!,
      content_type: contentTypeParam!,
      content_text: contentText || null,
      video_file_path: videoStorageId,
      model_file_reference: null,
      title: defaultTitle,
      description: '',
    });

    requestLogger.info('Content record created', { 
      analyticsId: contentRecordId,
      userId: userId,
      platform: platform 
    });

    // Step 9: Trigger Trigger.dev task
    requestLogger.debug('Triggering Trigger.dev task', { 
      analyticsId: contentRecordId,
      userId: userId 
    });
    
    try {
      await processContentAnalyticsTask.trigger({
        userId: userId,
        analyticsId: contentRecordId,
      });
      requestLogger.info('Trigger.dev task triggered', { analyticsId: contentRecordId });
    } catch (triggerError) {
      requestLogger.error('Failed to trigger task', {
        analyticsId: contentRecordId,
        userId: userId,
        action: 'trigger_content_analytics',
        error: triggerError,
        message: triggerError instanceof Error ? triggerError.message : String(triggerError),
      });
      // Continue anyway - task might be triggered later
    }

    // Step 11: Scrape video metrics (if video URL provided)
    let metricsResult: { success: boolean; requires_manual_input: boolean; data?: any; error?: string } = {
      success: false,
      requires_manual_input: true,
    };

    // if (contentTypeParam === 'video' && videoUrl) {
    //   requestLogger.debug('Scraping video metrics', { platform: validatedPlatform, video_url: videoUrl });
    //   try {
    //     metricsResult = await scrapeVideoMetrics(videoUrl, validatedPlatform as any);
    //     requestLogger.info('Video metrics scraping completed', {
    //       success: metricsResult.success,
    //       requiresManualInput: metricsResult.requires_manual_input,
    //       hasMetrics: !!metricsResult.data,
    //     });
    //   } catch (metricsError) {
    //     requestLogger.error('Failed to scrape video metrics', metricsError, { platform: validatedPlatform, video_url: videoUrl });
    //     metricsResult = {
    //       success: false,
    //       requires_manual_input: true,
    //       error: metricsError instanceof Error ? metricsError.message : 'Unknown error',
    //     };
    //   }

    // }

    // Step 12: Return success response
    requestLogger.info('Content upload completed successfully', {
      analyticsId: contentRecordId,
      requiresManualMetrics: metricsResult.requires_manual_input,
    });
    return NextResponse.json({
      analytics_id: contentRecordId,
      message: 'Content added to processing queue',
      requires_manual_metrics: metricsResult.requires_manual_input,
    });

  } catch (err) {
    const statusCode = err instanceof ConvexServerAuthError ? err.statusCode : 500;
    requestLogger.error('Unexpected error in content upload', {
      userId: userId || 'unknown',
      action: 'upload_content',
      statusCode,
      error: err,
      message: err instanceof Error ? err.message : String(err),
    });
    trackServerError(err as Error, { userId: userId ?? "" }, userId ?? "");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: statusCode }
    );
  }
}
