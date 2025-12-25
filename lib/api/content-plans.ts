import { supabase } from '@/lib/supabase/client';
import type { ContentPlan, Platform } from '@/types/content-engine';

export async function fetchActivePlan(): Promise<ContentPlan | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('content_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchArchivedPlans(): Promise<ContentPlan[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('content_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', false)
    .order('archived_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchPlanById(planId: string): Promise<ContentPlan | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('content_plans')
    .select('*')
    .eq('id', planId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createContentPlan(plan: {
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  platforms: Platform[];
}): Promise<ContentPlan> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const activePlan = await fetchActivePlan();
  if (activePlan) {
    await archivePlan(activePlan.id);
  }

  const { data, error } = await supabase
    .from('content_plans')
    .insert({
      user_id: user.id,
      title: plan.title,
      description: plan.description || null,
      start_date: plan.start_date,
      end_date: plan.end_date,
      platforms: plan.platforms,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateContentPlan(
  planId: string,
  updates: Partial<Pick<ContentPlan, 'title' | 'description' | 'start_date' | 'end_date' | 'platforms'>>
): Promise<ContentPlan> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('content_plans')
    .update(updates)
    .eq('id', planId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function archivePlan(planId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('content_plans')
    .update({
      is_active: false,
      archived_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function archiveActivePlan(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('content_plans')
    .update({ is_active: false, archived_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (error) throw error;
}

export async function restorePlan(planId: string): Promise<ContentPlan> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const activePlan = await fetchActivePlan();
  if (activePlan) {
    await archivePlan(activePlan.id);
  }

  const { data, error } = await supabase
    .from('content_plans')
    .update({
      is_active: true,
      archived_at: null,
    })
    .eq('id', planId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePlan(planId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('content_plans')
    .delete()
    .eq('id', planId)
    .eq('user_id', user.id);

  if (error) throw error;
}
