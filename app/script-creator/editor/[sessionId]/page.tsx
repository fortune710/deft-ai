'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSessionById, useSessionMessages, useUpdateEditorContent } from '@/hooks/use-script-chats';
import { ScriptEditor } from '@/components/editor/script-editor';
import { ChatPanel } from '@/components/editor/chat-panel';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { EditorContent } from '@/types/script-chat';

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const { data: session, isLoading: sessionLoading } = useSessionById(sessionId);
  const { data: messages = [], isLoading: messagesLoading } = useSessionMessages(sessionId);
  const updateContent = useUpdateEditorContent();

  const [isChatOpen, setIsChatOpen] = useState(true);
  const [editorContent, setEditorContent] = useState<EditorContent | null>(null);

  if (session && !editorContent) {
    setEditorContent(session.editor_content);
  }

  const handleContentChange = async (newContent: EditorContent) => {
    setEditorContent(newContent);
    await updateContent.mutateAsync({
      sessionId,
      editorContent: newContent,
    });
  };

  if (sessionLoading || messagesLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session || !editorContent) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Session not found</h2>
          <Button onClick={() => router.push('/script-creator')}>
            Back to Scripts
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
              onClick={() => router.push('/script-creator')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{session.title}</h1>
              <p className="text-sm text-muted-foreground">
                Last updated {new Date(session.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="md:hidden"
          >
            {isChatOpen ? 'Hide Chat' : 'Show Chat'}
          </Button>
        </header>

        <div className="flex-1 overflow-hidden flex">
          <div
            className={`flex-1 overflow-auto transition-all ${
              isChatOpen ? 'md:mr-[35%]' : ''
            }`}
          >
            <ScriptEditor
              content={editorContent}
              sessionId={sessionId}
              onContentChange={handleContentChange}
            />
          </div>

          <div
            className={`
              fixed md:absolute top-0 right-0 h-full
              transition-transform duration-300 ease-in-out
              ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}
              w-full md:w-[35%] border-l bg-background
              z-50 md:z-auto
            `}
          >
            <ChatPanel
              sessionId={sessionId}
              messages={messages}
              editorContent={editorContent}
              onClose={() => setIsChatOpen(false)}
              onContentUpdate={handleContentChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
