'use client';

import { SimpleProgress } from './simple-progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useProcessingStatus } from '@/hooks/use-processing-status';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface VideoProcessingIndicatorProps {
  jobId: string;
  onComplete?: () => void;
  requiresManualMetrics?: boolean;
}

const STEP_LABELS: Record<string, string> = {
  queued: 'Queued for processing',
  download: 'Downloading video',
  extract_audio: 'Extracting audio',
  transcribe: 'Transcribing content',
  analyze: 'Generating AI feedback',
  completed: 'Analysis complete',
};

export function VideoProcessingIndicator({
  jobId,
  onComplete,
  requiresManualMetrics = false,
}: VideoProcessingIndicatorProps) {
  const { data: status, isLoading } = useProcessingStatus(jobId, true);

  if (isLoading || !status) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading status...</span>
        </div>
      </div>
    );
  }

  const isCompleted = status.status === 'completed';
  const isFailed = status.status === 'failed';

  if (isCompleted && onComplete) {
    setTimeout(onComplete, 2000);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{STEP_LABELS[status.current_step] || 'Processing...'}</span>
          <span className="text-muted-foreground">{status.progress_percentage}%</span>
        </div>
        <SimpleProgress value={status.progress_percentage} />
      </div>

      {requiresManualMetrics && status.current_step === 'queued' && (
        <Alert>
          <AlertDescription>
            Automatic metrics collection is not available for this platform. You can add metrics manually after
            processing is complete.
          </AlertDescription>
        </Alert>
      )}

      {isCompleted && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Video analysis complete! View your insights in the dashboard.
          </AlertDescription>
        </Alert>
      )}

      {isFailed && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {status.error_message || 'Processing failed. Please try again.'}
          </AlertDescription>
        </Alert>
      )}

      {(isCompleted || isFailed) && (
        <div className="flex justify-end">
          <Button onClick={onComplete}>Close</Button>
        </div>
      )}
    </div>
  );
}
