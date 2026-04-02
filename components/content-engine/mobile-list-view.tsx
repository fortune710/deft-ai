'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Eye, Copy, Trash2 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContentItemDialog } from './content-item-dialog';
import { useDeleteContentItem, useDuplicateContentItem } from '@/hooks/use-content-items';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { ContentItem, ItemStatus, Platform } from '@/types/content-engine';

interface MobileListViewProps {
  items: ContentItem[];
}

const statusGroups: { id: ItemStatus; label: string; color: string }[] = [
  { id: 'idea', label: 'Ideas', color: 'bg-gray-100 text-gray-700' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { id: 'ready', label: 'Ready', color: 'bg-green-100 text-green-700' },
  { id: 'published', label: 'Published', color: 'bg-purple-100 text-purple-700' },
];

const platformLabels: Record<Platform, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  twitter: 'Twitter',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
};

const platformColors: Record<Platform, string> = {
  youtube: 'bg-red-500/10 text-red-600 border-red-500/20',
  instagram: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  tiktok: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  twitter: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  linkedin: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  facebook: 'bg-blue-600/10 text-blue-700 border-blue-600/20',
};

export function MobileListView({ items }: MobileListViewProps) {
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const deleteItem = useDeleteContentItem();
  const duplicateItem = useDuplicateContentItem();

  const filteredItems = selectedPlatform === 'all'
    ? items
    : items.filter((item) => item.platform === selectedPlatform);

  const itemsByStatus = statusGroups.reduce((acc, group) => {
    acc[group.id] = filteredItems.filter((item) => item.status === group.id);
    return acc;
  }, {} as Record<ItemStatus, ContentItem[]>);

  const platforms = Array.from(new Set(items.map((item) => item.platform)));

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

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedPlatform === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPlatform('all')}
          >
            All
          </Button>
          {platforms.map((platform) => (
            <Button
              key={platform}
              variant={selectedPlatform === platform ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPlatform(platform)}
            >
              {platformLabels[platform]}
            </Button>
          ))}
        </div>

        <Accordion type="multiple" defaultValue={['idea', 'in_progress']} className="space-y-2">
          {statusGroups.map((group) => {
            const groupItems = itemsByStatus[group.id] || [];
            return (
              <AccordionItem
                key={group.id}
                value={group.id}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{group.label}</span>
                    <Badge variant="secondary">{groupItems.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {groupItems.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No items in this status
                      </p>
                    ) : (
                      groupItems.map((item) => {
                        const scheduledDate = new Date(item.scheduled_date);
                        const daysUntil = Math.ceil(
                          (scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                        );

                        return (
                          <div
                            key={item.id}
                            className="bg-white dark:bg-gray-800 rounded-lg border p-3 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm mb-1">{item.title}</h4>
                                {item.description && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "px-2.5 py-0.5 h-6 text-[10px] font-bold uppercase tracking-wider rounded-md border",
                                  platformColors[item.platform] || 'bg-gray-100 text-gray-700'
                                )}
                              >
                                {platformLabels[item.platform] || item.platform}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Calendar className="h-3 w-3" />
                              <span>{format(scheduledDate, 'MMM d, yyyy')}</span>
                              {daysUntil >= 0 && (
                                <span className="text-gray-400">
                                  ({daysUntil === 0 ? 'Today' : `${daysUntil}d`})
                                </span>
                              )}
                            </div>

                            <div className="flex gap-2 pt-2 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => handleEdit(item)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDuplicate(item.id)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(item.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
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
