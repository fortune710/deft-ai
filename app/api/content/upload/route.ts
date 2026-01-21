import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, supabaseAdmin } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { processContentAnalyticsTask } from '@/trigger/process-content-analytics';
import type { Platform, ContentType } from '@/types/content-analytics';
import { format } from 'date-fns';
import { SUPABASE_STORAGE_BUCKETS } from '@/lib/utils';
import { trackServerError } from '@/lib/posthog/server';



export async function POST(request: NextRequest) {
  const requestLogger = logger.child({ endpoint: '/api/content/upload', method: 'POST' });
  let body: any = await request.json();
  const file: File | null = body.file;
  const contentText: string | undefined = body.content_text;
  const platform: Platform | undefined = body.platform;
  const contentTypeParam: ContentType | undefined = body.content_type;
  const userId: string | undefined = body.user_id;
  const analyticsId: string | undefined = body.analytics_id;

  const missingFields: Record<string, any> = {};
  if (!analyticsId) missingFields.analytics_id = analyticsId;
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
      analyticsId,
      userId,
      platform,
      contentTypeParam,
      contentText,
      file,
    });

    // Step 3: Create supabase client using userId, then read user from it
    requestLogger.debug('Initializing Supabase client', { userId });
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      requestLogger.error('Failed to get authenticated user', userError, { userError: userError?.message });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.id !== userId) {
      requestLogger.warn('User mismatch for upload request', { userId, authedUserId: user.id });
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

    let videoPath: string | null = null;
    let videoUrl: string = '';

    if (contentTypeParam === 'video') {
      videoPath = `videos/${analyticsId}.mp4`;
      const { data: videoData } = supabaseAdmin.storage.from(SUPABASE_STORAGE_BUCKETS.VIDEOS).getPublicUrl(videoPath);
      videoUrl = videoData?.publicUrl || '';
    }

    const { data: contentRecord, error: insertError } = await supabase
      .from('content_analytics')
      .insert({
        id: analyticsId,
        user_id: userId,
        video_url: videoUrl,
        platform: platform,
        content_type: contentTypeParam,
        content_text: contentText || null,
        video_file_path: videoPath,
        title: defaultTitle,
        description: '',
        processing_status: 'pending',
      })
      .select()
      .single();


    if (insertError) {
      requestLogger.error('Failed to insert content record', insertError, {
        userId: userId,
        platform: platform,
        errorCode: insertError.code,
        errorMessage: insertError.message,
        errorDetails: insertError.details,
      });
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    requestLogger.info('Content record created', { 
      analyticsId: contentRecord.id, 
      userId: userId,
      platform: platform 
    });

    // Step 9: Trigger Trigger.dev task
    requestLogger.debug('Triggering Trigger.dev task', { 
      analyticsId: contentRecord.id, 
      userId: userId 
    });
    
    try {
      await processContentAnalyticsTask.trigger({
        userId: userId,
        analyticsId: contentRecord.id,
      });
      requestLogger.info('Trigger.dev task triggered', { analyticsId: contentRecord.id });
    } catch (triggerError) {
      requestLogger.error('Failed to trigger task', triggerError, {
        analyticsId: contentRecord.id,
        userId: userId,
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

    //   // Update content record with metrics if available
    //   if (metricsResult.success && metricsResult.data) {
    //     requestLogger.debug('Updating content record with scraped metrics', { analyticsId: contentRecord.id });
        
    //     const { error: updateError } = await supabase
    //       .from('content_analytics')
    //       .update({
    //         metrics: metricsResult.data,
    //         metrics_scraped: true,
    //         title: metricsResult.data.title || contentRecord.title,
    //         description: metricsResult.data.description || contentRecord.description,
    //       })
    //       .eq('id', contentRecord.id);

    //     if (updateError) {
    //       requestLogger.error('Failed to update content record with metrics', updateError, {
    //         analyticsId: contentRecord.id,
    //         errorCode: updateError.code,
    //         errorMessage: updateError.message,
    //       });
    //     } else {
    //       requestLogger.info('Content record updated with metrics', { analyticsId: contentRecord.id });
    //     }
    //   }
    // }

    // Step 12: Return success response
    requestLogger.info('Content upload completed successfully', {
      analyticsId: contentRecord.id,
      requiresManualMetrics: metricsResult.requires_manual_input,
    });
    return NextResponse.json({
      analytics_id: contentRecord.id,
      message: 'Content added to processing queue',
      requires_manual_metrics: metricsResult.requires_manual_input,
    });

  } catch (err) {
    requestLogger.error('Unexpected error in content upload', err);
    trackServerError(err as Error, { userId: userId ?? "" }, userId ?? "");
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
