import { getCustomObjects } from '@/app/actions/customize';
import { CustomizeClient } from '@/components/customize/customize-client';
import { auth } from '@clerk/nextjs/server';
import { logger } from '@/lib/logger.server';
import { redirect } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';

const log = logger.child({ module: 'app/customize/page' });

export async function generateMetadata() {
  log.debug('Generating Customize page metadata', {
    userId: 'unknown',
    action: 'generate_customize_metadata',
  });
  return {
    title: 'Customize | Deft',
    description: 'Manage your custom brand guides and social links.',
  };
}

export default async function CustomizePage() {
  const { userId } = await auth();

  if (!userId) {
    log.warn('Redirecting unauthenticated Customize request', {
      userId: 'signed_out',
      action: 'render_customize_page',
      statusCode: 307,
    });
    redirect('/login');
  }

  const result = await getCustomObjects();
  log.info('Rendering Customize page with Convex objects', {
    userId,
    action: 'render_customize_page',
    statusCode: 200,
    objectCount: result.data.length,
  });

  return (
    <AppLayout>
      <CustomizeClient initialObjects={result.success ? result.data : []} />
    </AppLayout>
  );
}
