'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { ContentAnalytics } from '@/types/content-analytics';

async function fetchContentAnalyticsItem(id: string): Promise<ContentAnalytics | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    throw new Error('Unauthorized');
  }

  const { data, error } = await supabase
    .from('content_analytics')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ContentAnalytics | null) ?? null;
}

export function useContentAnalyticsItem(id: string) {
  return useQuery({
    queryKey: ['content-analytics-item', id],
    queryFn: () => fetchContentAnalyticsItem(id),
    enabled: !!id,
    staleTime: 15_000,
  });
}

