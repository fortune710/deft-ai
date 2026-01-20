'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ContentAnalytics } from '@/types/content-analytics';
import { ContentFeedbackDialog } from './content-feedback-dialog';
import { VideoThumbnail } from './video-thumbnail';
import { TextThumbnail } from './text-thumbnail';
import { useRouter } from 'next/navigation';
import { getScoreColor, PLATFORM_COLORS, STATUS_COLORS } from '@/lib/utils';
import { CircularProgress } from '../ui/circular-progress';

interface ContentAnalyticsCardProps {
  content: ContentAnalytics;
}


export function ContentAnalyticsCard({ content }: ContentAnalyticsCardProps) {
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);

  const statusColor = STATUS_COLORS[content.processing_status] || STATUS_COLORS.pending;
  const overallScore = content.analysis_results?.overall_score || content.ai_feedback?.overall_score;
  const platformColor = PLATFORM_COLORS[content.platform] || PLATFORM_COLORS.youtube;

  const router = useRouter();
  
  return (
    <>
      <Card onClick={() => router.push(`/content-analytics/${content.id}`)} className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="p-0">

          {
            content.content_type === 'video' ? (
              <VideoThumbnail
                thumbnailUrl={content.thumbnail_url}
                title={content.title}
              />
            ) : (
              <TextThumbnail contentText={content.content_text} />
            )
          }
          
        </CardHeader>

        <CardContent className="space-y-2 p-4 bg-zinc-800">
          <div>
            <CardTitle className="text-lg line-clamp-2">{content.title || 'Untitled Content'}</CardTitle>
          </div>

          <div className="flex items-center justify-between">
            <Badge className={`${platformColor} text-white`}>
              {content.platform || 'unknown'}
            </Badge>

            {overallScore != null ? (
              <CircularProgress 
                radius={13}
                strokeWidth={3}
                centerText={overallScore?.toString() || '0'}
                progress={(overallScore ?? 0) * 10} 
                progressColor={getScoreColor(overallScore ?? 0)}
                textColor='white'
                
              />
            ) : (
              <Badge className={`${statusColor.bg} text-muted`}>
                {(content.processing_status || 'pending').replace('_', ' ')}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {(content.analysis_results || content.ai_feedback) && (
        <ContentFeedbackDialog
          content={content}
          open={feedbackDialogOpen}
          onOpenChange={setFeedbackDialogOpen}
        />
      )}
    </>
  );
}
