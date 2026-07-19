'use client';

import { useMutation as useAsyncMutation } from '@tanstack/react-query';
import {
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from 'convex/react';
import type { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import type { ContentItem, ItemStatus, ItemContent, Platform } from '@/types/content-engine';
import { useAuth } from '@/hooks/use-clerk-auth';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'hooks/use-content-items' });

type ContentItemInput = {
  title: string;
  description?: string;
  platform: Platform;
  scheduled_date: string;
  status: ItemStatus;
  content: ItemContent;
  position?: number;
};

function toContentItem(document: Record<string, unknown>): ContentItem {
  const { _id, _creationTime, ...item } = document;
  return { ...item, id: _id } as ContentItem;
}

export function useContentItem(itemId: string | null) {
  const { userId } = useAuth();
  const document = useConvexQuery(
    api.contentItems.get,
    userId && itemId ? { itemId: itemId as Id<'content_items'> } : 'skip',
  );
  log.debug('Resolved Convex content item query', {
    userId: userId || 'signed_out',
    action: 'fetch_content_item',
    itemId,
  });
  return { data: document ? toContentItem(document) : null, isLoading: userId !== null && document === undefined };
}

export function useContentItems() {
  const { userId } = useAuth();
  const documents = useConvexQuery(api.contentItems.list, userId ? {} : 'skip');
  log.debug('Resolved Convex content items query', {
    userId: userId || 'signed_out',
    action: 'fetch_content_items',
  });
  return {
    data: documents?.map((document) => toContentItem(document)) ?? [],
    isLoading: Boolean(userId) && documents === undefined,
  };
}

export function useContentItemsByStatus(status: ItemStatus) {
  const { userId } = useAuth();
  const documents = useConvexQuery(
    api.contentItems.listByStatus,
    userId ? { status } : 'skip',
  );
  log.debug('Resolved Convex content items status query', {
    userId: userId || 'signed_out',
    action: 'fetch_content_items_by_status',
    status,
  });
  return {
    data: documents?.map((document) => toContentItem(document)) ?? [],
    isLoading: Boolean(userId) && documents === undefined,
  };
}

export function useContentItemsByDateRange(startDate: string, endDate: string) {
  const { userId } = useAuth();
  const documents = useConvexQuery(
    api.contentItems.listByDateRange,
    userId ? { startDate, endDate } : 'skip',
  );
  log.debug('Resolved Convex content items date range query', {
    userId: userId || 'signed_out',
    action: 'fetch_content_items_by_date_range',
    startDate,
    endDate,
  });
  return {
    data: documents?.map((document) => toContentItem(document)) ?? [],
    isLoading: Boolean(userId) && documents === undefined,
  };
}

export function useCreateContentItem() {
  const { userId } = useAuth();
  const create = useConvexMutation(api.contentItems.create);
  log.debug('Prepared Convex content item creation', {
    userId: userId || 'signed_out',
    action: 'prepare_create_content_item',
  });
  return useAsyncMutation({
    mutationFn: async (item: ContentItemInput) => {
      const result = await create(item);
      if (!result) throw new Error('Convex did not return the created content item');
      return toContentItem(result);
    },
  });
}

export function useBatchCreateContentItems() {
  const { userId } = useAuth();
  const createMany = useConvexMutation(api.contentItems.createMany);
  log.debug('Prepared Convex content plan creation', {
    userId: userId || 'signed_out',
    action: 'prepare_create_content_plan_items',
  });
  return useAsyncMutation({
    mutationFn: async (items: ContentItemInput[]) =>
      (await createMany({ items })).map((document) => toContentItem(document)),
  });
}

