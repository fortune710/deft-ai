'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export interface User {
  name: string;
  email: string;
  avatar: string;
}

async function fetchUser(): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // Extract name from user_metadata or raw_user_meta_data, fallback to email
  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'User';

  // Extract avatar from user_metadata or raw_user_meta_data, fallback to empty string
  const avatar =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.avatar ||
    '';

  return {
    name,
    email: user.email || '',
    avatar,
  };
}

export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}
