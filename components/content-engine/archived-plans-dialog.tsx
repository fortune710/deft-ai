'use client';

import { format } from 'date-fns';
import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useArchivedPlans, useRestorePlan, useDeletePlan } from '@/hooks/use-content-plans';
import { toast } from 'sonner';

interface ArchivedPlansDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArchivedPlansDialog({ open, onOpenChange }: ArchivedPlansDialogProps) {
  const { data: archivedPlans, isLoading } = useArchivedPlans();
  const restorePlan = useRestorePlan();
  const deletePlan = useDeletePlan();

  const handleRestore = (planId: string) => {
    if (!confirm('This will archive your current active plan. Continue?')) return;

    restorePlan.mutate(planId, {
      onSuccess: () => {
        toast.success('Plan restored');
        onOpenChange(false);
      },
      onError: () => {
        toast.error('Failed to restore plan');
      },
    });
  };

  const handleDelete = (planId: string) => {
    if (!confirm('This will permanently delete this plan and all its content. Continue?')) return;

    deletePlan.mutate(planId, {
      onSuccess: () => {
        toast.success('Plan deleted');
      },
      onError: () => {
        toast.error('Failed to delete plan');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archived Plans
          </DialogTitle>
          <DialogDescription>
            View and restore your archived content plans
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : !archivedPlans || archivedPlans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Archive className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No archived plans</p>
            </div>
          ) : (
            archivedPlans.map((plan) => (
              <div
                key={plan.id}
                className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{plan.title}</h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p>
                        {format(new Date(plan.start_date), 'MMM d')} -{' '}
                        {format(new Date(plan.end_date), 'MMM d, yyyy')}
                      </p>
                      {plan.archived_at && (
                        <p className="text-xs">
                          Archived {format(new Date(plan.archived_at), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(plan.id)}
                      disabled={restorePlan.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Restore
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(plan.id)}
                      disabled={deletePlan.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
