'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ElementType } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/use-clerk-auth';

const log = logger.child({ module: 'components/mobile-tab-bar' });

interface NavItem {
  title: string;
  href: string;
  icon: ElementType;
  visible?: boolean;
}

interface MobileTabBarProps {
  navItems: NavItem[];
  settingsItems: NavItem[];
}

export function MobileTabBar({ navItems, settingsItems }: MobileTabBarProps) {
  const { userId } = useAuth();
  const pathname = usePathname();

  log.debug('Rendering mobile navigation', {
    userId: userId || 'signed_out',
    action: 'render_mobile_navigation',
    pathname,
  });

  const handleMoreOpenChange = (open: boolean) => {
    log.info('Changing mobile navigation more menu', {
      userId: userId || 'signed_out',
      action: 'change_mobile_navigation_more_menu',
      open,
    });
  };

  return (
    <nav aria-label="Primary" className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.title}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-md transition-colors ${
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-xs font-medium text-center leading-tight">{item.title}</span>
            </Link>
          );
        })}
        <DropdownMenu onOpenChange={handleMoreOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-full flex-1 flex-col gap-1 rounded-md" aria-label="More navigation options">
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-xs font-medium">More</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="mb-2 min-w-48">
            {settingsItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href} aria-current={isActive ? 'page' : undefined} className="gap-2">
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
