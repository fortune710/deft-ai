'use client';

import { ReactNode } from 'react';
import { AppSidebar, getFilteredNavItems, settingsItems } from './app-sidebar';
import { SidebarInset, SidebarProvider } from './ui/sidebar';
import { MobileTabBar } from './mobile-tab-bar';
import { useIsMobile } from '@/hooks/use-mobile';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/use-clerk-auth';

const log = logger.child({ module: 'components/app-layout' });

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { userId } = useAuth();
  const isMobile = useIsMobile();
  const filteredNavItems = getFilteredNavItems();

  log.debug('Rendering responsive application layout', {
    userId: userId || 'signed_out',
    action: 'render_application_layout',
    isMobile,
  });

  if (isMobile) {
    return (
      <>
        <main className="flex-1 overflow-y-auto pb-16">
          <div className="container mx-auto p-6">{children}</div>
        </main>
        <MobileTabBar navItems={filteredNavItems} settingsItems={settingsItems} />
      </>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>

      <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div className="container mx-auto p-6">{children}</div>
      </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
