'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SimpleProgress } from './simple-progress';
import { TrendingUp, Lightbulb, CheckCircle2, AlertCircle } from 'lucide-react';
import type { VideoAnalytics } from '@/types/video-analytics';

interface VideoFeedbackDialogProps {
  video: VideoAnalytics;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoFeedbackDialog({ video, open, onOpenChange }: VideoFeedbackDialogProps) {
  const feedback = video.ai_feedback;

  if (!feedback) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="line-clamp-1">{video.title}</span>
            <Badge className="ml-auto">
              Score: {feedback.overall_score}/10
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="hook">Hook</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="recommendations">Tips</TabsTrigger>
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
                      <span className={`text-2xl font-bold ${getScoreColor(feedback.overall_score)}`}>
                        {feedback.overall_score}/10
                      </span>
                    </div>
                    <SimpleProgress value={feedback.overall_score * 10} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Hook Score</span>
                        <span className={`font-semibold ${getScoreColor(feedback.hook_analysis.score)}`}>
                          {feedback.hook_analysis.score}/10
                        </span>
                      </div>
                      <SimpleProgress value={feedback.hook_analysis.score * 10} className="h-1.5" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Content Score</span>
                        <span className={`font-semibold ${getScoreColor(feedback.content_quality.score)}`}>
                          {feedback.content_quality.score}/10
                        </span>
                      </div>
                      <SimpleProgress value={feedback.content_quality.score * 10} className="h-1.5" />
                    </div>
                  </div>

                  {feedback.comparison_insights && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Performance vs Your Average
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Engagement</span>
                          <div className="font-semibold">
                            {feedback.comparison_insights.vs_user_average.engagement_diff_percentage > 0 ? '+' : ''}
                            {feedback.comparison_insights.vs_user_average.engagement_diff_percentage.toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Trend</span>
                          <div className="font-semibold capitalize">
                            {feedback.comparison_insights.vs_user_average.performance_trend}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="hook" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Hook Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium mb-1">Opening (First 3-5 seconds)</p>
                    <p className="text-sm italic">"{feedback.hook_analysis.transcript_excerpt}"</p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Strengths
                    </h4>
                    <ul className="space-y-1">
                      {feedback.hook_analysis.strengths.map((strength, idx) => (
                        <li key={idx} className="text-sm pl-6 relative">
                          <span className="absolute left-0">•</span>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-amber-700">
                      <AlertCircle className="h-4 w-4" />
                      Improvements
                    </h4>
                    <ul className="space-y-1">
                      {feedback.hook_analysis.improvements.map((improvement, idx) => (
                        <li key={idx} className="text-sm pl-6 relative">
                          <span className="absolute left-0">•</span>
                          {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Content Quality Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Highlights
                    </h4>
                    <ul className="space-y-1">
                      {feedback.content_quality.highlights.map((highlight, idx) => (
                        <li key={idx} className="text-sm pl-6 relative">
                          <span className="absolute left-0">•</span>
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-amber-700">
                      <AlertCircle className="h-4 w-4" />
                      Areas for Improvement
                    </h4>
                    <ul className="space-y-1">
                      {feedback.content_quality.issues.map((issue, idx) => (
                        <li key={idx} className="text-sm pl-6 relative">
                          <span className="absolute left-0">•</span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Pacing Notes</h4>
                    <p className="text-sm text-muted-foreground">{feedback.content_quality.pacing_notes}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Retention & Improvement Tips
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Suggestions</h4>
                    <ul className="space-y-2">
                      {feedback.retention_tips.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="text-sm pl-6 relative">
                          <span className="absolute left-0 text-primary">→</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {feedback.retention_tips.critical_moments.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Critical Moments</h4>
                      <ul className="space-y-1">
                        {feedback.retention_tips.critical_moments.map((moment, idx) => (
                          <li key={idx} className="text-sm pl-6 relative">
                            <span className="absolute left-0">•</span>
                            {moment}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Next Video Recommendations</h4>
                    <ul className="space-y-2">
                      {feedback.next_video_recommendations.map((recommendation, idx) => (
                        <li key={idx} className="text-sm pl-6 relative">
                          <span className="absolute left-0 text-primary">✓</span>
                          {recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
