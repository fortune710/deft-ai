'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles,
  FileText,
  Settings,
  LogOut,
  Video,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { LucideIcon } from 'lucide-react';
import { SidebarContent, SidebarFooter, SidebarHeader, Sidebar, SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from '@/components/ui/sidebar';
import { SidebarMenu } from '@/components/ui/sidebar';
import { SidebarMenuItem } from '@/components/ui/sidebar';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { NavUser } from './nav-user';
import { useUser } from '@/hooks/use-user';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  visible?: boolean; // true = always visible, false = only in development, undefined = only in development
}

export const navItems: NavItem[] = [
  {
    title: 'Content Ideas',
    href: '/content-engine',
    icon: Sparkles,
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

const settingsItems = [
  {
    title: 'Profile Settings',
    href: '/settings/profile',
    icon: Settings,
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const filteredNavItems = getFilteredNavItems();
  const { data: user } = useUser();

  return (
    <>
      {/* Desktop Sidebar */}
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <a href="#">
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
                    <span className="">v0.1.1</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Tools</SidebarGroupLabel>
            <SidebarGroupContent>
            <SidebarMenu>
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive}  >
                    <Link href={item.href}>
                      <Icon className="mr-2 h-4 w-4" />
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
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive}  >
                        <Link href={item.href}>
                          <Icon className="mr-2 h-4 w-4" />
                          {item.title}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

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
      </Sidebar>
      
    </>
  );
}
