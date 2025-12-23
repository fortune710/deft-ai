'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUploadVideo } from '@/hooks/use-upload-video';
import { validateVideoUrl } from '@/lib/validations/video-analytics';
import { Loader2, Youtube, Instagram } from 'lucide-react';
import { VideoProcessingIndicator } from './video-processing-indicator';

interface VideoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoUploadDialog({ open, onOpenChange }: VideoUploadDialogProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadedJobId, setUploadedJobId] = useState<string | null>(null);
  const [requiresManualMetrics, setRequiresManualMetrics] = useState(false);

  const uploadVideo = useUploadVideo();

  const handleSubmit = async () => {
    setValidationError(null);

    const validation = validateVideoUrl(videoUrl);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid video URL');
      return;
    }

    try {
      const result = await uploadVideo.mutateAsync({ video_url: videoUrl });
      setUploadedJobId(result.job_id);
      setRequiresManualMetrics(result.requires_manual_metrics || false);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to upload video');
    }
  };

  const handleClose = () => {
    setVideoUrl('');
    setValidationError(null);
    setUploadedJobId(null);
    setRequiresManualMetrics(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Analyze Video</DialogTitle>
          <DialogDescription>
            Enter a video URL from YouTube, Instagram, or TikTok to get AI-powered insights
          </DialogDescription>
        </DialogHeader>

        {!uploadedJobId ? (
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="video-url">Video URL</Label>
              <Input
                id="video-url"
                placeholder="https://youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value);
                  setValidationError(null);
                }}
                disabled={uploadVideo.isPending}
              />
            </div>

            <div className="flex gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Youtube className="h-4 w-4" />
                <span>YouTube</span>
              </div>
              <div className="flex items-center gap-1">
                <Instagram className="h-4 w-4" />
                <span>Instagram</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
                <span>TikTok</span>
              </div>
            </div>

            {validationError && (
              <Alert variant="destructive">
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={uploadVideo.isPending}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={uploadVideo.isPending || !videoUrl}>
                {uploadVideo.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Analyze Video
              </Button>
            </div>
          </div>
        ) : (
          <div className="pt-4">
            <VideoProcessingIndicator
              jobId={uploadedJobId}
              onComplete={handleClose}
              requiresManualMetrics={requiresManualMetrics}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
