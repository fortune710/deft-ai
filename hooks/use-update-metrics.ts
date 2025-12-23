import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { VideoMetrics } from '@/types/video-analytics';

interface UpdateMetricsData {
  video_id: string;
  metrics: VideoMetrics;
  title?: string;
  description?: string;
}

export function useUpdateMetrics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateMetricsData) => {
      const response = await fetch('/api/videos/update-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update metrics');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-analytics'] });
    },
  });
}
