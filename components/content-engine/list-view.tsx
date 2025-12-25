'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Search, Eye, Copy, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useDeleteContentItem, useDuplicateContentItem, useUpdateItemStatus } from '@/hooks/use-content-items';
import { toast } from 'sonner';
import type { ContentItem, ItemStatus, Platform } from '@/types/content-engine';

interface ListViewProps {
  items: ContentItem[];
  planId: string;
}

const statusOptions: { value: ItemStatus | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All Status', color: '' },
  { value: 'idea', label: 'Idea', color: 'bg-gray-100 text-gray-700' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'ready', label: 'Ready', color: 'bg-green-100 text-green-700' },
  { value: 'published', label: 'Published', color: 'bg-purple-100 text-purple-700' },
];

const platformLabels: Record<Platform, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  twitter: 'Twitter',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
};

export function ListView({ items, planId }: ListViewProps) {
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'platform'>('date');

  const deleteItem = useDeleteContentItem();
  const duplicateItem = useDuplicateContentItem();
  const updateStatus = useUpdateItemStatus();

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
    if (!confirm('Are you sure you want to delete this content item?')) return;

    deleteItem.mutate(
      { itemId, planId },
      {
        onSuccess: () => toast.success('Content deleted'),
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

  const getStatusOption = (status: ItemStatus) =>
    statusOptions.find((opt) => opt.value === status);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
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
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="platform">Platform</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-white">Title</TableHead>
                <TableHead className="text-white">Platform</TableHead>
                <TableHead className="text-white">Scheduled Date</TableHead>
                <TableHead className="text-white">Status</TableHead>
                <TableHead className="text-white">Hook Preview</TableHead>
                <TableHead className="text-right text-white">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedItems.map((item) => {
                const statusOption = getStatusOption(item.status);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium max-w-[250px] text-white">
                      <div className="line-clamp-1">{item.title}</div>
                      {item.description && (
                        <div className="text-xs text-gray-300 line-clamp-1 mt-1">
                          {item.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-white">
                      <Badge variant="secondary">{platformLabels[item.platform]}</Badge>
                    </TableCell>
                    <TableCell className="text-white">
                      {format(new Date(item.scheduled_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-white">
                      <Select
                        value={item.status}
                        onValueChange={(value) => handleStatusChange(item.id, value as ItemStatus)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <Badge className={statusOption?.color}>
                            {statusOption?.label}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.slice(1).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="max-w-[300px] text-white">
                      <div className="text-sm text-gray-200 line-clamp-2">
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
              <p>No content items found</p>
            </div>
          )}
        </div>
      </div>

      <ContentItemDialog
        item={selectedItem}
        open={dialogOpen}
        onOpenChange={handleDialogClose}
      />
    </>
  );
}
