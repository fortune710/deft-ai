'use client';

import { HookOption } from '@/types/script-chat';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface HookSelectorProps {
  hooks: HookOption[];
  selectedHookId: string | null;
  onSelect: (hookId: string) => void;
  sessionId: string;
}

export function HookSelector({ hooks, selectedHookId, onSelect, sessionId }: HookSelectorProps) {
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  const handleRegenerate = async (index: number) => {
    setRegeneratingIndex(index);
    try {
      const response = await fetch('/api/chat/regenerate-hook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hookIndex: index,
          currentHooks: hooks,
          guidance: 'Generate a new hook variation',
        }),
      });

      if (!response.ok) throw new Error('Failed to regenerate hook');

      const newHook = await response.json();
      toast.success('Hook regenerated');
    } catch (error) {
      toast.error('Failed to regenerate hook');
    } finally {
      setRegeneratingIndex(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Choose Your Hook</h3>
        <p className="text-sm text-muted-foreground">
          Select the hook that best captures attention
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {hooks.map((hook, index) => (
          <Card
            key={hook.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedHookId === hook.id
                ? 'ring-2 ring-primary border-primary'
                : 'hover:border-primary/50'
            }`}
            onClick={() => onSelect(hook.id)}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <Badge variant="secondary" className="text-xs">
                  {hook.psychologyType}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRegenerate(index);
                  }}
                  disabled={regeneratingIndex === index}
                >
                  <RefreshCw
                    className={`h-3 w-3 ${regeneratingIndex === index ? 'animate-spin' : ''}`}
                  />
                </Button>
              </div>
              <p className="text-sm font-medium leading-relaxed">{hook.text}</p>
              {selectedHookId === hook.id && (
                <Badge variant="default" className="w-full justify-center">
                  Selected
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
