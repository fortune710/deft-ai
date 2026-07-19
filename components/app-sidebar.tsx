'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Settings,
  LogOut,
  Video,
  Calendar as CalendarIcon,
  SlidersHorizontal,
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { useSessionActions } from '@/hooks/use-clerk-auth';
import type { ElementType } from 'react';
import { SidebarContent, SidebarFooter, SidebarHeader, Sidebar, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarRail } from '@/components/ui/sidebar';
import { SidebarMenu } from '@/components/ui/sidebar';
import { SidebarMenuItem } from '@/components/ui/sidebar';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { NavUser } from './nav-user';
import { useUser } from '@/hooks/use-user';
import { IdeasRepec } from '@/components/icons/ideas';

const log = logger.child({ module: 'components/app-sidebar' });

export interface NavItem {
  title: string;
  href: string;
  icon: ElementType;
  visible?: boolean; // true = always visible, false = only in development, undefined = only in development
}

export const navItems: NavItem[] = [
  {
    title: 'Content Ideas',
    href: '/content-engine',
    icon: IdeasRepec,
    visible: true, // Always visible
  },
  {
    title: 'Calendar',
    href: '/calendar',
    icon: CalendarIcon,
    visible: true, // Always visible in production
  },
  {
    title: 'Script Creator',
    href: '/script-creator',
    icon: FileText,
    visible: false, // Only visible in development
  },
  {
    title: 'Content Analytics',
    href: '/content-analytics',
    icon: Video,
    visible: true, // Only visible in development
  },
];

export const settingsItems: NavItem[] = [
  {
    title: 'Profile Settings',
    href: '/settings/profile',
    icon: Settings,
  },
  {
    title: 'Customize',
    href: '/customize',
    icon: SlidersHorizontal,
  },
];

export function getFilteredNavItems(): NavItem[] {
  return navItems.filter((item) => {
    // Content Engine is always visible
    if (item.visible === true) return true;
    // Other items are only visible in development
    if (item.visible === false) {
      return process.env.NODE_ENV === 'development';
    }
    // Default: show in development
    return process.env.NODE_ENV === 'development';
  });
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, user: clerkUser } = useSessionActions();

  log.debug('Rendering application sidebar', {
    userId: clerkUser?.id || 'signed_out',
    action: 'render_application_sidebar',
  });

  const handleSignOut = async () => {
    log.info('Signing out Clerk user', {
      userId: clerkUser?.id || 'signed_out',
      action: 'sign_out',
    });
    await signOut();
    router.push('/login');
  };

  const filteredNavItems = getFilteredNavItems();
  const { data: user } = useUser();

  return (
    <>
      {/* Desktop Sidebar */}
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/content-engine">
                  <div className="bg-white flex aspect-square size-8 items-center justify-center rounded-lg p-1.5">
                    <Image 
                      src="/deft-logo.png" 
                      alt="Deft Logo" 
                      width={20} 
                      height={20} 
                      className="object-contain"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-medium">Deft</span>
                    <span className="text-xs text-muted-foreground">v0.1.1</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <nav aria-label="Primary">
          <SidebarGroup>
            <SidebarGroupLabel>Tools</SidebarGroupLabel>
            <SidebarGroupContent>
            <SidebarMenu>
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.title}
                    className="relative transition-[color,background-color,transform] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] motion-reduce:transform-none data-[active=true]:bg-primary/10 data-[active=true]:text-primary before:absolute before:left-0 before:h-5 before:w-0.5 before:rounded-full before:bg-primary before:opacity-0 data-[active=true]:before:opacity-100"
                  >
                    <Link href={item.href} aria-current={isActive ? 'page' : undefined}>
                      <Icon className="h-4 w-4" />
                      {item.title}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsItems.map((item) => {
                  const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className="relative transition-[color,background-color,transform] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] motion-reduce:transform-none data-[active=true]:bg-primary/10 data-[active=true]:text-primary before:absolute before:left-0 before:h-5 before:w-0.5 before:rounded-full before:bg-primary before:opacity-0 data-[active=true]:before:opacity-100"
                      >
                        <Link href={item.href} aria-current={isActive ? 'page' : undefined}>
                          <Icon className="h-4 w-4" />
                          {item.title}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          </nav>
        </SidebarContent>

        <SidebarFooter>
          {user ? (
            <NavUser user={user} />
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4 shrink-0" />
              Sign Out
            </Button>
          )}
        </SidebarFooter>
        <SidebarRail tabIndex={0} aria-label="Toggle sidebar" />
      </Sidebar>
      
    </>
  );
}
