'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

interface EditorSectionProps {
  title: string;
  description: string;
  content: string;
  onContentChange?: (newContent: string) => void;
  type: 'text' | 'textarea' | 'display';
}

export function EditorSection({
  title,
  description,
  content,
  onContentChange,
  type,
}: EditorSectionProps) {
  const [localContent, setLocalContent] = useState(content);

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const handleChange = (value: string) => {
    setLocalContent(value);
  };

  const handleBlur = () => {
    if (onContentChange && localContent !== content) {
      onContentChange(localContent);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {type === 'text' && (
          <Input
            value={localContent}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            className="font-mono text-sm"
          />
        )}
        {type === 'textarea' && (
          <Textarea
            value={localContent}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            rows={12}
            className="font-mono text-sm"
          />
        )}
        {type === 'display' && (
          <pre className="text-sm bg-muted p-4 rounded-md overflow-auto whitespace-pre-wrap">
            {content}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
