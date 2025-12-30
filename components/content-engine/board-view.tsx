'use client';

import { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ContentItemCard } from './content-item-card';
import { ContentItemDialog } from './content-item-dialog';
import { useUpdateItemPosition, useDeleteContentItem, useDuplicateContentItem } from '@/hooks/use-content-items';
import { toast } from 'sonner';
import type { ContentItem, ItemStatus } from '@/types/content-engine';

interface BoardViewProps {
  items: ContentItem[];
  planId: string;
}

const statusColumns: { id: ItemStatus; label: string; color: string }[] = [
  { id: 'idea', label: 'Ideas', color: 'border-gray-300 dark:border-gray-600' },
  { id: 'in_progress', label: 'In Progress', color: 'border-blue-300 dark:border-blue-600' },
  { id: 'ready', label: 'Ready', color: 'border-green-300 dark:border-green-600' },
  { id: 'published', label: 'Published', color: 'border-purple-300 dark:border-purple-600' },
];

export function BoardView({ items, planId }: BoardViewProps) {
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const updatePosition = useUpdateItemPosition();
  const deleteItem = useDeleteContentItem();
  const duplicateItem = useDuplicateContentItem();

  const itemsByStatus = useMemo(() => {
    return statusColumns.reduce((acc, column) => {
      acc[column.id] = items
        .filter((item) => item.status === column.id)
        .sort((a, b) => a.position - b.position);
      return acc;
    }, {} as Record<ItemStatus, ContentItem[]>);
  }, [items]);

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

    updatePosition.mutate(
      {
        itemId: draggableId,
        position: newPosition,
        status: statusChanged ? newStatus : undefined,
      },
      {
        onSuccess: () => {
          // Only show toast on status change, not on position-only changes
          if (statusChanged) {
            toast.success(`Moved to ${statusLabel}`, {
              duration: 2000,
            });
          }
        },
        onError: () => {
          toast.error('Failed to move content', {
            duration: 3000,
          });
        },
      }
    );
  };

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
        onSuccess: () => {
          toast.success('Content deleted');
        },
        onError: () => {
          toast.error('Failed to delete content');
        },
      }
    );
  };

  const handleDuplicate = (itemId: string) => {
    duplicateItem.mutate(itemId, {
      onSuccess: () => {
        toast.success('Content duplicated');
      },
      onError: () => {
        toast.error('Failed to duplicate content');
      },
    });
  };

  return (
    <div>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-4 gap-4 h-full">
          {statusColumns.map((column) => (
            <div key={column.id} className="flex flex-col">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  {column.label}
                </h3>
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium px-2 py-1 rounded-full">
                  {itemsByStatus[column.id]?.length || 0}
                </span>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 space-y-3 p-3 rounded-lg border-2 border-dashed ${column.color} ${
                      snapshot.isDraggingOver ? 'bg-gray-50 dark:bg-gray-800' : 'bg-transparent'
                    } transition-colors min-h-[200px]`}
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
