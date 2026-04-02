'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Search, Eye, Copy, Trash2, Calendar as CalendarIcon } from 'lucide-react';
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

export function ListView({ items }: ListViewProps) {
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'platform'>('date');
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
            className="h-8 px-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <CalendarIcon className="h-3.5 w-3.5 mr-1 text-slate-400" />
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
        <div className="flex flex-wrap gap-3 items-center rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search ideas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-transparent"
              />
            </div>
          </div>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ItemStatus | 'all')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={platformFilter} onValueChange={(value) => setPlatformFilter(value as Platform | 'all')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {platforms.map((platform) => (
                <SelectItem key={platform} value={platform}>
                  {platformLabels[platform]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'date' | 'title' | 'platform')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Schedule</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="platform">Platform</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border border-slate-200/70 dark:border-slate-800 rounded-2xl bg-white/80 dark:bg-slate-900/60 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Title</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Platform</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Schedule</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Hook</TableHead>
                <TableHead className="text-right text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedItems.map((item) => {
                const statusOption = getStatusOption(item.status);
                return (
                  <TableRow key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                    <TableCell className="font-medium max-w-[250px] text-slate-900 dark:text-slate-100">
                      <div className="line-clamp-1">{item.title}</div>
                      {item.description && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-1">
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
                                "cursor-pointer transition-all hover:ring-2 hover:ring-offset-1 hover:ring-slate-400/30",
                                statusOption?.color,
                                "px-2.5 py-1 text-[11px] font-bold rounded-md border-none flex items-center gap-1.5"
                              )}
                            >
                              <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusDotColors[item.status] || "bg-slate-400")} />
                              {statusOption?.label}
                            </Badge>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="min-w-[160px] p-1 rounded-xl shadow-xl border-slate-200 dark:border-slate-800">
                          {statusOptions.slice(1).map((option) => (
                            <DropdownMenuItem
                              key={option.value}
                              onSelect={() => handleStatusChange(item.id, option.value as ItemStatus)}
                              className="flex items-center gap-2 px-2.5 py-2 cursor-pointer rounded-lg focus:bg-slate-100 dark:focus:bg-slate-800"
                            >
                              <div className={cn("h-3.5 w-3.5 rounded-md shrink-0 flex items-center justify-center", option.color)}>
                                <div className={cn("h-1.5 w-1.5 rounded-full", statusDotColors[option.value] || "bg-slate-400")} />
                              </div>
                              <span className="text-sm font-medium">{option.label}</span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <div className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                        {item.content.hook_suggestion || 'No hook yet'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(item)}
                          title="View & Edit"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDuplicate(item.id)}
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          title="Delete"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
