'use client';

import { EditorContent } from '@/types/script-chat';
import { HookSelector } from './hook-selector';
import { VisualTimeline } from './visual-timeline';
import { EditorSection } from './editor-section';
import { AddToContentButton } from './add-to-content-button';
import { Button } from '../ui/button';
import { Copy, FileDown } from 'lucide-react';
import { toast } from 'sonner';

interface ScriptEditorProps {
  content: EditorContent;
  sessionId: string;
  onContentChange: (content: EditorContent) => void;
}

export function ScriptEditor({ content, sessionId, onContentChange }: ScriptEditorProps) {
  const handleHookSelect = (hookId: string) => {
    onContentChange({
      ...content,
      selectedHookId: hookId,
    });
  };

  const handleScriptChange = (newScript: string) => {
    onContentChange({
      ...content,
      fullScript: newScript,
    });
  };

  const handleCTAChange = (newCTA: string) => {
    onContentChange({
      ...content,
      goalAlignedCTA: newCTA,
    });
  };

  const handleCopyAll = () => {
    const selectedHook = content.hookOptions.find((h) => h.id === content.selectedHookId);
    const fullText = `HOOK:\n${selectedHook?.text || ''}\n\nSCRIPT:\n${content.fullScript}\n\nCTA:\n${content.goalAlignedCTA}`;
    navigator.clipboard.writeText(fullText);
    toast.success('Script copied to clipboard');
  };

  const handleExport = () => {
    const selectedHook = content.hookOptions.find((h) => h.id === content.selectedHookId);
    const exportData = {
      hook: selectedHook,
      script: content.fullScript,
      visualDirection: content.visualDirection,
      cta: content.goalAlignedCTA,
      thumbnail: content.thumbnailStrategy,
      metadata: content.platformMetadata,
      duration: content.estimatedDuration,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `script-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Script exported');
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Script Editor</h2>
          <p className="text-sm text-muted-foreground">
            Edit your script and visual direction
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyAll}>
            <Copy className="h-4 w-4 mr-2" />
            Copy All
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
          <AddToContentButton sessionId={sessionId} content={content} />
        </div>
      </div>

      <HookSelector
        hooks={content.hookOptions}
        selectedHookId={content.selectedHookId}
        onSelect={handleHookSelect}
        sessionId={sessionId}
      />

      <EditorSection
        title="Full Script"
        description="30-60 second script with timing"
        content={content.fullScript}
        onContentChange={handleScriptChange}
        type="textarea"
      />

      <VisualTimeline scenes={content.visualDirection} content={content} onContentChange={onContentChange} />

      <EditorSection
        title="Call to Action"
        description="Goal-aligned CTA"
        content={content.goalAlignedCTA}
        onContentChange={handleCTAChange}
        type="text"
      />

      <EditorSection
        title="Thumbnail Strategy"
        description="Image prompt and text overlays"
        content={JSON.stringify(content.thumbnailStrategy, null, 2)}
        type="display"
      />

      <EditorSection
        title="Platform Metadata"
        description="Caption, hashtags, and platform notes"
        content={JSON.stringify(content.platformMetadata, null, 2)}
        type="display"
      />

      <div className="text-sm text-muted-foreground text-center py-4">
        Estimated Duration: {content.estimatedDuration}
      </div>
    </div>
  );
}
