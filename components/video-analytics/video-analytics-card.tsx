'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, ThumbsUp, MessageCircle, Share2, TrendingUp } from 'lucide-react';
import type { VideoAnalytics } from '@/types/video-analytics';
import { VideoFeedbackDialog } from './video-feedback-dialog';

interface VideoAnalyticsCardProps {
  video: VideoAnalytics;
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube: 'bg-red-500',
  instagram: 'bg-pink-500',
  tiktok: 'bg-black',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-800' },
  downloading: { bg: 'bg-blue-100', text: 'text-blue-800' },
  extracting_audio: { bg: 'bg-blue-100', text: 'text-blue-800' },
  transcribing: { bg: 'bg-purple-100', text: 'text-purple-800' },
  analyzing: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  completed: { bg: 'bg-green-100', text: 'text-green-800' },
  failed: { bg: 'bg-red-100', text: 'text-red-800' },
};

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export function VideoAnalyticsCard({ video }: VideoAnalyticsCardProps) {
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);

  const statusColor = STATUS_COLORS[video.processing_status] || STATUS_COLORS.pending;
  const overallScore = video.ai_feedback?.overall_score;

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg line-clamp-2">{video.title || 'Untitled Video'}</CardTitle>
            </div>
            <Badge className={`${PLATFORM_COLORS[video.platform]} text-white ml-2`}>
              {video.platform}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className={`${statusColor.bg} ${statusColor.text}`}>
              {video.processing_status.replace('_', ' ')}
            </Badge>
            {overallScore && (
              <Badge variant="outline" className="font-semibold">
                Score: {overallScore}/10
              </Badge>
            )}
          </div>

          {video.metrics && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{formatNumber(video.metrics.views)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{formatNumber(video.metrics.likes)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{formatNumber(video.metrics.comments)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{video.metrics.engagement_rate.toFixed(2)}%</span>
              </div>
            </div>
          )}

          {video.processing_status === 'completed' && video.ai_feedback && (
            <Button className="w-full" onClick={() => setFeedbackDialogOpen(true)}>
              View AI Insights
            </Button>
          )}
        </CardContent>
      </Card>

      {video.ai_feedback && (
        <VideoFeedbackDialog
          video={video}
          open={feedbackDialogOpen}
          onOpenChange={setFeedbackDialogOpen}
        />
      )}
    </>
  );
}
