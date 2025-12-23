'use client';

import { MessageType } from '@/types/script-chat';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { MessageSquare, Edit3 } from 'lucide-react';

interface ModeSelectorProps {
  mode: MessageType;
  onModeChange: (mode: MessageType) => void;
}

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  return (
    <Tabs value={mode} onValueChange={(value) => onModeChange(value as MessageType)} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="ask" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Ask
        </TabsTrigger>
        <TabsTrigger value="edit" className="flex items-center gap-2">
          <Edit3 className="h-4 w-4" />
          Edit
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
