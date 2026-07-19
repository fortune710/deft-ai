'use client';

import Link from 'next/link';
import type { ContentAnalytics } from '@/types/content-analytics';
import { useContentAnalyticsItem } from '@/hooks/use-content-analytics-item';
import { PLATFORM_COLORS } from '@/lib/utils';
import { useFileUrl } from '@/hooks/use-file-url';
import { useAuth } from '@/hooks/use-clerk-auth';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { VideoContainer } from '@/components/content-analytics/video-container';
import { ContentTextContainer } from '@/components/content-analytics/content-text-container';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { AnalysisPanel } from '@/components/content-analytics/analysis-panel';

const log = logger.child({ module: 'app/content-analytics/[id]/page' });



export default function ContentAnalyticsItemPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: item, isLoading, error } = useContentAnalyticsItem(id);
  const storedVideoUrl = useFileUrl(item?.video_file_path);
  const { userId } = useAuth();

  log.debug('Rendering content analytics item', {
    userId: userId || 'signed_out',
    action: 'render_content_analytics_item',
    analyticsId: id,
  });

  const platformColor = PLATFORM_COLORS[item?.platform!] || PLATFORM_COLORS.youtube;

  const videoSrc = item?.video_url || storedVideoUrl;

  return (
    <AppLayout>
      <div className="space-y-6 pb-20">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/content-analytics">Content Analytics</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {isLoading ? 'Loading...' : item ? (item.title || 'Untitled Content') : 'Not Found'}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {isLoading ? (
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="w-full sm:w-[35%] h-[600px]">
            <Skeleton className="aspect-video w-full h-full rounded-lg" />
          </div>
          <div className="flex-1 w-full">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          </div>
        </div>
      ) : error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Failed to load</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-destructive">
            {error instanceof Error ? error?.message : 'Unknown error'}
          </CardContent>
        </Card>
      ) : !item ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Not found</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This analytics item doesn’t exist or you don’t have access to it.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className='flex items-center justify-between'>
            <h1 className="text-2xl max-md:text-lg font-bold mr-2">{item.title || 'Untitled Content'}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`${platformColor} text-white`}>{item.platform}</Badge>
              <Badge className='max-md:hidden' variant="secondary">{item.processing_status}</Badge>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {item.content_type === 'video' ? (
              <VideoContainer videoSrc={videoSrc} />
              ) : (
                <ContentTextContainer contentText={item.content_text} />
              )}

            <div className='w-full'>
              <AnalysisPanel item={item} />
            </div>
          </div>
        </div>
      )}
      </div>
    </AppLayout>
  );
}
