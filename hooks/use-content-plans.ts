import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchActivePlan,
  fetchArchivedPlans,
  fetchPlanById,
  createContentPlan,
  updateContentPlan,
  archivePlan,
  restorePlan,
  deletePlan,
} from '@/lib/api/content-plans';
import type { ContentPlan, Platform } from '@/types/content-engine';

export function useActivePlan() {
  return useQuery({
    queryKey: ['content-plans', 'active'],
    queryFn: fetchActivePlan,
  });
}

export function useArchivedPlans() {
  return useQuery({
    queryKey: ['content-plans', 'archived'],
    queryFn: fetchArchivedPlans,
  });
}

export function usePlanById(planId: string | null) {
  return useQuery({
    queryKey: ['content-plans', planId],
    queryFn: () => (planId ? fetchPlanById(planId) : null),
    enabled: !!planId,
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (plan: {
      title: string;
      description?: string;
      start_date: string;
      end_date: string;
      platforms: Platform[];
    }) => createContentPlan(plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-plans'] });
    },
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      updates,
    }: {
      planId: string;
      updates: Partial<Pick<ContentPlan, 'title' | 'description' | 'start_date' | 'end_date' | 'platforms'>>;
    }) => updateContentPlan(planId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['content-plans', variables.planId] });
      queryClient.invalidateQueries({ queryKey: ['content-plans', 'active'] });
    },
  });
}

export function useArchivePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => archivePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-plans'] });
    },
  });
}

export function useRestorePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => restorePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-plans'] });
    },
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => deletePlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-plans'] });
    },
  });
}

export function useContentPlans() {
  const { data: activePlan } = useActivePlan();
  const { data: archivedPlans } = useArchivedPlans();

  const plans = [];
  if (activePlan) plans.push(activePlan);
  if (archivedPlans) plans.push(...archivedPlans);

  return { plans };
}
