'use client';

import { useState, useEffect, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Copy, Save } from 'lucide-react';
import { toast } from 'sonner';

interface EditorSectionProps {
  title: string;
  description: string;
  content: string | ReactNode;
  onContentChange?: (newContent: string) => void;
  onSave?: () => void | Promise<void>;
  type: 'text' | 'textarea' | 'display' | 'custom';
  hasChanges?: boolean;
  isSaving?: boolean;
}

export function EditorSection({
  title,
  description,
  content,
  onContentChange,
  onSave,
  type,
  hasChanges = false,
  isSaving = false,
}: EditorSectionProps) {
  const [localContent, setLocalContent] = useState(typeof content === 'string' ? content : '');

  useEffect(() => {
    if (typeof content === 'string') {
      setLocalContent(content);
    }
  }, [content]);

  const handleChange = (value: string) => {
    setLocalContent(value);
  };

  const handleBlur = () => {
    if (onContentChange && typeof content === 'string' && localContent !== content) {
      onContentChange(localContent);
    }
  };

  const handleCopy = () => {
    if (typeof content === 'string') {
      navigator.clipboard.writeText(content);
      toast.success('Copied to clipboard');
    }
  };

  const handleSave = async () => {
    if (onSave) {
      try {
        await onSave();
        toast.success('Changes saved');
      } catch (error) {
        toast.error('Failed to save changes');
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex gap-2">
            {hasChanges && onSave && (
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            )}
            {typeof content === 'string' && (
              <Button variant="ghost" size="icon" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {type === 'text' && typeof content === 'string' && (
          <Input
            value={localContent}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            className="font-mono text-sm"
          />
        )}
        {type === 'textarea' && typeof content === 'string' && (
          <Textarea
            value={localContent}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            rows={12}
            className="font-mono text-sm"
          />
        )}
        {type === 'display' && typeof content === 'string' && (
          <pre className="text-sm bg-muted p-4 rounded-md overflow-auto whitespace-pre-wrap">
            {content}
          </pre>
        )}
        {type === 'custom' && content}
      </CardContent>
    </Card>
  );
}
