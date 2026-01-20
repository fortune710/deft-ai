'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useContentAnalytics } from '@/hooks/use-content-analytics';
import { useContentAnalyticsProgress } from '@/hooks/use-content-analytics-progress';
import { ContentUploadDialog } from '@/components/content-analytics/content-upload-dialog';
import { ContentAnalyticsCard } from '@/components/content-analytics/content-analytics-card';
import { Plus, Video, FileText, Filter } from 'lucide-react';
import type { Platform } from '@/types/content-analytics';
import { toast } from 'sonner';
import { AppLayout } from '@/components/app-layout';
import { FilterPlatformDrawer } from '@/components/content-analytics/filter-platform-drawer';

const PLATFORMS: { value: Platform | 'all'; label: string }[] = [
  { value: 'all', label: 'All Platforms' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
];

export default function ContentAnalyticsPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const { data: content, isLoading, error } = useContentAnalytics(
    selectedPlatform !== 'all' ? { platform: selectedPlatform } : {}
  );

  const { progress, isGenerating } = useContentAnalyticsProgress();

  const currentProgress = progress?.progress_percentage || 0;
  const progressMessage = progress?.message || 'Processing your content…';
  const progressStage = progress?.current_step || 'queued';

  const friendlyStatus = useMemo(() => {
    if (!isGenerating) return '';

    if (currentProgress < 20) return 'Getting things ready…';
    if (currentProgress < 40) return 'Processing content…';
    if (currentProgress < 60) return 'Analyzing content…';
    if (currentProgress < 80) return 'Generating insights…';
    return 'Finalizing analysis…';
  }, [isGenerating, currentProgress]);

  // Manage persistent toast for content analysis progress
  useEffect(() => {
    const toastId = 'content-analysis-progress';

    if (isGenerating) {
      toast.loading(
        <div className="space-y-2 w-full">
          <p className="font-semibold text-sm">{progressMessage}</p>
          {friendlyStatus && (
            <p className="text-xs text-muted-foreground">{friendlyStatus}</p>
          )}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
            <Progress 
              value={currentProgress}
              className="h-2 rounded-full transition-all duration-500"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
            <span>{Math.round(currentProgress)}%</span>
            <span className="text-[10px]">This may take a while</span>
          </div>
        </div>,
        {
          id: toastId,
          duration: Infinity,
        }
      );
    } else {
      toast.dismiss(toastId);
    }

    return () => {
      if (!isGenerating) {
        toast.dismiss(toastId);
      }
    };
  }, [isGenerating, currentProgress, progressMessage, friendlyStatus]);

  return (
    <AppLayout>
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl max-md:text-lg font-bold">Content Analytics</h1>
            <p className="text-muted-foreground max-md:text-sm mt-2">
              Analyze your content quality with AI-powered insights
            </p>
          </div>
          {/* Desktop Button - Hidden on mobile */}
          <Button 
            onClick={() => setUploadDialogOpen(true)} 
            size="lg"
            className="hidden md:flex rounded-lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Analyze Content
          </Button>
        </div>

        {/* Mobile Floating Action Button - Only visible on mobile */}
        <Button
          onClick={() => setUploadDialogOpen(true)}
          size="icon"
          className="md:hidden fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full shadow-lg"
        >
          <Plus className="h-5 w-5" />
        </Button>

        {/* Mobile Subheader - Only visible on mobile */}
        <div className="md:hidden flex items-center justify-between">
          <span className="text-sm font-medium">
            {PLATFORMS.find((p) => p.value === selectedPlatform)?.label || 'All Platforms'}
          </span>
          <FilterPlatformDrawer
            selectedPlatform={selectedPlatform}
            onPlatformChange={setSelectedPlatform}
          >
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </FilterPlatformDrawer>
        </div>

        {/* Desktop Tabs - Hidden on mobile */}
        <Tabs value={selectedPlatform} onValueChange={(value) => setSelectedPlatform(value as Platform | 'all')} className="hidden md:block">
          <TabsList className="flex-wrap">
            {PLATFORMS.map((platform) => (
              <TabsTrigger key={platform.value} value={platform.value}>
                {platform.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Content - Visible on both mobile and desktop */}
        <div className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-3 bg-muted rounded" />
                      <div className="h-3 bg-muted rounded w-5/6" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-destructive">Failed to load content. Please try again.</p>
              </CardContent>
            </Card>
          ) : !content || content.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full bg-muted">
                    <Video className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">No content yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start analyzing your content to get AI-powered insights
                </p>
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Analyze Your First Content
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {content.map((item) => (
                <ContentAnalyticsCard key={item.id} content={item} />
              ))}
            </div>
          )}
        </div>

        <ContentUploadDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} />
      </div>
    </AppLayout>
  );
}
