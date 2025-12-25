'use client';

import { format } from 'date-fns';
import { Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ContentPlan } from '@/types/content-engine';

interface PlanSelectorProps {
  activePlan: ContentPlan | null;
  onViewArchived: () => void;
}

export function PlanSelector({ activePlan, onViewArchived }: PlanSelectorProps) {
  if (!activePlan) return null;

  return (
    <div className="flex items-center gap-2">
      <div>
        <h2 className="font-semibold text-lg">{activePlan.title}</h2>
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {format(new Date(activePlan.start_date), 'MMM d')} -{' '}
            {format(new Date(activePlan.end_date), 'MMM d, yyyy')}
          </p>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            Active
          </Badge>
        </div>
      </div>

      {/* <Button
        variant="outline"
        size="sm"
        onClick={onViewArchived}
        className="ml-auto"
      >
        <Archive className="h-4 w-4 mr-1" />
        View Archived
      </Button> */}
    </div>
  );
}
