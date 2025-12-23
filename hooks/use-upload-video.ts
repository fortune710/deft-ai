import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { VideoUploadRequest, VideoUploadResponse } from '@/types/video-analytics';

export function useUploadVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: VideoUploadRequest): Promise<VideoUploadResponse> => {
      const response = await fetch('/api/videos/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ video_url: data.video_url }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload video');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-analytics'] });
    },
  });
}
