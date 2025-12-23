'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUpdateMetrics } from '@/hooks/use-update-metrics';
import { Loader2, Calculator } from 'lucide-react';
import { calculateEngagementRate } from '@/lib/validations/video-analytics';

interface ManualMetricsDialogProps {
  videoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualMetricsDialog({ videoId, open, onOpenChange }: ManualMetricsDialogProps) {
  const [views, setViews] = useState('');
  const [likes, setLikes] = useState('');
  const [comments, setComments] = useState('');
  const [shares, setShares] = useState('');
  const [error, setError] = useState<string | null>(null);

  const updateMetrics = useUpdateMetrics();

  const engagementRate = calculateEngagementRate({
    views: parseInt(views) || 0,
    likes: parseInt(likes) || 0,
    comments: parseInt(comments) || 0,
    shares: parseInt(shares) || 0,
  });

  const handleSubmit = async () => {
    setError(null);

    const viewsNum = parseInt(views);
    const likesNum = parseInt(likes);
    const commentsNum = parseInt(comments);
    const sharesNum = parseInt(shares);

    if (isNaN(viewsNum) || viewsNum < 0) {
      setError('Please enter a valid number of views');
      return;
    }

    if (isNaN(likesNum) || likesNum < 0) {
      setError('Please enter a valid number of likes');
      return;
    }

    if (isNaN(commentsNum) || commentsNum < 0) {
      setError('Please enter a valid number of comments');
      return;
    }

    if (isNaN(sharesNum) || sharesNum < 0) {
      setError('Please enter a valid number of shares');
      return;
    }

    try {
      await updateMetrics.mutateAsync({
        video_id: videoId,
        metrics: {
          views: viewsNum,
          likes: likesNum,
          comments: commentsNum,
          shares: sharesNum,
          engagement_rate: engagementRate,
        },
      });

      setViews('');
      setLikes('');
      setComments('');
      setShares('');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update metrics');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Enter Video Metrics</DialogTitle>
          <DialogDescription>
            Manually enter the performance metrics for this video
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="views">Views</Label>
              <Input
                id="views"
                type="number"
                placeholder="0"
                value={views}
                onChange={(e) => setViews(e.target.value)}
                disabled={updateMetrics.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="likes">Likes</Label>
              <Input
                id="likes"
                type="number"
                placeholder="0"
                value={likes}
                onChange={(e) => setLikes(e.target.value)}
                disabled={updateMetrics.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments">Comments</Label>
              <Input
                id="comments"
                type="number"
                placeholder="0"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                disabled={updateMetrics.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shares">Shares</Label>
              <Input
                id="shares"
                type="number"
                placeholder="0"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                disabled={updateMetrics.isPending}
              />
            </div>
          </div>

          <div className="bg-muted p-3 rounded-lg flex items-center gap-2">
            <Calculator className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Calculated Engagement Rate</p>
              <p className="text-2xl font-bold">{engagementRate.toFixed(2)}%</p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateMetrics.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={updateMetrics.isPending}>
              {updateMetrics.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Metrics
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
