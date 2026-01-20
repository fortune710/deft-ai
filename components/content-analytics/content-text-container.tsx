'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';

interface ContentTextContainerProps {
  contentText: string | null;
}

export function ContentTextContainer({ contentText }: ContentTextContainerProps) {
  return (
    <Card className="w-full md:w-[560px] lg:w-[830px] h-[630px] flex flex-col">
      <CardContent className="flex-1 max-sm:h-[600px] p-0">
        <ScrollArea className="h-full p-6">
          <div className="whitespace-pre-wrap text-sm">
            {contentText || 'No text content available.'}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
