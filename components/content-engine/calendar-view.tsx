'use client';

import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ContentItemDialog } from './content-item-dialog';
import type { ContentItem, Platform } from '@/types/content-engine';

interface CalendarViewProps {
  items: ContentItem[];
  planStartDate: string;
}

const platformColors: Record<Platform, string> = {
  youtube: 'bg-red-500',
  instagram: 'bg-pink-500',
  tiktok: 'bg-cyan-500',
  twitter: 'bg-blue-500',
  linkedin: 'bg-indigo-500',
  facebook: 'bg-blue-600',
};

const statusColors: Record<string, string> = {
  idea: 'border-gray-300 bg-gray-50',
  in_progress: 'border-blue-300 bg-blue-50',
  ready: 'border-green-300 bg-green-50',
  published: 'border-purple-300 bg-purple-50',
};

export function CalendarView({ items, planStartDate }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date(planStartDate));
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const itemsByDate = useMemo(() => {
    const grouped: Record<string, ContentItem[]> = {};
    items.forEach((item) => {
      const dateKey = format(new Date(item.scheduled_date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(item);
    });
    return grouped;
  }, [items]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleItemClick = (item: ContentItem) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedItem(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-2"
            >
              {day}
            </div>
          ))}

          {days.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayItems = itemsByDate[dateKey] || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={dateKey}
                className={`min-h-[120px] p-2 border rounded-lg ${
                  isCurrentMonth
                    ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800'
                } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                  {format(day, 'd')}
                </div>

                {dayItems.length > 0 && (
                  <div className="space-y-1">
                    {dayItems.slice(0, 2).map((item) => (
                      <Popover key={item.id}>
                        <PopoverTrigger asChild>
                          <button
                            className={`w-full text-left p-1 rounded text-xs border ${
                              statusColors[item.status]
                            } hover:shadow-sm transition-shadow`}
                          >
                            <div className="flex items-center gap-1">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  platformColors[item.platform]
                                }`}
                              />
                              <span className="line-clamp-1 flex-1">{item.title}</span>
                            </div>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="font-semibold">{item.title}</h4>
                              <Badge variant="secondary" className="text-xs">
                                {item.platform}
                              </Badge>
                            </div>
                            {item.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {item.description}
                              </p>
                            )}
                            {item.content.hook_suggestion && (
                              <div>
                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                  Hook:
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                                  {item.content.hook_suggestion}
                                </p>
                              </div>
                            )}
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => handleItemClick(item)}
                              >
                                View Full Content
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    ))}

                    {dayItems.length > 2 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-1">
                        +{dayItems.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>YouTube</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-pink-500" />
            <span>Instagram</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-500" />
            <span>TikTok</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Twitter</span>
          </div>
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
