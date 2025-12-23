import { useMutation } from '@tanstack/react-query';
import { generate30DayContentPlan, Generate30DayPlanConfig } from '@/lib/ai/content-generator';

export function useGenerateContentPlan() {
  return useMutation({
    mutationFn: (config: Generate30DayPlanConfig) => generate30DayContentPlan(config),
  });
}
