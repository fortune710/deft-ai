'use client';

import { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ContentItemCard } from './content-item-card';
import { ContentItemDialog } from './content-item-dialog';
import { useUpdateItemPosition, useDeleteContentItem, useDuplicateContentItem } from '@/hooks/use-content-items';
import { toast } from 'sonner';
import type { ContentItem, ItemStatus } from '@/types/content-engine';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/use-clerk-auth';

const log = logger.child({ module: 'components/content-engine/board-view' });

interface BoardViewProps {
  items: ContentItem[];
  searchQuery: string;
  platformFilter: string;
  statusFilter: ItemStatus | 'all';
}

const statusColumns: { id: ItemStatus; label: string; color: string }[] = [
  { id: 'idea', label: 'Ideas', color: 'border-gray-200 dark:border-gray-800' },
  { id: 'in_progress', label: 'In Progress', color: 'border-gray-200 dark:border-gray-800' },
  { id: 'ready', label: 'Ready', color: 'border-gray-200 dark:border-gray-800' },
  { id: 'published', label: 'Published', color: 'border-gray-200 dark:border-gray-800' },
];

export function BoardView({ items, searchQuery, platformFilter, statusFilter }: BoardViewProps) {
  const { userId } = useAuth();
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const updatePosition = useUpdateItemPosition();
  const deleteItem = useDeleteContentItem();
  const duplicateItem = useDuplicateContentItem();

  log.debug('Rendering content board', {
    userId: userId || 'signed_out',
    action: 'render_content_board',
    itemCount: items.length,
    statusFilter,
    platformFilter,
  });

  const visibleColumns = statusFilter === 'all'
    ? statusColumns
    : statusColumns.filter((column) => column.id === statusFilter);

  const itemsByStatus = useMemo(() => {
    let filtered = [...items];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }

    if (platformFilter !== 'all') {
      filtered = filtered.filter((item) => item.platform === platformFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    return statusColumns.reduce((acc, column) => {
      acc[column.id] = filtered
        .filter((item) => item.status === column.id)
        .sort((a, b) => a.position - b.position);
      return acc;
    }, {} as Record<ItemStatus, ContentItem[]>);
  }, [items, searchQuery, platformFilter, statusFilter]);

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as ItemStatus;
    const newPosition = destination.index;
    const statusChanged = source.droppableId !== destination.droppableId;
    const statusLabel = statusColumns.find((col) => col.id === newStatus)?.label || newStatus;

    log.info('Completing content item drag', {
      userId: userId || 'signed_out',
      action: 'complete_content_item_drag',
      itemId: draggableId,
      source: source.droppableId,
      destination: destination.droppableId,
      destinationIndex: destination.index,
    });

    updatePosition.mutate(
      {
        itemId: draggableId,
        position: newPosition,
        status: statusChanged ? newStatus : undefined,
      },
      {
        onSuccess: () => {
          if (statusChanged) {
            toast.success(`Moved to ${statusLabel}`, {
              duration: 2000,
            });
          }
        },
        onError: (error) => {
          log.error('Failed to move content item', {
            userId: userId || 'signed_out',
            action: 'complete_content_item_drag',
            itemId: draggableId,
            error: error instanceof Error ? error.message : String(error),
          });
          toast.error('Failed to move content', {
            duration: 3000,
          });
        },
      }
    );
  };

  const handleEdit = (item: ContentItem) => {
    log.info('Opening content item details', {
      userId: userId || 'signed_out',
      action: 'open_content_item_details',
      itemId: item.id,
    });
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    log.info('Changing content item dialog', {
      userId: userId || 'signed_out',
      action: 'change_content_item_dialog',
      itemId: selectedItem?.id || null,
      open,
    });
    setDialogOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  };

  const handleDelete = (itemId: string) => {
    log.info('Deleting content item', {
      userId: userId || 'signed_out',
      action: 'delete_content_item',
      itemId,
    });
    deleteItem.mutate(
      { itemId },
      {
        onSuccess: () => {
          toast.success('Content deleted');
        },
        onError: (error) => {
          log.error('Failed to delete content item', {
            userId: userId || 'signed_out',
            action: 'delete_content_item',
            itemId,
            error: error instanceof Error ? error.message : String(error),
          });
          toast.error('Failed to delete content');
        },
      }
    );
  };

  const handleDuplicate = (itemId: string) => {
    log.info('Duplicating content item', {
      userId: userId || 'signed_out',
      action: 'duplicate_content_item',
      itemId,
    });
    duplicateItem.mutate(itemId, {
      onSuccess: () => {
        toast.success('Content duplicated');
      },
      onError: (error) => {
        log.error('Failed to duplicate content item', {
          userId: userId || 'signed_out',
          action: 'duplicate_content_item',
          itemId,
          error: error instanceof Error ? error.message : String(error),
        });
        toast.error('Failed to duplicate content');
      },
    });
  };

  return (
    <div className="max-h-[75vh] space-y-4 overflow-hidden">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className={statusFilter === 'all'
          ? 'grid h-[75vh] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'
          : 'grid h-[75vh] max-w-md grid-cols-1 gap-4'}>
          {visibleColumns.map((column) => (
            <div key={column.id} className="flex min-h-0 flex-col">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {column.label}
                </h3>
                <span className="bg-white/80 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 text-xs font-medium px-2.5 py-1 rounded-full border border-gray-200/60 dark:border-gray-600/60">
                  {itemsByStatus[column.id]?.length || 0}
                </span>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain rounded-xl border-2 border-dashed p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-[background-color,border-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${snapshot.isDraggingOver
                      ? 'bg-primary/5 border-primary/40'
                      : 'bg-transparent border-border'
                      }`}
                  >
                    {itemsByStatus[column.id]?.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <ContentItemCard
                              item={item}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                              onDuplicate={handleDuplicate}
                              isDragging={snapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {(!itemsByStatus[column.id] || itemsByStatus[column.id].length === 0) && (
                      <p className="text-sm text-gray-400 text-center py-8">
                        Drop items here
                      </p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      <ContentItemDialog
        item={selectedItem}
        open={dialogOpen}
        onOpenChange={handleDialogClose}
      />
    </div>
  );
}
