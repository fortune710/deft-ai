import { useQuery } from '@tanstack/react-query';
import type { VideoAnalytics, Platform, ProcessingStatus } from '@/types/video-analytics';

interface UseVideoAnalyticsOptions {
  platform?: Platform;
  status?: ProcessingStatus;
}

export function useVideoAnalytics(options: UseVideoAnalyticsOptions = {}) {
  return useQuery({
    queryKey: ['video-analytics', options.platform, options.status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.platform) params.append('platform', options.platform);
      if (options.status) params.append('status', options.status);

      const response = await fetch(`/api/videos/list?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }

      const data = await response.json();
      return data.videos as VideoAnalytics[];
    },
    staleTime: 30000,
  });
}
