'use client';

import { ReactNode } from 'react';
import { AppSidebar, getFilteredNavItems } from './app-sidebar';
import { SidebarInset, SidebarProvider } from './ui/sidebar';
import { MobileTabBar } from './mobile-tab-bar';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const filteredNavItems = getFilteredNavItems();

  if (isMobile) {
    return (
      <>
        <main className="flex-1 overflow-y-auto pb-16">
          <div className="container mx-auto p-6">{children}</div>
        </main>
        <MobileTabBar navItems={filteredNavItems} />
      </>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div className="container mx-auto p-6">{children}</div>
      </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
