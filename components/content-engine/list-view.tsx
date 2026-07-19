'use client';

import { createElement, useState, useMemo } from 'react';
import type { ElementType } from 'react';
import { format } from 'date-fns';
import { Eye, Copy, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ContentItemDialog } from './content-item-dialog';
import { useDeleteContentItem, useDuplicateContentItem, useUpdateContentItem, useUpdateItemStatus } from '@/hooks/use-content-items';
import { toast } from 'sonner';
import type { ContentItem, ItemStatus, Platform } from '@/types/content-engine';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/use-clerk-auth';
import { BaselineFacebook } from '@/components/icons/facebook';
import { Instagram } from '@/components/icons/instagram';
import { Linkedin } from '@/components/icons/linkedin';
import { BaselineTiktok } from '@/components/icons/tiktok';
import { Twitter } from '@/components/icons/twitter';
import { YoutubeLine } from '@/components/icons/youtube';
import { ArrowRightUpLine } from '@/components/icons/arrow-right-up';

const log = logger.child({ module: 'components/content-engine/list-view' });

interface ListViewProps {
  items: ContentItem[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: ItemStatus | 'all';
  setStatusFilter: (s: ItemStatus | 'all') => void;
  platformFilter: Platform | 'all';
  setPlatformFilter: (p: Platform | 'all') => void;
  sortBy: 'date' | 'title' | 'platform';
  setSortBy: (s: 'date' | 'title' | 'platform') => void;
}

const statusOptions: { value: ItemStatus | 'all'; label: string; color: string; dotColor: string }[] = [
  { value: 'all', label: 'All Status', color: '', dotColor: '' },
  { value: 'idea', label: 'Idea', color: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300', dotColor: 'bg-zinc-400' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300', dotColor: 'bg-amber-400' },
  { value: 'ready', label: 'Ready', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', dotColor: 'bg-emerald-500' },
  { value: 'published', label: 'Published', color: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300', dotColor: 'bg-violet-500' },
];

const platformIcons: Record<Platform, ElementType> = {
  youtube: YoutubeLine,
  instagram: Instagram,
  tiktok: BaselineTiktok,
  twitter: Twitter,
  linkedin: Linkedin,
  facebook: BaselineFacebook,
};

const platformLabels: Record<Platform, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  twitter: 'Twitter',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
};

export function ListView({
  items,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  platformFilter,
  setPlatformFilter,
  sortBy,
  setSortBy
}: ListViewProps) {
  const { userId } = useAuth();
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const deleteItem = useDeleteContentItem();
  const duplicateItem = useDuplicateContentItem();
  const updateStatus = useUpdateItemStatus();
  const updateItem = useUpdateContentItem();

  log.debug('Rendering content item table', {
    userId: userId || 'signed_out',
    action: 'render_content_item_table',
    itemCount: items.length,
    statusFilter,
    platformFilter,
  });

  const filteredAndSortedItems = useMemo(() => {
    let filtered = [...items];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.content.hook_suggestion?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    if (platformFilter !== 'all') {
      filtered = filtered.filter((item) => item.platform === platformFilter);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'platform':
          return a.platform.localeCompare(b.platform);
        default:
          return 0;
      }
    });

    return filtered;
  }, [items, searchQuery, statusFilter, platformFilter, sortBy]);

  const platforms = useMemo(() => {
    const unique = Array.from(new Set(items.map((item) => item.platform)));
    return unique;
  }, [items]);

