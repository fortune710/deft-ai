'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, LayoutDashboard } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export function AuthNavButtons() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // useEffect(() => {
  //   const checkAuth = async () => {
  //     const { data: { user } } = await supabase.auth.getUser();
  //     setIsAuthenticated(!!user);
  //     setIsLoading(false);
  //   };

  //   checkAuth();

  //   // Listen for auth changes
  //   const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
  //     setIsAuthenticated(!!session?.user);
  //   });

  //   return () => {
  //     subscription.unsubscribe();
  //   };
  // }, []);

  // if (isLoading) {
  //   return null; // Skeleton will be shown by parent
  // }

  // if (isAuthenticated) {
  //   return (
  //     <Button asChild>
  //       <Link href="/content-engine">
  //         <LayoutDashboard className="mr-2 h-4 w-4" />
  //         Dashboard
  //       </Link>
  //     </Button>
  //   );
  // }

  return (
    <div className='font-alan-sans bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 grid grid-cols-2 gap-2 border rounded-xl p-2'>
      <Link className='px-5 py-1.5 text-center' href="/login">Login</Link>
      <Link className='text-black px-5 py-1.5 bg-primary/90 rounded-lg flex items-center justify-center gap-1.5 font-medium' href="/sign-up">
        Sign Up
        <ArrowRight className='w-5 h-5' />
      </Link>
    </div>
  );
}

