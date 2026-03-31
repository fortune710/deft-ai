import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchContentItem,
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

export function useContentItem(itemId: string | null) {
  return useQuery({
    queryKey: ['content-item', itemId],
    queryFn: () => (itemId ? fetchContentItem(itemId) : null),
    enabled: !!itemId,
  });
}

export function useContentItems() {
  return useQuery({
    queryKey: ['content-items'],
    queryFn: () => fetchContentItems(),
  });
}

export function useContentItemsByStatus(status: ItemStatus) {
  return useQuery({
    queryKey: ['content-items', 'status', status],
    queryFn: () => fetchContentItemsByStatus(status),
  });
}

export function useContentItemsByDateRange(
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: ['content-items', 'date-range', startDate, endDate],
    queryFn: () => fetchContentItemsByDateRange(startDate, endDate),
  });
}

export function useCreateContentItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (item: {
      title: string;
      description?: string;
      platform: Platform;
      scheduled_date: string;
      status: ItemStatus;
      content: ItemContent;
      position?: number;
    }) => createContentItem(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-items'] });
    },
  });
}

export function useBatchCreateContentItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      items: Array<{
        title: string;
        description?: string;
        platform: Platform;
        scheduled_date: string;
        status: ItemStatus;
        content: ItemContent;
        position?: number;
      }>
    ) => batchCreateContentItems(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-items'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-items'] });
    },
  });
}

export function useUpdateItemStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: ItemStatus }) =>
      updateItemStatus(itemId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-items'] });
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
    onMutate: async ({ itemId, position, status }) => {
      await queryClient.cancelQueries({ queryKey: ['content-items'] });
      const previousItems = queryClient.getQueriesData({ queryKey: ['content-items'] });

      queryClient.setQueriesData<ContentItem[]>({ queryKey: ['content-items'] }, (old) => {
        if (!old) return old;
        return old.map((item) => {
          if (item.id === itemId) {
            const updated = { ...item, position };
            if (status) {
              updated.status = status;
            }
            return updated;
          }
          return item;
        });
      });

      return { previousItems };
    },
    onError: (err, variables, context) => {
      if (context?.previousItems) {
        context.previousItems.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-items'] });
    },
  });
}

export function useUpdateItemContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, content }: { itemId: string; content: Partial<ItemContent> }) =>
      updateItemContent(itemId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-items'] });
    },
  });
}

export function useDeleteContentItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId }: { itemId: string }) =>
      deleteContentItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-items'] });
    },
  });
}

export function useDuplicateContentItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => duplicateContentItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-items'] });
    },
  });
}
