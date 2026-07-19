'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { ContentAnalytics, Platform, ProcessingStatus } from '@/types/content-analytics';
import { useAuth } from '@/hooks/use-clerk-auth';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'hooks/use-content-analytics' });

interface UseContentAnalyticsOptions { platform?: Platform; status?: ProcessingStatus }

export function useContentAnalytics(options: UseContentAnalyticsOptions = {}) {
  const { userId } = useAuth();
  const records = useQuery(api.contentAnalytics.list, userId ? options : 'skip');
  log.debug('Resolved Convex content analytics list', {
    userId: userId || 'signed_out', action: 'fetch_content_analytics', ...options,
  });
  return {
    data: records?.map(({ _id, _creationTime, ...record }) => ({ ...record, id: _id }) as unknown as ContentAnalytics) ?? [],
    isLoading: Boolean(userId) && records === undefined,
    error: null as Error | null,
  };
}
