'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { MoreVertical, Calendar, Trash2, Copy, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { ContentItem } from '@/types/content-engine';

interface ContentItemCardProps {
  item: ContentItem;
  onEdit: (item: ContentItem) => void;
  onDelete: (itemId: string) => void;
  onDuplicate: (itemId: string) => void;
  isDragging?: boolean;
}

const platformColors: Record<string, string> = {
  youtube: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  instagram: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  tiktok: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  twitter: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  linkedin: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  facebook: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
};

const platformLabels: Record<string, string> = {
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
  const scheduledDate = new Date(item.scheduled_date);
  const formattedDate = format(scheduledDate, 'MMM d');
  const daysUntil = Math.ceil((scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const handleCardClick = () => {
    router.push(`/script-creator/edit-content/${item.id}`);
  };

  const handleMenuEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(item);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <Badge className={platformColors[item.platform] || 'bg-gray-100 text-gray-700'}>
          {platformLabels[item.platform] || item.platform}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleMenuEdit}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(item.id); }}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="text-red-600">
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

      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
        <Calendar className="h-3 w-3" />
        <span>{formattedDate}</span>
        {daysUntil >= 0 && (
          <span className="text-xs text-gray-400">
            ({daysUntil === 0 ? 'Today' : `${daysUntil}d`})
          </span>
        )}
      </div>
    </div>
  );
}
