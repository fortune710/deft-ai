'use client';

import { useParams, useRouter } from 'next/navigation';
import { useContentItem, useUpdateItemContent } from '@/hooks/use-content-items';
import { ScriptEditor } from '@/components/editor/script-editor';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { EditorContent } from '@/types/script-chat';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function EditContentPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.itemId as string;

  const { data: contentItem, isLoading: itemLoading } = useContentItem(itemId);
  const updateItemContent = useUpdateItemContent();

  const [editorContent, setEditorContent] = useState<EditorContent | null>(null);

  if (contentItem && !editorContent) {
    setEditorContent({
      hookOptions: [],
      selectedHookId: null,
      fullScript: contentItem.content?.script_content || '',
      visualDirection: [],
      platformMetadata: {
        hashtags: contentItem.content?.hashtags || [],
      },
      thumbnailStrategy: {
        imagePrompt: '',
        overlayTextOptions: [],
      },
      goalAlignedCTA: contentItem.content?.cta_suggestion || '',
      estimatedDuration: '',
      platform: contentItem.platform,
    });
  }

  const handleContentChange = async (newContent: EditorContent) => {
    setEditorContent(newContent);
    await updateItemContent.mutateAsync({
      itemId,
      content: {
        script_content: newContent.fullScript,
        cta_suggestion: newContent.goalAlignedCTA,
        hook_suggestion: newContent.hookOptions[0]?.text || '',
      },
    });
  };

  if (itemLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!contentItem || !editorContent) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Content not found</h2>
          <Button onClick={() => router.push('/content-engine')}>
            Back to Content Ideas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="flex flex-col flex-1 min-w-0">
        <header className="border-b px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/content-engine')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{contentItem.title}</h1>
              <p className="text-sm text-muted-foreground">
                Last updated {new Date(contentItem.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </header>

        <ScrollArea className="flex-1 overflow-hidden">
          <ScriptEditor
            content={editorContent}
            sessionId={itemId}
            onContentChange={handleContentChange}
          />
        </ScrollArea>
      </div>
    </div>
  );
}
