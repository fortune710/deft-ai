'use client';

interface VideoContainerProps {
  videoSrc: string | null;
}

export function VideoContainer({ videoSrc }: VideoContainerProps) {
  return (
    <div className="rounded-lg border border-primary bg-muted aspect-video w-full md:w-[560px] h-[630px] relative overflow-hidden">
      {videoSrc ? (
        <video controls src={videoSrc} className="rounded-lg w-full h-full object-cover inset-0" />
      ) : (
        <p className="text-sm text-muted-foreground">No video URL available for this item.</p>
      )}
    </div>
  );
}