  const handleEdit = (item: ContentItem) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  };

  const handleDelete = (itemId: string) => {
    setItemToDelete(itemId);
    // Opening the dialog on the next frame avoids DropdownMenu + AlertDialog
    // modal-layer timing conflicts that can leave the page non-interactive.
    requestAnimationFrame(() => setDeleteDialogOpen(true));
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setItemToDelete(null);
    }
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;

    deleteItem.mutate(
      { itemId: itemToDelete },
      {
        onSuccess: () => {
          toast.success('Content deleted');
          setDeleteDialogOpen(false);
          setItemToDelete(null);
        },
        onError: () => toast.error('Failed to delete content'),
      }
    );
  };

  const handleDuplicate = (itemId: string) => {
    duplicateItem.mutate(itemId, {
      onSuccess: () => toast.success('Content duplicated'),
      onError: () => toast.error('Failed to duplicate content'),
    });
  };

  const handleStatusChange = (itemId: string, newStatus: ItemStatus) => {
    updateStatus.mutate(
      { itemId, status: newStatus },
      {
        onSuccess: () => toast.success('Status updated'),
        onError: () => toast.error('Failed to update status'),
      }
    );
  };

  const handleScheduleChange = (itemId: string, date: Date) => {
    updateItem.mutate(
      { itemId, updates: { scheduled_date: format(date, 'yyyy-MM-dd') } },
      {
        onSuccess: () => toast.success('Schedule updated'),
        onError: () => toast.error('Failed to update schedule'),
      }
    );
  };

  const getStatusOption = (status: ItemStatus) =>
    statusOptions.find((opt) => opt.value === status);

  const ScheduleDatePicker = ({ item }: { item: ContentItem }) => {
    const [open, setOpen] = useState(false);
    const selectedDate = item.scheduled_date ? new Date(item.scheduled_date) : new Date();

    log.debug('Rendering content schedule date picker', {
      userId: userId || 'signed_out',
      action: 'render_content_schedule_date_picker',
      itemId: item.id,
    });

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-lg px-2 text-xs text-foreground/80 hover:bg-muted hover:text-foreground"
          >
            {format(selectedDate, 'MMM d, yyyy')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (!date) return;
              handleScheduleChange(item.id, date);
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <>
      <div className="space-y-4">

        <div className="overflow-hidden rounded-xl border border-border/60 bg-background shadow-none sm:overflow-auto">
          <Table className="[&_td]:px-3 [&_td]:py-2 [&_th]:px-3">
            <TableHeader className="border-b border-border/60 bg-muted/20">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Title</TableHead>
                <TableHead className="h-9 w-20 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Platform</TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Schedule</TableHead>
                <TableHead className="h-9 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Status</TableHead>
                <TableHead className="h-9 w-12 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedItems.map((item) => {
                const statusOption = getStatusOption(item.status);
                return (
                  <TableRow
                    key={item.id}
                    className="border-border/50 hover:bg-transparent dark:hover:bg-transparent"
                  >
                    <TableCell className="w-[36%] min-w-[260px] max-w-[420px] font-medium text-gray-900 dark:text-gray-100">
                      <Link
                        href={`/script-creator/edit-content/${item.id}`}
                        className="group/title flex max-w-full items-center gap-2 pr-4 text-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <span className="min-w-0 flex-1 truncate">{item.title}</span>
                        <ArrowRightUpLine
                          className="h-3.5 w-3.5 shrink-0 -translate-x-1 translate-y-1 opacity-0 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/title:translate-x-0 group-hover/title:translate-y-0 group-hover/title:opacity-100 group-focus-visible/title:translate-x-0 group-focus-visible/title:translate-y-0 group-focus-visible/title:opacity-100 motion-reduce:transform-none"
                          aria-hidden="true"
                        />
                      </Link>
                    </TableCell>
                    <TableCell className="w-20">
                      <span
                        className="inline-flex h-6 w-6 items-center justify-center text-muted-foreground"
                        title={platformLabels[item.platform]}
                        aria-label={platformLabels[item.platform]}
                      >
                        {createElement(platformIcons[item.platform], {
                          'aria-hidden': true,
                          className: 'h-[18px] w-[18px]',
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ScheduleDatePicker item={item} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <button className="group outline-none">
                            <span className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${statusOption?.color}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${statusOption?.dotColor}`} aria-hidden="true" />
                              {statusOption?.label}
                            </span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="min-w-[140px] rounded-xl p-1">
                          {statusOptions.slice(1).map((option) => (
                            <DropdownMenuItem
                              key={option.value}
                              onSelect={() => handleStatusChange(item.id, option.value as ItemStatus)}
                              className={`h-6 cursor-pointer gap-1.5 rounded-[7px] px-2 text-xs transition-colors duration-150 focus:bg-primary focus:text-primary-foreground ${item.status === option.value ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${option.dotColor}`} aria-hidden="true" />
                              <span>{option.label}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-[100] w-32 rounded-xl p-1">
                          <DropdownMenuItem asChild className="h-6 cursor-pointer gap-2 rounded-[7px] px-2 text-xs text-muted-foreground transition-colors duration-150 focus:bg-primary focus:text-primary-foreground">
                            <Link href={`/script-creator/edit-content/${item.id}`}>
                              <Eye className="h-3.5 w-3.5" />
                              <span>View</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(item.id)} className="h-6 cursor-pointer gap-2 rounded-[7px] px-2 text-xs text-muted-foreground transition-colors duration-150 focus:bg-primary focus:text-primary-foreground">
                            <Copy className="h-3.5 w-3.5" />
                            <span>Duplicate</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(item.id)} className="h-6 cursor-pointer gap-2 rounded-[7px] px-2 text-xs text-muted-foreground transition-colors duration-150 focus:bg-primary focus:text-primary-foreground">
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredAndSortedItems.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No ideas found</p>
            </div>
          )}
        </div>
      </div>

      <ContentItemDialog
        item={selectedItem}
        open={dialogOpen}
        onOpenChange={handleDialogClose}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
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
              className="bg-red-600 hover:bg-red-700 font-semibold"
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {deleteItem.isPending ? 'Deleting...' : 'Delete Content'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
