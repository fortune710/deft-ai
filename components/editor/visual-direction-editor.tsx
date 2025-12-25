'use client';

import { useState, useEffect } from 'react';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { X, Plus } from 'lucide-react';
import type { VisualScene } from '@/types/script-chat';

interface VisualDirectionEditorProps {
  value: VisualScene[];
  onChange: (value: VisualScene[]) => void;
}

export function VisualDirectionEditor({ value, onChange }: VisualDirectionEditorProps) {
  const [localValue, setLocalValue] = useState<VisualScene[]>(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSceneChange = (index: number, field: keyof VisualScene, fieldValue: any) => {
    const updated = [...localValue];
    updated[index] = { ...updated[index], [field]: fieldValue };
    setLocalValue(updated);
    onChange(updated);
  };

  const handleAddBroll = (sceneIndex: number, broll: string) => {
    const updated = [...localValue];
    updated[sceneIndex] = {
      ...updated[sceneIndex],
      bRollSuggestions: [...(updated[sceneIndex].bRollSuggestions || []), broll],
    };
    setLocalValue(updated);
    onChange(updated);
  };

  const handleRemoveBroll = (sceneIndex: number, brollIndex: number) => {
    const updated = [...localValue];
    updated[sceneIndex] = {
      ...updated[sceneIndex],
      bRollSuggestions: (updated[sceneIndex].bRollSuggestions || []).filter(
        (_, i) => i !== brollIndex
      ),
    };
    setLocalValue(updated);
    onChange(updated);
  };

  const handleAddOnScreenText = (sceneIndex: number, text: string) => {
    const updated = [...localValue];
    updated[sceneIndex] = {
      ...updated[sceneIndex],
      onScreenText: [...(updated[sceneIndex].onScreenText || []), text],
    };
    setLocalValue(updated);
    onChange(updated);
  };

  const handleRemoveOnScreenText = (sceneIndex: number, textIndex: number) => {
    const updated = [...localValue];
    updated[sceneIndex] = {
      ...updated[sceneIndex],
      onScreenText: (updated[sceneIndex].onScreenText || []).filter((_, i) => i !== textIndex),
    };
    setLocalValue(updated);
    onChange(updated);
  };

  if (value.length === 0) return null;  

  return (
    <div className="space-y-4">
      {localValue.map((scene, sceneIndex) => (
        <div key={sceneIndex} className="border rounded-lg p-4 space-y-3">
          <div className="space-y-2">
            <Label>Time Range</Label>
            <Input
              value={scene.timeRange || ''}
              onChange={(e) => handleSceneChange(sceneIndex, 'timeRange', e.target.value)}
              placeholder="e.g., 0:00-0:15"
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Content Description</Label>
            <Textarea
              value={scene.contentDescription || ''}
              onChange={(e) => handleSceneChange(sceneIndex, 'contentDescription', e.target.value)}
              placeholder="Describe what happens in this scene"
              rows={3}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>B-Roll Suggestions</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(scene.bRollSuggestions || []).map((broll, brollIndex) => (
                <Badge key={brollIndex} variant="secondary" className="flex items-center gap-1">
                  {broll}
                  <button
                    onClick={() => handleRemoveBroll(sceneIndex, brollIndex)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Add B-roll suggestion"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  e.preventDefault();
                  handleAddBroll(sceneIndex, e.currentTarget.value.trim());
                  e.currentTarget.value = '';
                }
              }}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>On-Screen Text</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(scene.onScreenText || []).map((text, textIndex) => (
                <Badge key={textIndex} variant="outline" className="flex items-center gap-1">
                  {text}
                  <button
                    onClick={() => handleRemoveOnScreenText(sceneIndex, textIndex)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Add on-screen text"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  e.preventDefault();
                  handleAddOnScreenText(sceneIndex, e.currentTarget.value.trim());
                  e.currentTarget.value = '';
                }
              }}
              className="text-sm"
            />
          </div>

          {scene.transitionNotes && (
            <div className="space-y-2">
              <Label>Transition Notes</Label>
              <Textarea
                value={scene.transitionNotes || ''}
                onChange={(e) => handleSceneChange(sceneIndex, 'transitionNotes', e.target.value)}
                placeholder="Notes about transitions"
                rows={2}
                className="font-mono text-sm"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

