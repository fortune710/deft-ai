'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { MoreVertical, Trash2, Copy, Edit2, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar as DateCalendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useUpdateContentItem } from '@/hooks/use-content-items';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ContentItem, Platform } from '@/types/content-engine';

interface ContentItemCardProps {
  item: ContentItem;
  onEdit: (item: ContentItem) => void;
  onDelete: (itemId: string) => void;
  onDuplicate: (itemId: string) => void;
  isDragging?: boolean;
}

const platformColors: Record<Platform, string> = {
  youtube: 'bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/20 dark:text-red-400',
  instagram: 'bg-pink-500/10 text-pink-600 border-pink-500/20 dark:bg-pink-500/20 dark:text-pink-400',
  tiktok: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:bg-cyan-500/20 dark:text-cyan-400',
  twitter: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400',
  linkedin: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-400',
  facebook: 'bg-blue-600/10 text-blue-700 border-blue-600/20 dark:bg-blue-600/20 dark:text-blue-300',
};

const platformLabels: Record<Platform, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  twitter: 'Twitter',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
};

export function ContentItemCard({
  item,
  onEdit,
  onDelete,
  onDuplicate,
  isDragging = false,
}: ContentItemCardProps) {
  const router = useRouter();
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(item.title);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const updateItem = useUpdateContentItem();

  // Sync title when item changes
  useEffect(() => {
    setNewTitle(item.title);
  }, [item.title]);

  const scheduledDate = new Date(item.scheduled_date);
  const formattedDate = format(scheduledDate, 'MMM d');
  const daysUntil = Math.ceil((scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const handleCardClick = () => {
    // Don't navigate if a dialog/popover is open
    if (renameDialogOpen || deleteDialogOpen || scheduleOpen) return;
    router.push(`/script-creator/edit-content/${item.id}`);
  };

  const handleRenameSelect = (e: Event) => {
    // Radix DropdownMenu uses `onSelect` (Event), not React.MouseEvent.
    e.preventDefault();
    setNewTitle(item.title);
    setRenameDialogOpen(true);
  };

  const handleRename = async () => {
    if (!newTitle.trim()) {
      toast.error('Title cannot be empty');
      return;
    }

    if (newTitle.trim() === item.title) {
      setRenameDialogOpen(false);
      return;
    }

    try {
      await updateItem.mutateAsync({
        itemId: item.id,
        updates: { title: newTitle.trim() },
      });
      toast.success('Content item renamed');
      setRenameDialogOpen(false);
    } catch (error) {
      console.error('Error renaming item:', error);
      toast.error('Failed to rename content item');
    }
  };

  return (
    <>
      {/* Card surface — only navigates on direct click */}
      <div
        onClick={handleCardClick}
        className={`group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${isDragging ? 'opacity-50' : ''
          }`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge
            variant="outline"
            className={cn(
              "px-2 py-0 h-5 text-[10px] font-bold uppercase tracking-wider rounded-md border text-center flex items-center justify-center",
              platformColors[item.platform.toLowerCase()] || 'bg-gray-100 text-gray-700'
            )}
          >
            {platformLabels[item.platform] || item.platform}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 z-10"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              // Stop all events inside the menu from reaching the card
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem onSelect={handleRenameSelect}>
                <Edit2 className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onDuplicate(item.id)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onSelect={(e) => {
                  e.preventDefault();
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h4 className="font-medium text-sm mb-2 line-clamp-2">{item.title}</h4>

        {item.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
            {item.description}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Popover open={scheduleOpen} onOpenChange={setScheduleOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
              >
                <CalendarIcon className="h-3.5 w-3.5 mr-1 text-gray-400" />
                <span>{formattedDate}</span>
                {daysUntil >= 0 && (
                  <span className="ml-1 text-[10px] text-gray-400">
                    {daysUntil === 0 ? 'Today' : `${daysUntil}d`}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0"
              align="start"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <DateCalendar
                mode="single"
                selected={scheduledDate}
                onSelect={(date) => {
                  if (!date) return;
                  updateItem.mutate(
                    { itemId: item.id, updates: { scheduled_date: format(date, 'yyyy-MM-dd') } },
                    {
                      onSuccess: () => toast.success('Schedule updated'),
                      onError: () => toast.error('Failed to update schedule'),
                    }
                  );
                  setScheduleOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ── Dialogs rendered OUTSIDE the card div ──
          This prevents dismiss/close events from bubbling into the card's onClick
          and triggering navigation. It also ensures Radix can cleanly remove its
          body pointer-events:none style without the component unmounting mid-cleanup. */}

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Content Item</DialogTitle>
            <DialogDescription>
              Enter a new title for this content item.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Textarea
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleRename();
                  }
                }}
                placeholder="Enter content item title"
                autoFocus
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Tip: Press <span className="font-medium">Ctrl/⌘ + Enter</span> to save.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRename}
              disabled={updateItem.isPending || !newTitle.trim()}
            >
              {updateItem.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your content idea.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                onDelete(item.id);
                setDeleteDialogOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
