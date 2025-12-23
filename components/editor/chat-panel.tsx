'use client';

import { useState, useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageType, EditorContent, MessageType } from '@/types/script-chat';
import { ChatMessage } from './chat-message';
import { ModeSelector } from './mode-selector';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { X, Send, Loader2 } from 'lucide-react';
import { useSaveMessage } from '@/hooks/use-script-chats';
import { toast } from 'sonner';

interface ChatPanelProps {
  sessionId: string;
  messages: ChatMessageType[];
  editorContent: EditorContent;
  onClose: () => void;
  onContentUpdate: (content: EditorContent) => void;
}

export function ChatPanel({
  sessionId,
  messages,
  editorContent,
  onClose,
  onContentUpdate,
}: ChatPanelProps) {
  const [mode, setMode] = useState<MessageType>('ask');
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const saveMessage = useSaveMessage();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage = input.trim();
    setInput('');
    setIsGenerating(true);

    try {
      await saveMessage.mutateAsync({
        sessionId,
        role: 'user',
        messageType: mode,
        content: userMessage,
      });

      if (mode === 'ask') {
        const response = await fetch('/api/chat/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: userMessage,
            currentContent: editorContent,
          }),
        });

        if (!response.ok) throw new Error('Failed to get response');

        const data = await response.json();

        await saveMessage.mutateAsync({
          sessionId,
          role: 'assistant',
          messageType: mode,
          content: data.response,
        });
      } else {
        const response = await fetch('/api/chat/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            editRequest: userMessage,
            currentContent: editorContent,
          }),
        });

        if (!response.ok) throw new Error('Failed to generate edit');

        const data = await response.json();

        await saveMessage.mutateAsync({
          sessionId,
          role: 'assistant',
          messageType: mode,
          content: data.content,
          proposedChanges: data.proposedChanges,
          changeStatus: 'pending',
        });
      }
    } catch (error) {
      toast.error('Failed to send message');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <h3 className="font-semibold">Chat Assistant</h3>
          <p className="text-xs text-muted-foreground">
            {mode === 'ask' ? 'Ask questions' : 'Request edits'}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="px-4 py-3 border-b shrink-0">
        <ModeSelector mode={mode} onModeChange={setMode} />
      </div>

      <div className="flex-1 overflow-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            <p className="mb-2">Start a conversation</p>
            <p className="text-xs">
              {mode === 'ask'
                ? 'Ask questions about your script or content strategy'
                : 'Request specific changes to your script'}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              sessionId={sessionId}
              onContentUpdate={onContentUpdate}
              editorContent={editorContent}
            />
          ))
        )}
        {isGenerating && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Generating response...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4 shrink-0">
        <div className="space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'ask'
                ? 'Ask a question... (Cmd/Ctrl+Enter to send)'
                : 'Describe the edit you want... (Cmd/Ctrl+Enter to send)'
            }
            rows={3}
            disabled={isGenerating}
            className="resize-none"
          />
          <Button onClick={handleSend} disabled={!input.trim() || isGenerating} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
