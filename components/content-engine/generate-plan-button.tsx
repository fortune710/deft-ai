'use client';

import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GeneratePlanButtonProps {
  onClick: () => void;
}

export function GeneratePlanButton({ onClick }: GeneratePlanButtonProps) {
  return (
    <>
      {/* Desktop Button - Hidden on mobile */}
      <Button
        onClick={onClick}
        size="lg"
        className="hidden md:flex md:h-10 md:px-5 md:rounded-lg"
      >
        <Sparkles className="h-4 w-4 mr-2" />
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