export function useUpdateContentItem() {
  const { userId } = useAuth();
  const update = useConvexMutation(api.contentItems.update).withOptimisticUpdate(
    (localStore, { itemId, updates }) => {
      log.debug('Applying optimistic content item update', {
        userId: userId || 'signed_out',
        action: 'optimistically_update_content_item',
        itemId,
        updatedFields: Object.keys(updates),
      });
      const items = localStore.getQuery(api.contentItems.list, {});
      if (!items) return;
      localStore.setQuery(
        api.contentItems.list,
        {},
        items.map((item) => (item._id === itemId ? { ...item, ...updates } : item)),
      );
    },
  );
  log.debug('Prepared Convex content item update', {
    userId: userId || 'signed_out',
    action: 'prepare_update_content_item',
  });
  return useAsyncMutation({
    mutationFn: async ({ itemId, updates }: {
      itemId: string;
      updates: Partial<Omit<ContentItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
    }) => {
      const result = await update({ itemId: itemId as Id<'content_items'>, updates });
      if (!result) throw new Error('Content item not found');
      return toContentItem(result);
    },
  });
}

export function useUpdateItemStatus() {
  const { userId } = useAuth();
  const update = useConvexMutation(api.contentItems.update);
  log.debug('Prepared Convex content status update', {
    userId: userId || 'signed_out',
    action: 'prepare_update_content_item_status',
  });
  return useAsyncMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: ItemStatus }) => {
      const result = await update({ itemId: itemId as Id<'content_items'>, updates: { status } });
      if (!result) throw new Error('Content item not found');
      return toContentItem(result);
    },
  });
}

export function useUpdateItemPosition() {
  const { userId } = useAuth();
  const update = useConvexMutation(api.contentItems.update).withOptimisticUpdate(
    (localStore, { itemId, updates }) => {
      const items = localStore.getQuery(api.contentItems.list, {});
      if (!items) return;
      localStore.setQuery(
        api.contentItems.list,
        {},
        items.map((item) => (item._id === itemId ? { ...item, ...updates } : item)),
      );
    },
  );
  log.debug('Prepared optimistic Convex position update', {
    userId: userId || 'signed_out',
    action: 'prepare_update_content_item_position',
  });
  return useAsyncMutation({
    mutationFn: async ({ itemId, position, status }: {
      itemId: string;
      position: number;
      status?: ItemStatus;
    }) => {
      const result = await update({
        itemId: itemId as Id<'content_items'>,
        updates: { position, ...(status ? { status } : {}) },
      });
      if (!result) throw new Error('Content item not found');
      return toContentItem(result);
    },
  });
}

export function useUpdateItemContent() {
  const { userId } = useAuth();
  const updateContent = useConvexMutation(api.contentItems.updateContent);
  log.debug('Prepared Convex content body update', {
    userId: userId || 'signed_out',
    action: 'prepare_update_content_item_content',
  });
  return useAsyncMutation({
    mutationFn: async ({ itemId, content }: { itemId: string; content: Partial<ItemContent> }) => {
      const result = await updateContent({ itemId: itemId as Id<'content_items'>, content });
      if (!result) throw new Error('Content item not found');
      return toContentItem(result);
    },
  });
}

export function useDeleteContentItem() {
  const { userId } = useAuth();
  const remove = useConvexMutation(api.contentItems.remove);
  log.debug('Prepared Convex content item deletion', {
    userId: userId || 'signed_out',
    action: 'prepare_delete_content_item',
  });
  return useAsyncMutation({
    mutationFn: ({ itemId }: { itemId: string }) =>
      remove({ itemId: itemId as Id<'content_items'> }),
  });
}

export function useDuplicateContentItem() {
  const { userId } = useAuth();
  const duplicate = useConvexMutation(api.contentItems.duplicate);
  log.debug('Prepared Convex content item duplication', {
    userId: userId || 'signed_out',
    action: 'prepare_duplicate_content_item',
  });
  return useAsyncMutation({
    mutationFn: async (itemId: string) => {
      const result = await duplicate({ itemId: itemId as Id<'content_items'> });
      if (!result) throw new Error('Content item not found');
      return toContentItem(result);
    },
  });
}
