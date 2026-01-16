'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { ContentAnalytics } from '@/types/content-analytics';
import { useContentAnalyticsItem } from '@/hooks/use-content-analytics-item';
import { supabase } from '@/lib/supabase/client';
import { SUPABASE_STORAGE_BUCKETS } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SimpleProgress } from '@/components/content-analytics/simple-progress';
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

function scoreColor(score: number) {
  if (score >= 8) return 'text-green-600';
  if (score >= 6) return 'text-yellow-600';
  return 'text-red-600';
}

function AnalysisPanel({ item }: { item: ContentAnalytics }) {
  const feedback = item.analysis_results || item.ai_feedback;

  if (!feedback) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Analysis</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No analysis results yet (still processing or failed).
        </CardContent>
      </Card>
    );
  }

  const hookExcerpt = feedback.hook_analysis?.transcript_excerpt || feedback.hook_analysis?.text_excerpt;

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="hook">Hook</TabsTrigger>
        <TabsTrigger value="content">Content</TabsTrigger>
        <TabsTrigger value="tips">Tips</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Score</span>
                <span className={`text-2xl font-bold ${scoreColor(feedback.overall_score ?? 0)}`}>
                  {feedback.overall_score ?? 0}/10
                </span>
              </div>
              <SimpleProgress value={(feedback.overall_score ?? 0) * 10} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Hook</span>
                  <span className={`font-semibold ${scoreColor(feedback.hook_analysis?.score ?? 0)}`}>
                    {feedback.hook_analysis?.score ?? 0}/10
                  </span>
                </div>
                <SimpleProgress value={(feedback.hook_analysis?.score ?? 0) * 10} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Content</span>
                  <span className={`font-semibold ${scoreColor(feedback.content_quality?.score ?? 0)}`}>
                    {feedback.content_quality?.score ?? 0}/10
                  </span>
                </div>
                <SimpleProgress value={(feedback.content_quality?.score ?? 0) * 10} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="hook" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hook Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hookExcerpt ? (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-1">
                  {item.content_type === 'video' ? 'Opening (First seconds)' : 'Opening Lines'}
                </p>
                <p className="text-sm italic">"{hookExcerpt}"</p>
              </div>
            ) : null}

            {feedback.hook_analysis?.strengths?.length ? (
              <div>
                <p className="font-medium mb-2">Strengths</p>
                <ul className="space-y-1 text-sm">
                  {feedback.hook_analysis.strengths.map((s, idx) => (
                    <li className='flex items-center gap-2' key={idx}>
                      <span className='self-stretch min-h-[20px] w-1 rounded-sm bg-green-500'/>
                      <span className='py-0.5'>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {feedback.hook_analysis?.improvements?.length ? (
              <div>
                <p className="font-medium mb-2">Improvements</p>
                <ul className="space-y-1.5 text-sm">
                  {feedback.hook_analysis.improvements.map((s, idx) => (
                    <li className='flex items-center gap-2' key={idx}>
                      <span className='self-stretch w-1 rounded-sm bg-red-500'/>
                      <span className='py-0.5'>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="content" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Content Quality</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {feedback.content_quality?.highlights?.length ? (
              <div>
                <p className="font-medium mb-2">Highlights</p>
                <ul className="space-y-1 text-sm">
                  {feedback.content_quality.highlights.map((s, idx) => (
                    <li className='flex items-center gap-2' key={idx}>
                      <span className='self-stretch min-h-[20px] w-1 rounded-sm bg-green-500'/>
                      <span className='py-0.5'>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {feedback.content_quality?.issues?.length ? (
              <div>
                <p className="font-medium mb-2">Issues</p>
                <ul className="space-y-1.5 text-sm">
                  {feedback.content_quality.issues.map((s, idx) => (
                    <li className='flex items-center gap-2' key={idx}>
                      <span className='self-stretch w-1 rounded-sm bg-red-500'/>
                      <span className='py-0.5'>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {feedback.content_quality?.pacing_notes ? (
              <div className="border-t pt-4">
                <p className="font-medium mb-2">Pacing Notes</p>
                <p className="text-sm text-muted-foreground">{feedback.content_quality.pacing_notes}</p>
              </div>
            ) : null}

            {feedback.content_quality?.structure_notes ? (
              <div className="border-t pt-4">
                <p className="font-medium mb-2">Structure Notes</p>
                <p className="text-sm text-muted-foreground">{feedback.content_quality.structure_notes}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="tips" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {feedback.retention_tips?.suggestions?.length ? (
              <div>
                <p className="font-medium mb-2">Suggestions</p>
                <ul className="space-y-1 text-sm">
                  {feedback.retention_tips.suggestions.map((s, idx) => (
                    <li className='flex items-center gap-2' key={idx}>
                      <span className='self-stretch min-h-[20px] w-1 rounded-sm bg-green-500'/>
                      <span className='py-0.5'>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {feedback.next_video_recommendations?.length ? (
              <div className="border-t pt-4">
                <p className="font-medium mb-2">Next Content Recommendations</p>
                <ul className="space-y-1 text-sm">
                  {feedback.next_video_recommendations.map((s, idx) => (
                    <li className='flex items-center gap-2' key={idx}>
                      <span className='self-stretch min-h-[20px] w-1 rounded-sm bg-primary'/>
                      <span className='py-0.5'>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

export default function ContentAnalyticsItemPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: item, isLoading, error } = useContentAnalyticsItem(id);

  const videoSrc = useMemo(() => {
    if (!item) return null;
    if (item.video_url) return item.video_url;
    if (item.video_file_path) {
      const { data } = supabase.storage.from(SUPABASE_STORAGE_BUCKETS.VIDEOS).getPublicUrl(item.video_file_path);
      return data.publicUrl || null;
    }
    return null;
  }, [item]);

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
            <h1 className="text-2xl font-bold mr-2">{item.title || 'Untitled Content'}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{item.platform}</Badge>
              <Badge variant="outline">{item.content_type}</Badge>
              <Badge variant="secondary">{item.processing_status}</Badge>
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

