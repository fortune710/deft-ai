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
import { storageKeys } from '@/utils/storage-keys';

export function useContentItem(itemId: string | null) {
  return useQuery({
    queryKey: storageKeys.reactQuery.contentItem(itemId!),
    queryFn: () => (itemId ? fetchContentItem(itemId) : null),
    enabled: !!itemId,
  });
}

export function useContentItems() {
  return useQuery({
    queryKey: storageKeys.reactQuery.contentItems,
    queryFn: () => fetchContentItems(),
  });
}

export function useContentItemsByStatus(status: ItemStatus) {
  return useQuery({
    queryKey: storageKeys.reactQuery.contentItemsStatus(status),
    queryFn: () => fetchContentItemsByStatus(status),
  });
}

export function useContentItemsByDateRange(
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: storageKeys.reactQuery.contentItemsDateRange(startDate, endDate),
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
      queryClient.invalidateQueries({ queryKey: storageKeys.reactQuery.contentItems });
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
      queryClient.invalidateQueries({ queryKey: storageKeys.reactQuery.contentItems });
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
      queryClient.invalidateQueries({ queryKey: storageKeys.reactQuery.contentItems });
    },
  });
}

export function useUpdateItemStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: ItemStatus }) =>
      updateItemStatus(itemId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storageKeys.reactQuery.contentItems });
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
      await queryClient.cancelQueries({ queryKey: storageKeys.reactQuery.contentItems });
      const previousItems = queryClient.getQueriesData({ queryKey: storageKeys.reactQuery.contentItems });

      queryClient.setQueriesData<ContentItem[]>({ queryKey: storageKeys.reactQuery.contentItems }, (old) => {
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
      queryClient.invalidateQueries({ queryKey: storageKeys.reactQuery.contentItems });
    },
  });
}

export function useUpdateItemContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, content }: { itemId: string; content: Partial<ItemContent> }) =>
      updateItemContent(itemId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storageKeys.reactQuery.contentItems });
    },
  });
}

export function useDeleteContentItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId }: { itemId: string }) =>
      deleteContentItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storageKeys.reactQuery.contentItems });
    },
  });
}

export function useDuplicateContentItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => duplicateContentItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storageKeys.reactQuery.contentItems });
    },
  });
}
