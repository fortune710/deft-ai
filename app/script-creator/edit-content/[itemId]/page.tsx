'use client';

import { useParams, useRouter } from 'next/navigation';
import { useContentItem, useUpdateItemContent } from '@/hooks/use-content-items';
import { useSessionMessages } from '@/hooks/use-script-chats';
import { MdxScriptEditor, MdxScriptEditorRef } from '@/components/editor/mdx-script-editor';
import { ChatPanel } from '@/components/editor/chat-panel';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { contentToMarkdown } from '@/lib/utils/script-markdown';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function EditContentPage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params.itemId as string;

  const { data: contentItem, isLoading: itemLoading } = useContentItem(itemId);
  const { data: messages } = useSessionMessages(itemId);
  const updateItemContent = useUpdateItemContent();
  const editorRef = useRef<MdxScriptEditorRef>(null);

  const [initialMarkdown, setInitialMarkdown] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(true);

  useEffect(() => {
    if (contentItem && initialMarkdown === null) {
      setInitialMarkdown(contentItem.script_content || contentToMarkdown(contentItem.content));
    }
  }, [contentItem, initialMarkdown]);

  const handleManualMarkdownChange = (newMarkdown: string) => {
    // Only save automatically occasionally or rely on a save button/blur.
    // We'll update the server immediately to give the AI context.
    updateItemContent.mutate({
      itemId,
      content: newMarkdown as any, // Store directly as a string or whatever format we use now
    });
  };

  const handleAIContentUpdate = (newMarkdown: string) => {
    // Write AI changes directly to the editor UI using imperative ref
    editorRef.current?.setMarkdown(newMarkdown);
    handleManualMarkdownChange(newMarkdown);
  };

  if (itemLoading || initialMarkdown === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background/50 backdrop-blur-sm">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!contentItem) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Content not found</h2>
          <Button variant="outline" onClick={() => router.push('/content-engine')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Content Ideas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <header className="border-b px-6 py-3 flex items-center justify-between shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/content-engine" className="text-muted-foreground hover:text-foreground transition-colors">
                  Content Engine
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium text-foreground">
                  {contentItem.title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-2">
          {!showChat && (
            <Button variant="outline" size="sm" onClick={() => setShowChat(true)} className="gap-2 rounded-full px-4 text-xs h-8">
              <Sparkles className="h-3.5 w-3.5" />
              AI Assistant
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 relative">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={showChat ? 70 : 100} minSize={40} className="relative custom-scrollbar flex flex-col items-stretch">
            <MdxScriptEditor
              ref={editorRef}
              initialMarkdown={initialMarkdown}
              onChange={handleManualMarkdownChange}
              isSaving={updateItemContent.isPending}
            />
          </ResizablePanel>

          {showChat && (
            <>
              <ResizableHandle className="w-1.5 bg-transparent hover:bg-primary/20 hover:w-2 transition-all group relative">
                <div className="absolute inset-y-1/2 -left-0.5 right-0.5 h-12 bg-border group-hover:bg-primary/50 transition-colors rounded-full" />
              </ResizableHandle>
              <ResizablePanel defaultSize={30} minSize={25} maxSize={40} className="border-l bg-accent/30 shadow-inner flex flex-col">
                <ChatPanel
                  sessionId={itemId}
                  messages={messages || []}
                  editorContent={editorRef.current?.getMarkdown() || initialMarkdown}
                  onClose={() => setShowChat(false)}
                  onContentUpdate={handleAIContentUpdate as any}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
