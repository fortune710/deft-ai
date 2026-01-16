import { useQuery } from '@tanstack/react-query';
import type { ContentAnalytics, Platform, ProcessingStatus } from '@/types/content-analytics';

interface UseContentAnalyticsOptions {
  platform?: Platform;
  status?: ProcessingStatus;
}

export function useContentAnalytics(options: UseContentAnalyticsOptions = {}) {
  const { platform, status } = options;

  const queryParams = new URLSearchParams();
  if (platform) queryParams.append('platform', platform);
  if (status) queryParams.append('status', status);

  return useQuery({
    queryKey: ['content-analytics', platform, status],
    queryFn: async (): Promise<ContentAnalytics[]> => {
      const response = await fetch(`/api/content/list?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch content analytics');
      }
      const data = await response.json();
      return data.content || [];
    },
  });
}
