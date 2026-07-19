'use client';

import { Plus } from 'lucide-react';
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
        className="hidden border border-primary/70 bg-gradient-to-b from-primary/80 to-primary font-semibold shadow-[0_2px_6px_hsl(var(--primary)/0.12)] transition-[background-image,box-shadow,transform] hover:from-primary/90 hover:to-primary/90 hover:shadow-[0_3px_8px_hsl(var(--primary)/0.16)] active:translate-y-px motion-reduce:transform-none md:flex md:h-11 md:rounded-xl md:px-6"
      >
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
