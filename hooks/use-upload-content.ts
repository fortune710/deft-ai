import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ContentUploadRequest, ContentUploadResponse } from '@/types/content-analytics';
import { supabase } from '@/lib/supabase/client';
import { trackEvent } from '@/lib/posthog/track';
import { v4 as uuidv4 } from 'uuid';
import { SUPABASE_STORAGE_BUCKETS } from '@/lib/utils';

export function useUploadContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ContentUploadRequest & { file?: File }): Promise<ContentUploadResponse> => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.id) {
        throw new Error('Unauthorized');
      }
      
      trackEvent('content_upload_attempt', { userId: user.id });
      const analyticsId = uuidv4();

      const body: Record<string, any> = {
        content_type: data.content_type,
        platform: data.platform,
        user_id: user.id,
        analytics_id: analyticsId,
      };

      if (data.content_type === 'video') {
        if (!data.file) throw new Error('File is required for video content');

        const videoPath = `videos/${analyticsId}.mp4`;
        const { data: generateUrlResponse, error: generateUrlError } = await supabase
          .storage
          .from(SUPABASE_STORAGE_BUCKETS.VIDEOS)
          .createSignedUploadUrl(videoPath);

        if (generateUrlError || !generateUrlResponse.token) throw new Error(`Failed to generate upload URL: ${generateUrlError?.message}`);

        const { data: uploadResponse, error: uploadError } = await supabase
          .storage
          .from(SUPABASE_STORAGE_BUCKETS.VIDEOS)
          .uploadToSignedUrl(videoPath, generateUrlResponse?.token, data.file, {
            upsert: true,
          });

        if (uploadError || !uploadResponse) throw new Error(`Failed to upload file: ${uploadError?.message}`);
        body.video_file_path = videoPath;
        
      } else {
        if (!data.content_text) throw new Error('Content text is required for text content');

        body.content_text = data.content_text;
      }
      

      const response = await fetch('/api/content/upload', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload content');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-analytics'] });
    },
  });
}
