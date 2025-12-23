import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchContentItems,
  fetchContentItemsByStatus,
  fetchContentItemsByDateRange,
  createContentItem,
  batchCreateContentItems,
  updateContentItem,
  updateItemStatus,
  updateItemPosition,
  updateItemContent,
  deleteContentItem,
  duplicateContentItem,
} from '@/lib/api/content-items';
import type { ContentItem, ItemStatus, ItemContent, Platform } from '@/types/content-engine';

export function useContentItems(planId: string | null) {
  return useQuery({
    queryKey: ['content-items', planId],
    queryFn: () => (planId ? fetchContentItems(planId) : []),
    enabled: !!planId,
  });
}

export function useContentItemsByStatus(planId: string | null, status: ItemStatus) {
  return useQuery({
    queryKey: ['content-items', planId, 'status', status],
    queryFn: () => (planId ? fetchContentItemsByStatus(planId, status) : []),
    enabled: !!planId,
  });
}

export function useContentItemsByDateRange(
  planId: string | null,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: ['content-items', planId, 'date-range', startDate, endDate],
    queryFn: () => (planId ? fetchContentItemsByDateRange(planId, startDate, endDate) : []),
    enabled: !!planId,
  });
}

export function useCreateContentItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: {
      plan_id: string;
      title: string;
      description?: string;
      platform: Platform;
      scheduled_date: string;
      status: ItemStatus;
      content: ItemContent;
      position?: number;
    }) => createContentItem(item),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['content-items', variables.plan_id] });
    },
  });
}

export function useBatchCreateContentItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      items: Array<{
        plan_id: string;
        title: string;
        description?: string;
        platform: Platform;
        scheduled_date: string;
        status: ItemStatus;
        content: ItemContent;
        position?: number;
      }>
    ) => batchCreateContentItems(items),
    onSuccess: (_, variables) => {
      if (variables.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['content-items', variables[0].plan_id] });
      }
    },
  });
}

export function useUpdateContentItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      updates,
    }: {
      itemId: string;
      updates: Partial<Omit<ContentItem, 'id' | 'plan_id' | 'user_id' | 'created_at' | 'updated_at'>>;
    }) => updateContentItem(itemId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content-items', data.plan_id] });
    },
  });
}

export function useUpdateItemStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: ItemStatus }) =>
      updateItemStatus(itemId, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content-items', data.plan_id] });
    },
  });
}

export function useUpdateItemPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      position,
      status,
    }: {
      itemId: string;
      position: number;
      status?: ItemStatus;
    }) => updateItemPosition(itemId, position, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content-items', data.plan_id] });
    },
  });
}

export function useUpdateItemContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, content }: { itemId: string; content: Partial<ItemContent> }) =>
      updateItemContent(itemId, content),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content-items', data.plan_id] });
    },
  });
}

export function useDeleteContentItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, planId }: { itemId: string; planId: string }) =>
      deleteContentItem(itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['content-items', variables.planId] });
    },
  });
}

export function useDuplicateContentItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => duplicateContentItem(itemId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content-items', data.plan_id] });
    },
  });
}
