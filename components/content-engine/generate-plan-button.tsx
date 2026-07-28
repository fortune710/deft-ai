'use client';

import { CirclePlus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/use-clerk-auth';

const log = logger.child({ module: 'components/content-engine/generate-plan-button' });

interface GeneratePlanButtonProps {
  onClick: () => void;
}

export function GeneratePlanButton({ onClick }: GeneratePlanButtonProps) {
  const { userId } = useAuth();

  log.debug('Rendering generate ideas button', {
    userId: userId || 'signed_out',
    action: 'render_generate_ideas_button',
  });

  return (
    <>
      {/* Desktop Button - Hidden on mobile */}
      <Button
        onClick={onClick}
        size="lg"
        className="hidden h-11 rounded-xl border border-primary/70 bg-gradient-to-b from-primary/80 to-primary px-6 text-base font-medium leading-[1.42857rem] text-primary-foreground shadow-[inset_0_0.75px_0_rgba(255,255,255,0.24),0_0_0_1px_hsl(var(--primary)/0.9),0_2px_4px_rgba(0,0,0,0.16)] transition-[background-image,box-shadow,transform] hover:from-primary/90 hover:to-primary/90 hover:shadow-[inset_0_0.75px_0_rgba(255,255,255,0.24),0_0_0_1px_hsl(var(--primary)/0.9),0_3px_6px_rgba(0,0,0,0.2)] active:translate-y-px focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 motion-reduce:transform-none md:flex"
      >
        <CirclePlus className="mr-2 h-5 w-5" />
        Generate Ideas
      </Button>

      {/* Mobile Floating Action Button - Only visible on mobile */}
      <Button
        onClick={onClick}
        size="icon"
        className="md:hidden fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full shadow-lg"
      >
        <Plus className="h-5 w-5" />
      </Button>
    </>
  );
}
