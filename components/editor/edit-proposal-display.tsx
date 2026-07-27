'use client';

import { ChangeStatus, EditProposal } from '@/types/script-chat';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { logger } from '@/lib/logger';

const log = logger.child({ file: 'components/editor/edit-proposal-display.tsx' });

interface EditProposalDisplayProps {
  proposals: EditProposal[];
  onViewInEditor?: (proposal: EditProposal) => void;
  onAccept?: (proposal: EditProposal, index: number) => void;
  onReject?: (proposal: EditProposal, index: number) => void;
  fallbackStatus?: ChangeStatus;
  resolvingIndex?: number | null;
}

export function EditProposalDisplay({
  proposals,
  onViewInEditor,
  onAccept,
  onReject,
  fallbackStatus = 'pending',
  resolvingIndex = null,
}: EditProposalDisplayProps) {
  log.debug('Rendering independently resolvable edit proposals', {
    userId: 'unknown',
    action: 'render_individual_edit_proposals',
    proposalCount: proposals.length,
    pendingProposalCount: proposals.filter(
      (proposal) => (proposal.status ?? fallbackStatus) === 'pending',
    ).length,
  });

  return (
    <div className="space-y-3">
      {proposals.map((proposal, index) => {
        const status = proposal.status ?? fallbackStatus;
        const isResolving = resolvingIndex === index;
        return (
        <Card key={index} className="bg-background/50 border-border/50 hover:border-primary/30 transition-colors group">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider bg-primary/5 text-primary border-primary/20 font-bold">
                {proposal.section}
              </Badge>
              {status === 'accepted' ? (
                <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-[10px] text-green-600">
                  Applied
                </Badge>
              ) : status === 'rejected' ? (
                <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-[10px] text-destructive">
                  Rejected
                </Badge>
              ) : onViewInEditor ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary hover:bg-primary/10 rounded-full px-3"
                  onClick={() => onViewInEditor(proposal)}
                >
                  View in Editor
                </Button>
              ) : null}
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
            {status === 'pending' && (onAccept || onReject) && (
              <div className="flex gap-2 border-t border-border/40 pt-2">
                {onAccept && (
                  <Button
                    size="sm"
                    className="h-7 flex-1 rounded-md text-xs"
                    disabled={isResolving}
                    onClick={() => onAccept(proposal, index)}
                  >
                    Accept
                  </Button>
                )}
                {onReject && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 flex-1 rounded-md text-xs"
                    disabled={isResolving}
                    onClick={() => onReject(proposal, index)}
                  >
                    Reject
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        );
      })}
    </div>
  );
}
