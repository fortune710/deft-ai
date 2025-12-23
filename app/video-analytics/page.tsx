'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVideoAnalytics } from '@/hooks/use-video-analytics';
import { VideoUploadDialog } from '@/components/video-analytics/video-upload-dialog';
import { VideoAnalyticsCard } from '@/components/video-analytics/video-analytics-card';
import { Plus, Video } from 'lucide-react';
import type { Platform } from '@/types/video-analytics';

export default function VideoAnalyticsPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const { data: videos, isLoading, error } = useVideoAnalytics(
    selectedPlatform !== 'all' ? { platform: selectedPlatform } : {}
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Video Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Analyze your content performance with AI-powered insights
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Analyze Video
        </Button>
      </div>

      <Tabs value={selectedPlatform} onValueChange={(value) => setSelectedPlatform(value as Platform | 'all')}>
        <TabsList>
          <TabsTrigger value="all">All Platforms</TabsTrigger>
          <TabsTrigger value="youtube">YouTube</TabsTrigger>
          <TabsTrigger value="instagram">Instagram</TabsTrigger>
          <TabsTrigger value="tiktok">TikTok</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedPlatform} className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
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
                <p className="text-destructive">Failed to load videos. Please try again.</p>
              </CardContent>
            </Card>
          ) : !videos || videos.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <Video className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start analyzing your content to get AI-powered insights
                </p>
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Analyze Your First Video
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <VideoAnalyticsCard key={video.id} video={video} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <VideoUploadDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} />
    </div>
  );
}
