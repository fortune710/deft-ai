'use client';

import Image from 'next/image';
import { Video } from 'lucide-react';

interface VideoThumbnailProps {
  thumbnailUrl: string | null;
  title?: string;
}

export function VideoThumbnail({ thumbnailUrl, title }: VideoThumbnailProps) {
  return (
    <div className="relative w-full aspect-video rounded-t-lg overflow-hidden bg-muted flex items-center justify-center">
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt={title || 'Video thumbnail'}
          fill
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Video className="h-12 w-12" />
          <span className="text-xs">No thumbnail</span>
        </div>
      )}
    </div>
  );
}
