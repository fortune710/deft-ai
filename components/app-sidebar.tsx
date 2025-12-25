'use client';

import Link from 'next/link';
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

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  visible?: boolean; // true = always visible, false = only in development, undefined = only in development
}

const navItems: NavItem[] = [
  {
    title: 'Content Engine',
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
    title: 'Video Analytics',
    href: '/video-analytics',
    icon: Video,
    visible: false, // Only visible in development
  },
];

const settingsItems = [
  {
    title: 'Profile Settings',
    href: '/settings/profile',
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center border-b px-6">
        <h2 className="text-lg font-semibold">Deft</h2>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {navItems
            .filter((item) => {
              // Content Engine is always visible
              if (item.visible === true) return true;
              // Other items are only visible in development
              if (item.visible === false) {
                return process.env.NODE_ENV === 'development';
              }
              // Default: show in development
              return process.env.NODE_ENV === 'development';
            })
            .map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Button
                  key={item.href}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  asChild
                >
                  <Link href={item.href}>
                    <Icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </Link>
                </Button>
              );
            })}
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
          {settingsItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Button
                key={item.href}
                variant={isActive ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                asChild
              >
                <Link href={item.href}>
                  <Icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Link>
              </Button>
            );
          })}
        </div>
      </ScrollArea>

      <div className="border-t p-3">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
