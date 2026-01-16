'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUploadContent } from '@/hooks/use-upload-content';
import { validateVideoUrl } from '@/lib/validations/video-analytics';
import { Loader2 } from 'lucide-react';
import type { Platform, ContentType } from '@/types/content-analytics';

interface ContentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
];

export function ContentUploadDialog({ open, onOpenChange }: ContentUploadDialogProps) {
  const [platform, setPlatform] = useState<Platform | ''>('');
  const [contentType, setContentType] = useState<ContentType>('video');
  const [videoUrl, setVideoUrl] = useState('');
  const [contentText, setContentText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadedAnalyticsId, setUploadedAnalyticsId] = useState<string | null>(null);

  const uploadContent = useUploadContent();

  const isTextPlatform = platform === 'twitter' || platform === 'linkedin';
  const showTextarea = isTextPlatform && contentType === 'text';
  const showFileInput = !isTextPlatform && contentType === 'video';
  const showUrlInput = !isTextPlatform && contentType === 'video';

  const handleSubmit = async () => {
    setValidationError(null);

    if (!platform) {
      setValidationError('Please select a platform');
      return;
    }

    if (contentType === 'video') {
      if (!videoUrl && !file) {
        setValidationError('Please provide a video URL or upload a file');
        return;
      }

      if (videoUrl) {
        const validation = validateVideoUrl(videoUrl);
        if (!validation.valid) {
          setValidationError(validation.error || 'Invalid video URL');
          return;
        }
      }
    } else if (contentType === 'text') {
      if (!contentText || contentText.trim().length === 0) {
        setValidationError('Please enter content text');
        return;
      }
    }

    try {
      const result = await uploadContent.mutateAsync({
        platform: platform as Platform,
        content_type: contentType,
        video_url: videoUrl || undefined,
        content_text: contentText || undefined,
        file: file || undefined,
      });
      setUploadedAnalyticsId(result.analytics_id);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to upload content');
    }
  };

  const handleClose = () => {
    setPlatform('');
    setContentType('video');
    setVideoUrl('');
    setContentText('');
    setFile(null);
    setValidationError(null);
    setUploadedAnalyticsId(null);
    onOpenChange(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setVideoUrl(''); // Clear URL if file is selected
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Analyze Content</DialogTitle>
          <DialogDescription>
            Upload video or text content to get AI-powered insights
          </DialogDescription>
        </DialogHeader>

        {!uploadedAnalyticsId ? (
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Select value={platform} onValueChange={(value) => {
                setPlatform(value as Platform);
                // Auto-set content type based on platform
                if (value === 'twitter' || value === 'linkedin') {
                  setContentType('text');
                } else {
                  setContentType('video');
                }
                setValidationError(null);
              }}>
                <SelectTrigger id="platform">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {platform && (
              <>
                {showTextarea && (
                  <div className="space-y-2">
                    <Label htmlFor="content-text">Content Text</Label>
                    <Textarea
                      id="content-text"
                      placeholder={platform === 'twitter' 
                        ? "Combine all tweets in the thread into one text..."
                        : "Enter your post content..."}
                      value={contentText}
                      onChange={(e) => {
                        setContentText(e.target.value);
                        setValidationError(null);
                      }}
                      disabled={uploadContent.isPending}
                      rows={8}
                    />
                    {platform === 'twitter' && (
                      <p className="text-xs text-muted-foreground">
                        💡 Tip: Combine all tweets in the thread into one text for better analysis
                      </p>
                    )}
                  </div>
                )}

                {showFileInput && (
                  <div className="space-y-2">
                    <Label htmlFor="file">Video File</Label>
                    <Input
                      id="file"
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                      disabled={uploadContent.isPending}
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload a video file (MP4, MOV, etc.)
                    </p>
                  </div>
                )}

                {showUrlInput && (
                  <div className="space-y-2">
                    <Label htmlFor="video-url">Video URL (Optional if file uploaded)</Label>
                    <Input
                      id="video-url"
                      placeholder="https://youtube.com/watch?v=..."
                      value={videoUrl}
                      onChange={(e) => {
                        setVideoUrl(e.target.value);
                        setFile(null); // Clear file if URL is entered
                        setValidationError(null);
                      }}
                      disabled={uploadContent.isPending}
                    />
                  </div>
                )}
              </>
            )}

            {validationError && (
              <Alert variant="destructive">
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} disabled={uploadContent.isPending}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={uploadContent.isPending || !platform || (contentType === 'video' && !videoUrl && !file) || (contentType === 'text' && !contentText)}
              >
                {uploadContent.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Analyze Content
              </Button>
            </div>
          </div>
        ) : (
          <div className="pt-4">
            <Alert>
              <AlertDescription>
                Content uploaded successfully! Analysis is in progress. You can close this dialog and check the progress on the main page.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end mt-4">
              <Button onClick={handleClose}>Close</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
