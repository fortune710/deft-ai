'use client';

import { EditProposal } from '@/types/script-chat';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

interface EditProposalDisplayProps {
  proposals: EditProposal[];
}

export function EditProposalDisplay({ proposals }: EditProposalDisplayProps) {
  return (
    <div className="space-y-2">
      {proposals.map((proposal, index) => (
        <Card key={index} className="bg-background/50">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {proposal.section}
              </Badge>
              <span className="text-xs text-muted-foreground">{proposal.description}</span>
            </div>
            <div className="space-y-1">
              <div className="text-xs">
                <span className="text-destructive font-medium">- </span>
                <span className="line-through opacity-70">{proposal.before.substring(0, 100)}...</span>
              </div>
              <div className="text-xs">
                <span className="text-green-600 font-medium">+ </span>
                <span>{proposal.after.substring(0, 100)}...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
