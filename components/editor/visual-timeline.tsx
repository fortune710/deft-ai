'use client';

import { VisualScene, EditorContent } from '@/types/script-chat';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Film, Type, ArrowRight } from 'lucide-react';

interface VisualTimelineProps {
  scenes: VisualScene[];
  content: EditorContent;
  onContentChange: (content: EditorContent) => void;
}

export function VisualTimeline({ scenes, content, onContentChange }: VisualTimelineProps) {
  
  if (scenes.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visual Direction</CardTitle>
        <CardDescription>Scene-by-scene breakdown with b-roll and text overlays</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {scenes.map((scene, index) => (
          <div key={index} className="relative">
            {index > 0 && (
              <div className="absolute -top-3 left-6 flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{scene.timeRange}</Badge>
                <h4 className="font-semibold text-sm">{scene.contentDescription}</h4>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Film className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground mb-1">B-Roll</p>
                    <ul className="text-sm space-y-1">
                      {scene.bRollSuggestions.map((broll, i) => (
                        <li key={i} className="text-muted-foreground">
                          • {broll}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Type className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground mb-1">On-Screen Text</p>
                    <div className="flex flex-wrap gap-1">
                      {scene.onScreenText.map((text, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {text}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {scene.transitionNotes && (
                  <p className="text-xs text-muted-foreground italic pl-6">
                    Transition: {scene.transitionNotes}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
