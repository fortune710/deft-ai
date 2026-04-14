'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Search, Eye, Copy, Trash2, Calendar as CalendarIcon, MoreVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { cn } from '@/lib/utils';
import type { ContentItem, ItemStatus, Platform } from '@/types/content-engine';

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

const statusOptions: { value: ItemStatus | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All Status', color: '' },
  { value: 'idea', label: 'Idea', color: 'bg-gray-100 text-gray-700' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'ready', label: 'Ready', color: 'bg-green-100 text-green-700' },
  { value: 'published', label: 'Published', color: 'bg-purple-100 text-purple-700' },
];

const statusDotColors: Record<string, string> = {
  idea: 'bg-gray-500',
  in_progress: 'bg-blue-500',
  ready: 'bg-green-500',
  published: 'bg-purple-500',
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
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const deleteItem = useDeleteContentItem();
  const duplicateItem = useDuplicateContentItem();
  const updateStatus = useUpdateItemStatus();
  const updateItem = useUpdateContentItem();

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
    setDeleteDialogOpen(true);
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

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <CalendarIcon className="h-3.5 w-3.5 mr-1 text-gray-400" />
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

        <div className="border border-gray-100 dark:border-gray-800 rounded-xl bg-transparent shadow-none overflow-hidden sm:overflow-auto">
          <Table>
            <TableHeader className="bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-100 dark:border-gray-800">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="text-[10px] h-11 uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400">Title</TableHead>
                <TableHead className="text-[10px] h-11 uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400">Platform</TableHead>
                <TableHead className="text-[10px] h-11 uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400">Schedule</TableHead>
                <TableHead className="text-[10px] h-11 uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400">Status</TableHead>
                <TableHead className="text-[10px] h-11 uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400">Hook</TableHead>
                <TableHead className="text-right text-[10px] h-11 uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400 w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedItems.map((item) => {
                const statusOption = getStatusOption(item.status);
                return (
                  <TableRow
                    key={item.id}
                    className="hover:bg-primary/5 dark:hover:bg-primary/10 border-gray-100 dark:border-gray-800 transition-colors"
                  >
                    <TableCell className="font-medium max-w-[250px] text-gray-900 dark:text-gray-100">
                      <div className="line-clamp-1">{item.title}</div>
                      {item.description && (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "px-2.5 py-0.5 text-[10px] uppercase font-black tracking-widest",
                          item.platform === 'youtube' && "bg-red-500/10 text-red-600 border-red-500/20",
                          item.platform === 'instagram' && "bg-pink-500/10 text-pink-600 border-pink-500/20",
                          item.platform === 'tiktok' && "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
                          item.platform === 'twitter' && "bg-blue-500/10 text-blue-600 border-blue-500/20",
                          item.platform === 'linkedin' && "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
                          item.platform === 'facebook' && "bg-blue-600/10 text-blue-700 border-blue-600/20"
                        )}
                      >
                        {platformLabels[item.platform] || item.platform}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ScheduleDatePicker item={item} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="outline-none group">
                            <Badge
                              className={cn(
                                "cursor-pointer transition-all hover:opacity-80 active:scale-95",
                                statusOption?.color,
                                "px-3 py-1.5 text-xs font-bold rounded-md border-none flex items-center gap-1.5"
                              )}
                            >
                              {statusOption?.label}
                            </Badge>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[140px] p-1 rounded-xl shadow-lg border-gray-200 dark:border-gray-800">
                          {statusOptions.slice(1).map((option) => (
                            <DropdownMenuItem
                              key={option.value}
                              onSelect={() => handleStatusChange(item.id, option.value as ItemStatus)}
                              className="flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-md focus:bg-gray-100 dark:focus:bg-gray-800"
                            >
                              <span className="text-xs font-semibold">{option.label}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {item.content.hook_suggestion || 'No hook yet'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32 rounded-xl">
                          <DropdownMenuItem onClick={() => handleEdit(item)} className="cursor-pointer gap-2">
                            <Eye className="h-3.5 w-3.5" />
                            <span>View</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(item.id)} className="cursor-pointer gap-2">
                            <Copy className="h-3.5 w-3.5" />
                            <span>Duplicate</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(item.id)} className="cursor-pointer gap-2 text-red-600 focus:text-red-600">
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your content idea.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
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
