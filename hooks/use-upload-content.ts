import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ContentUploadRequest, ContentUploadResponse } from '@/types/content-analytics';
import { supabase } from '@/lib/supabase/client';

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

      const formData = new FormData();
      
      if (data.file) {
        formData.append('file', data.file);
      }
      if (data.video_url) {
        formData.append('video_url', data.video_url);
      }
      if (data.content_text) {
        formData.append('content_text', data.content_text);
      }
      formData.append('platform', data.platform);
      formData.append('content_type', data.content_type);
      formData.append('user_id', user.id);

      const response = await fetch('/api/content/upload', {
        method: 'POST',
        body: formData,
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
