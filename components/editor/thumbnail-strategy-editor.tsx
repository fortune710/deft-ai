'use client';

import { useState, useEffect } from 'react';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { X, Plus } from 'lucide-react';
import type { ThumbnailStrategy } from '@/types/script-chat';

interface ThumbnailStrategyEditorProps {
  value: ThumbnailStrategy;
  onChange: (value: ThumbnailStrategy) => void;
}

export function ThumbnailStrategyEditor({ value, onChange }: ThumbnailStrategyEditorProps) {
  const [localValue, setLocalValue] = useState<ThumbnailStrategy>(value);
  const [newOverlayText, setNewOverlayText] = useState('');

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleImagePromptChange = (prompt: string) => {
    const updated = { ...localValue, imagePrompt: prompt };
    setLocalValue(updated);
    onChange(updated);
  };

  const handleAddOverlayText = () => {
    if (newOverlayText.trim()) {
      const updated = {
        ...localValue,
        overlayTextOptions: [...(localValue.overlayTextOptions || []), newOverlayText.trim()],
      };
      setLocalValue(updated);
      onChange(updated);
      setNewOverlayText('');
    }
  };

  const handleRemoveOverlayText = (index: number) => {
    const updated = {
      ...localValue,
      overlayTextOptions: (localValue.overlayTextOptions || []).filter((_, i) => i !== index),
    };
    setLocalValue(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Image Prompt</Label>
        <Textarea
          value={localValue.imagePrompt || ''}
          onChange={(e) => handleImagePromptChange(e.target.value)}
          placeholder="Describe the thumbnail image you want to generate"
          rows={4}
          className="font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label>Overlay Text Options</Label>
        <div className="space-y-2">
          {(localValue.overlayTextOptions || []).map((text, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex-1 p-2 bg-muted rounded-md text-sm">{text}</div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveOverlayText(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newOverlayText}
            onChange={(e) => setNewOverlayText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddOverlayText();
              }
            }}
            placeholder="Add overlay text option"
            className="flex-1"
          />
          <Button type="button" onClick={handleAddOverlayText} size="icon" variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

