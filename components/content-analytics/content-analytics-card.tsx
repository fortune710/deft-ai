'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ContentAnalytics } from '@/types/content-analytics';
import { ContentFeedbackDialog } from './content-feedback-dialog';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface ContentAnalyticsCardProps {
  content: ContentAnalytics;
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube: 'bg-red-500',
  instagram: 'bg-pink-500',
  tiktok: 'bg-black',
  twitter: 'bg-blue-500',
  linkedin: 'bg-blue-600',
  facebook: 'bg-blue-700',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-800' },
  downloading: { bg: 'bg-blue-100', text: 'text-blue-800' },
  extracting_audio: { bg: 'bg-blue-100', text: 'text-blue-800' },
  transcribing: { bg: 'bg-purple-100', text: 'text-purple-800' },
  analyzing: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  extracting_thumbnail: { bg: 'bg-cyan-100', text: 'text-cyan-800' },
  completed: { bg: 'bg-green-100', text: 'text-green-800' },
  failed: { bg: 'bg-red-100', text: 'text-red-800' },
};

export function ContentAnalyticsCard({ content }: ContentAnalyticsCardProps) {
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [textExpanded, setTextExpanded] = useState(false);

  const statusColor = STATUS_COLORS[content.processing_status] || STATUS_COLORS.pending;
  const overallScore = content.analysis_results?.overall_score || content.ai_feedback?.overall_score;
  const platformColor = PLATFORM_COLORS[content.platform] || PLATFORM_COLORS.youtube;

  // Get text preview (first 150 characters)
  const textPreview = content.content_text 
    ? (textExpanded ? content.content_text : content.content_text.substring(0, 150))
    : null;
  const hasMoreText = content.content_text && content.content_text.length > 150;
  const router = useRouter();
  
  return (
    <>
      <Card onClick={() => router.push(`/content-analytics/${content.id}`)} className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="p-0">

          {
            content.content_type === 'video' ? (
            <div className="relative w-full aspect-video rounded-t-lg overflow-hidden bg-muted">
              <Image
                src={content.thumbnail_url || ''}
                alt={content.title || 'Video thumbnail'}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            ) : (
              <div className="text-sm text-muted-foreground p-3 rounded-lg relative w-full aspect-video rounded-t-lg overflow-hidden bg-muted">
                <p className="whitespace-pre-wrap">
                  {textPreview}
                </p>
              </div>
            )
          }
          
        </CardHeader>

        <CardContent className="space-y-4 p-4">
          {/* Text preview for text content */}
          {content.content_type === 'text' && textPreview && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                <p className="whitespace-pre-wrap">
                  {textPreview}
                  {!textExpanded && hasMoreText && '...'}
                </p>
              </div>
              {hasMoreText && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTextExpanded(!textExpanded)}
                  className="text-xs"
                >
                  {textExpanded ? 'Show less' : 'Read more'}
                </Button>
              )}
            </div>
          )}

          <div>
            <CardTitle className="text-lg line-clamp-2">{content.title || 'Untitled Content'}</CardTitle>
            <Badge className={`${platformColor} text-white`}>
              {content.platform || 'unknown'}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={`${statusColor.bg} ${statusColor.text}`}>
              {(content.processing_status || 'pending').replace('_', ' ')}
            </Badge>
            {overallScore != null && (
              <Badge variant="outline" className="font-semibold">
                Score: {overallScore}/10
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
