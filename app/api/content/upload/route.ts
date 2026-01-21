import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, supabaseAdmin } from '@/lib/supabase/server';
import { validateVideoUrl } from '@/lib/validations/video-analytics';
import { fetchVideoBasicInfo } from '@/lib/services/platform-scrapers';
import { logger } from '@/lib/logger';
import { processContentAnalyticsTask } from '@/trigger/process-content-analytics';
import type { Platform, ContentType } from '@/types/content-analytics';
import { format } from 'date-fns';
import crypto from 'crypto';
import { SUPABASE_STORAGE_BUCKETS } from '@/lib/utils';
import { trackServerError } from '@/lib/posthog/server';


export async function POST(request: NextRequest) {
  const requestLogger = logger.child({ endpoint: '/api/content/upload', method: 'POST' });
  let body: any = {};
  let file: File | null = null;
  let videoUrl: string | undefined;
  let contentText: string | undefined;
  let platform: Platform | undefined;
  let contentTypeParam: ContentType | undefined;
  let userId: string | undefined;
  
  try {
    requestLogger.info('Content upload request received');
    const videoId = crypto.randomUUID();

    // Step 1: Parse request (multipart/form-data or JSON)
    requestLogger.debug('Parsing request');
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      file = formData.get('file') as File | null;
      videoUrl = formData.get('video_url') as string | undefined;
      contentText = formData.get('content_text') as string | undefined;
      platform = formData.get('platform') as Platform | undefined;
      contentTypeParam = formData.get('content_type') as ContentType | undefined;
      userId = formData.get('user_id') as string | undefined;
    } else {
      body = await request.json();
      videoUrl = body.video_url;
      contentText = body.content_text;
      platform = body.platform;
      contentTypeParam = body.content_type;
      userId = body.user_id;
    }

    requestLogger.info('Request parsed', { 
      hasFile: !!file, 
      hasVideoUrl: !!videoUrl, 
      hasContentText: !!contentText,
      platform,
      content_type: contentTypeParam 
    });

    // Step 2: Validate inputs
    if (!userId) {
      requestLogger.warn('User ID missing from request');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

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

    if (!platform) {
      requestLogger.warn('Platform missing from request');
      return NextResponse.json({ error: 'Platform is required' }, { status: 400 });
    }

    if (!contentTypeParam) {
      requestLogger.warn('Content type missing from request');
      return NextResponse.json({ error: 'Content type is required' }, { status: 400 });
    }

    // Validate based on content type
    if (contentTypeParam === 'video' && !videoUrl && !file) {
      requestLogger.warn('Video URL or file required for video content');
      return NextResponse.json({ error: 'Video URL or file is required for video content' }, { status: 400 });
    }
    
    if (contentTypeParam === 'text' && (!contentText || contentText.trim().length === 0)) {
      requestLogger.warn('Content text required for text content');
      return NextResponse.json({ error: 'Content text is required for text content' }, { status: 400 });
    }

    // Step 4: Handle file upload if present
    let videoFilePath: string | null = null;
    if (file) {
      requestLogger.debug('Uploading file to storage');
      const fileBuffer = await file.arrayBuffer();
      const fileExtension = file.name.split('.').pop() || 'mp4';
      const storagePath = `videos/${videoId}.${fileExtension}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(SUPABASE_STORAGE_BUCKETS.VIDEOS)
        .upload(storagePath, Buffer.from(fileBuffer), {
          contentType: file.type || 'video/mp4',
          upsert: true,
        });

      if (uploadError) {
        requestLogger.error('File upload failed', uploadError);
        return NextResponse.json({ error: `File upload failed: ${uploadError.message}` }, { status: 500 });
      }

      videoFilePath = storagePath;
      requestLogger.info('File uploaded successfully', { storagePath });
    }

    // Step 5: Validate video URL if provided
    let validatedPlatform = platform;
    if (videoUrl) {
      requestLogger.debug('Validating video URL', { video_url: videoUrl });
      const validation = validateVideoUrl(videoUrl);
      
      if (!validation.valid) {
        requestLogger.warn('Video URL validation failed', { 
          video_url: videoUrl, 
          error: validation.error 
        });
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      validatedPlatform = validation.platform!;
      requestLogger.info('Video URL validated', { platform: validatedPlatform, video_url: videoUrl });
    }

    // Step 6: Fetch basic info for video content (if URL provided)
    let basicInfo: { title?: string; description?: string; thumbnail?: string } = {};
    if (contentTypeParam === 'video' && videoUrl) {
      requestLogger.debug('Fetching basic video info', { platform: validatedPlatform, video_url: videoUrl });
      try {
        basicInfo = await fetchVideoBasicInfo(videoUrl, validatedPlatform as any);
        requestLogger.info('Basic video info fetched', { 
          hasTitle: !!basicInfo.title, 
          hasDescription: !!basicInfo.description,
          hasThumbnail: !!basicInfo.thumbnail 
        });
      } catch (basicInfoError) {
        requestLogger.error('Failed to fetch basic video info', basicInfoError, { platform: validatedPlatform, video_url: videoUrl });
        // Continue with empty basic info
        basicInfo = {};
      }
    }

    // Step 7: Generate default title from timestamp
    const now = new Date();
    const defaultTitle = `Content - ${format(now, 'MMM dd, yyyy HH:mm')}`;

    // Step 8: Insert content record into database
    requestLogger.debug('Inserting content record into database', { 
      userId: userId, 
      platform: validatedPlatform, 
      content_type: contentTypeParam 
    });

    const videoPath = `videos/${videoId}.mp4`;
    const { data: videoData } = supabaseAdmin.storage.from(SUPABASE_STORAGE_BUCKETS.VIDEOS).getPublicUrl(videoPath);
    
    const { data: contentRecord, error: insertError } = await supabase
      .from('content_analytics')
      .insert({
        id: videoId,
        user_id: userId,
        video_url: videoData.publicUrl || '',
        platform: validatedPlatform,
        content_type: contentTypeParam,
        content_text: contentText || null,
        video_file_path: videoFilePath,
        title: basicInfo.title || defaultTitle,
        description: basicInfo.description || '',
        processing_status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      requestLogger.error('Failed to insert content record', insertError, {
        userId: userId,
        platform: validatedPlatform,
        errorCode: insertError.code,
        errorMessage: insertError.message,
        errorDetails: insertError.details,
      });
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    requestLogger.info('Content record created', { 
      analyticsId: contentRecord.id, 
      userId: userId,
      platform: validatedPlatform 
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
