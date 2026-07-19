'use client';

import { useQuery } from 'convex/react';
import type { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import type { ContentAnalytics } from '@/types/content-analytics';
import { useAuth } from '@/hooks/use-clerk-auth';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'hooks/use-content-analytics-item' });

export function useContentAnalyticsItem(id: string) {
  const { userId } = useAuth();
  const record = useQuery(
    api.contentAnalytics.get,
    userId && id ? { analyticsId: id as Id<'content_analytics'> } : 'skip',
  );
  log.debug('Resolved Convex content analytics item', {
    userId: userId || 'signed_out', action: 'fetch_content_analytics_item', analyticsId: id,
  });
  return {
    data: record ? ({ ...record, id: record._id } as unknown as ContentAnalytics) : null,
    isLoading: Boolean(userId) && record === undefined,
    error: null as Error | null,
  };
}
