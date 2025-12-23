import { useQuery } from '@tanstack/react-query';
import type { ProcessingJobStatus } from '@/types/video-analytics';

export function useProcessingStatus(jobId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ['processing-status', jobId],
    queryFn: async (): Promise<ProcessingJobStatus> => {
      if (!jobId) {
        throw new Error('Job ID is required');
      }

      const response = await fetch(`/api/videos/job-status/${jobId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch job status');
      }

      return response.json();
    },
    enabled: enabled && !!jobId,
    refetchInterval: (data) => {
      if (!data) return 2000;

      const status = data.status;
      if (status === 'completed' || status === 'failed') {
        return false;
      }

      return 2000;
    },
    staleTime: 0,
  });
}
