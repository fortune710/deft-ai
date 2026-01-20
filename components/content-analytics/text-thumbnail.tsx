'use client';

interface TextThumbnailProps {
  contentText: string | null;
  textLimit?: number;
}

export function TextThumbnail({ contentText, textLimit = 180 }: TextThumbnailProps) {
  if (!contentText) {
    return (
      <div className="relative w-full flex items-center justify-center px-6 aspect-video rounded-t-lg overflow-y-auto bg-muted p-3">
        <p className="text-sm text-muted-foreground">No text content available.</p>
      </div>
    );
  }

  const textPreview = contentText.length > textLimit 
    ? contentText.substring(0, textLimit) 
    : contentText;
  const hasMoreText = contentText.length > textLimit;

  return (
    <div className="relative w-full flex items-center justify-center px-6 aspect-video rounded-t-lg overflow-y-auto p-3">
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
        {textPreview}
        {hasMoreText && '...'}
      </p>
    </div>
  );
}
