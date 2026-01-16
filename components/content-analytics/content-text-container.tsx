'use client';

import { ScrollArea } from '@/components/ui/scroll-area';

interface ContentTextContainerProps {
  contentText: string | null;
}

export function ContentTextContainer({ contentText }: ContentTextContainerProps) {
  return (
    <ScrollArea className="h-[420px]">
      <div className="whitespace-pre-wrap text-sm">
        {contentText || 'No text content available.'}
      </div>
    </ScrollArea>
  );
}
