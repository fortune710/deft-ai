import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function checkOnboardingStatus(): Promise<{
  isCompleted: boolean;
  isAuthenticated: boolean;
}> {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { isCompleted: false, isAuthenticated: false };
    }

    const { data: profile } = await supabase
      .from('user_content_profile')
      .select('completed_at')
      .eq('user_id', user.id)
      .maybeSingle();

    const isCompleted = !!(profile && profile.completed_at !== null);

    return { isCompleted, isAuthenticated: true };
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return { isCompleted: false, isAuthenticated: false };
  }
}
