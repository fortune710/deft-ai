import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { UserContentProfile } from '@/types/niche-mapping';

async function fetchContentProfile(): Promise<UserContentProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_content_profile')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export function useContentProfile() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['content-profile'],
    queryFn: fetchContentProfile,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const refreshProfile = () => {
    queryClient.invalidateQueries({ queryKey: ['content-profile'] });
  };

  return {
    profile,
    isLoading,
    error: error ? String(error) : null,
    refreshProfile,
  };
}
