'use client';

import { useState, useEffect } from 'react';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { X, Plus } from 'lucide-react';
import type { PlatformMetadata } from '@/types/script-chat';

interface PlatformMetadataEditorProps {
  value: PlatformMetadata;
  onChange: (value: PlatformMetadata) => void;
}

export function PlatformMetadataEditor({ value, onChange }: PlatformMetadataEditorProps) {
  const [localValue, setLocalValue] = useState<PlatformMetadata>(value);
  const [newHashtag, setNewHashtag] = useState('');

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleCaptionChange = (caption: string) => {
    const updated = { ...localValue, captions: caption };
    setLocalValue(updated);
    onChange(updated);
  };

  const handleNotesChange = (notes: string) => {
    const updated = { ...localValue, platformSpecificNotes: notes };
    setLocalValue(updated);
    onChange(updated);
  };

  const handleAddHashtag = () => {
    if (newHashtag.trim()) {
      const hashtag = newHashtag.trim().startsWith('#') 
        ? newHashtag.trim().slice(1) 
        : newHashtag.trim();
      const updated = {
        ...localValue,
        hashtags: [...(localValue.hashtags || []), hashtag],
      };
      setLocalValue(updated);
      onChange(updated);
      setNewHashtag('');
    }
  };

  const handleRemoveHashtag = (index: number) => {
    const updated = {
      ...localValue,
      hashtags: (localValue.hashtags || []).filter((_, i) => i !== index),
    };
    setLocalValue(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Caption</Label>
        <Textarea
          value={localValue.captions || ''}
          onChange={(e) => handleCaptionChange(e.target.value)}
          placeholder="Platform caption"
          rows={4}
          className="font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label>Hashtags</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(localValue.hashtags || []).map((hashtag, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              #{hashtag}
              <button
                onClick={() => handleRemoveHashtag(index)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newHashtag}
            onChange={(e) => setNewHashtag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddHashtag();
              }
            }}
            placeholder="Add hashtag (without #)"
            className="flex-1"
          />
          <Button type="button" onClick={handleAddHashtag} size="icon" variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Platform Specific Notes</Label>
        <Textarea
          value={localValue.platformSpecificNotes || ''}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Platform-specific notes and recommendations"
          rows={3}
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
}

