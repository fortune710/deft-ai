import { getCustomObjects } from '@/app/actions/customize';
import { CustomizeClient } from '@/components/customize/customize-client';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';

export async function generateMetadata() {
  return {
    title: 'Customize | Deft',
    description: 'Manage your custom brand guides and social links.',
  };
}

export default async function CustomizePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const result = await getCustomObjects();

  return (
    <AppLayout>
      <CustomizeClient initialObjects={result.success ? result.data : []} />
    </AppLayout>
  );
}
