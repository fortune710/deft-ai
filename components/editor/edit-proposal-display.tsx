'use client';

import { EditProposal } from '@/types/script-chat';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { logger } from '@/lib/logger';

interface EditProposalDisplayProps {
  proposals: EditProposal[];
  onViewInEditor?: (proposal: EditProposal) => void;
}

export function EditProposalDisplay({ proposals, onViewInEditor }: EditProposalDisplayProps) {

  return (
    <div className="space-y-3">
      {proposals.map((proposal, index) => (
        <Card key={index} className="bg-background/50 border-border/50 hover:border-primary/30 transition-colors group">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-primary/5 text-primary border-primary/20 font-bold">
                {proposal.section}
              </Badge>
              {onViewInEditor && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary hover:bg-primary/10 rounded-full px-3"
                  onClick={() => onViewInEditor(proposal)}
                >
                  View in Editor
                </Button>
              )}
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-2">
              {proposal.description}
            </div>
            <div className="space-y-1">
              <div className="text-xs">
                <span className="text-destructive font-medium">- </span>
                <span className="line-through opacity-70">{proposal.before}</span>
              </div>
              <div className="text-xs">
                <span className="text-green-600 font-medium">+ </span>
                <span>{proposal.after}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
