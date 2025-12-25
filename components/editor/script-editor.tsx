'use client';

import { useState, useEffect } from 'react';
import { EditorContent } from '@/types/script-chat';
import { HookSelector } from './hook-selector';
import { VisualTimeline } from './visual-timeline';
import { EditorSection } from './editor-section';
import { AddToContentButton } from './add-to-content-button';
import { PlatformMetadataEditor } from './platform-metadata-editor';
import { ThumbnailStrategyEditor } from './thumbnail-strategy-editor';
import { VisualDirectionEditor } from './visual-direction-editor';
import { Button } from '../ui/button';
import { Copy, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateItemContent } from '@/hooks/use-content-items';

interface ScriptEditorProps {
  content: EditorContent;
  sessionId: string;
  onContentChange: (content: EditorContent) => void;
  itemId?: string; // Optional: if provided, can save to content item
}

export function ScriptEditor({ content, sessionId, onContentChange, itemId }: ScriptEditorProps) {
  const [localContent, setLocalContent] = useState<EditorContent>(content);
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({});
  const updateItemContent = useUpdateItemContent();

  // Update local content when prop changes
  useEffect(() => {
    setLocalContent(content);
    setHasChanges({});
  }, [content]);

  const handleContentUpdate = (updates: Partial<EditorContent>, changeKey: string) => {
    const updated = { ...localContent, ...updates };
    setLocalContent(updated);
    setHasChanges((prev) => ({ ...prev, [changeKey]: true }));
    onContentChange(updated);
  };

  const handleSave = async (changeKey: string, saveFn: () => Promise<void> | void) => {
    try {
      await saveFn();
      setHasChanges((prev) => ({ ...prev, [changeKey]: false }));
    } catch (error) {
      console.error('Save error:', error);
      throw error;
    }
  };

  const handleSaveToItem = async (changeKey: string, contentUpdate: Partial<EditorContent>) => {
    if (!itemId) return;
    
    const itemContentUpdate: any = {};
    if (contentUpdate.fullScript !== undefined) {
      itemContentUpdate.script_content = contentUpdate.fullScript;
    }
    if (contentUpdate.goalAlignedCTA !== undefined) {
      itemContentUpdate.cta_suggestion = contentUpdate.goalAlignedCTA;
    }
    if (contentUpdate.platformMetadata?.captions !== undefined) {
      itemContentUpdate.caption = contentUpdate.platformMetadata.captions;
    }
    if (contentUpdate.platformMetadata?.hashtags !== undefined) {
      itemContentUpdate.hashtags = contentUpdate.platformMetadata.hashtags;
    }

    await updateItemContent.mutateAsync({
      itemId,
      content: itemContentUpdate,
    });
  };

  const handleHookSelect = (hookId: string) => {
    handleContentUpdate({ selectedHookId: hookId }, 'hook');
  };

  const handleScriptChange = (newScript: string) => {
    handleContentUpdate({ fullScript: newScript }, 'script');
  };

  const handleCTAChange = (newCTA: string) => {
    handleContentUpdate({ goalAlignedCTA: newCTA }, 'cta');
  };

  const handlePlatformMetadataChange = (metadata: typeof content.platformMetadata) => {
    handleContentUpdate({ platformMetadata: metadata }, 'platformMetadata');
  };

  const handleThumbnailStrategyChange = (strategy: typeof content.thumbnailStrategy) => {
    handleContentUpdate({ thumbnailStrategy: strategy }, 'thumbnailStrategy');
  };

  const handleVisualDirectionChange = (visualDirection: typeof content.visualDirection) => {
    handleContentUpdate({ visualDirection }, 'visualDirection');
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
        content={localContent.fullScript}
        onContentChange={handleScriptChange}
        onSave={itemId ? () => handleSave('script', () => handleSaveToItem('script', { fullScript: localContent.fullScript })) : undefined}
        hasChanges={hasChanges.script || false}
        isSaving={updateItemContent.isPending}
        type="textarea"
      />

      {
        content.visualDirection.length > 0 && (
          <EditorSection
            title="Visual Direction"
            description="Scene-by-scene breakdown with timing"
            content={
              <VisualDirectionEditor
                value={localContent.visualDirection}
                onChange={handleVisualDirectionChange}
              />
            }
            onSave={itemId ? () => handleSave('visualDirection', () => handleSaveToItem('visualDirection', { visualDirection: localContent.visualDirection })) : undefined}
            hasChanges={hasChanges.visualDirection || false}
            isSaving={updateItemContent.isPending}
            type="custom"
          />
        )
      }

      <EditorSection
        title="Call to Action"
        description="Goal-aligned CTA"
        content={localContent.goalAlignedCTA}
        onContentChange={handleCTAChange}
        onSave={itemId ? () => handleSave('cta', () => handleSaveToItem('cta', { goalAlignedCTA: localContent.goalAlignedCTA })) : undefined}
        hasChanges={hasChanges.cta || false}
        isSaving={updateItemContent.isPending}
        type="text"
      />

      {
        content.thumbnailStrategy.imagePrompt !== '' && (
          <EditorSection
            title="Thumbnail Strategy"
            description="Image prompt and text overlays"
            content={
              <ThumbnailStrategyEditor
                value={localContent.thumbnailStrategy}
                onChange={handleThumbnailStrategyChange}
              />
            }
            onSave={itemId ? () => handleSave('thumbnailStrategy', () => handleSaveToItem('thumbnailStrategy', { thumbnailStrategy: localContent.thumbnailStrategy })) : undefined}
            hasChanges={hasChanges.thumbnailStrategy || false}
            isSaving={updateItemContent.isPending}
            type="custom"
          />
        )
      }


      <EditorSection
        title="Platform Metadata"
        description="Caption, hashtags, and platform notes"
        content={
          <PlatformMetadataEditor
            value={localContent.platformMetadata}
            onChange={handlePlatformMetadataChange}
          />
        }
        onSave={itemId ? () => handleSave('platformMetadata', () => handleSaveToItem('platformMetadata', { platformMetadata: localContent.platformMetadata })) : undefined}
        hasChanges={hasChanges.platformMetadata || false}
        isSaving={updateItemContent.isPending}
        type="custom"
      />
      {content.estimatedDuration && (
        <div className="text-sm text-muted-foreground text-center py-4">
          Estimated Duration: {content.estimatedDuration}
        </div>
      )}
    </div>
  );
}
