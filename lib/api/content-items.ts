import { supabase } from '@/lib/supabase/client';
import type { ContentItem, ItemStatus, ItemContent, Platform } from '@/types/content-engine';

export async function fetchContentItem(itemId: string): Promise<ContentItem> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', itemId)
    .eq('user_id', user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchContentItems(): Promise<ContentItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('content_items')
    .select('*')
    .eq('user_id', user.id)
    .order('scheduled_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchContentItemsByStatus(
  status: ItemStatus
): Promise<ContentItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('content_items')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', status)
    .order('position', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchContentItemsByDateRange(
  startDate: string,
  endDate: string
): Promise<ContentItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('content_items')
    .select('*')
    .eq('user_id', user.id)
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)
    .order('scheduled_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createContentItem(item: {
  title: string;
  description?: string;
  platform: Platform;
  scheduled_date: string;
  status: ItemStatus;
  content: ItemContent;
  position?: number;
}): Promise<ContentItem> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('content_items')
    .insert({
      user_id: user.id,
      title: item.title,
      description: item.description || null,
      platform: item.platform,
      scheduled_date: item.scheduled_date,
      status: item.status,
      content: item.content,
      position: item.position || 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function batchCreateContentItems(
  items: Array<{
    title: string;
    description?: string;
    platform: Platform;
    scheduled_date: string;
    status: ItemStatus;
    content: ItemContent;
    position?: number;
  }>
): Promise<ContentItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const itemsWithUserId = items.map((item) => ({
    user_id: user.id,
    title: item.title,
    description: item.description || null,
    platform: item.platform,
    scheduled_date: item.scheduled_date,
    status: item.status,
    content: item.content,
    position: item.position || 0,
  }));

  const { data, error } = await supabase
    .from('content_items')
    .insert(itemsWithUserId)
    .select();

  if (error) throw error;
  return data || [];
}

export async function updateContentItem(
  itemId: string,
  updates: Partial<Omit<ContentItem, 'id' | 'plan_id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<ContentItem> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('content_items')
    .update(updates)
    .eq('id', itemId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateItemStatus(itemId: string, status: ItemStatus): Promise<ContentItem> {
  return updateContentItem(itemId, { status });
}

export async function updateItemPosition(
  itemId: string,
  position: number,
  status?: ItemStatus
): Promise<ContentItem> {
  const updates: Partial<ContentItem> = { position };
  if (status) {
    updates.status = status;
  }
  return updateContentItem(itemId, updates);
}

export async function updateItemContent(
  itemId: string,
  content: Partial<ItemContent>
): Promise<ContentItem> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: currentItem, error: fetchError } = await supabase
    .from('content_items')
    .select('content')
    .eq('id', itemId)
    .eq('user_id', user.id)
    .single();

  if (fetchError) throw fetchError;

  const mergedContent = {
    ...currentItem.content,
    ...content,
  };

  const { data, error } = await supabase
    .from('content_items')
    .update({ content: mergedContent })
    .eq('id', itemId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteContentItem(itemId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('content_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function duplicateContentItem(itemId: string): Promise<ContentItem> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: originalItem, error: fetchError } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', itemId)
    .eq('user_id', user.id)
    .single();

  if (fetchError) throw fetchError;

  const { data, error } = await supabase
    .from('content_items')
    .insert({
      user_id: user.id,
      title: `${originalItem.title} (Copy)`,
      description: originalItem.description,
      platform: originalItem.platform,
      scheduled_date: originalItem.scheduled_date,
      status: originalItem.status,
      content: originalItem.content,
      position: originalItem.position + 1,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
