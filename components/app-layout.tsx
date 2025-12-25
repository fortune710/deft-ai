'use client';

import { ReactNode } from 'react';
import { AppSidebar } from './app-sidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen max-sm:flex-col-reverse">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
