'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { EditorContent } from '@/types/script-chat';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ContentEngineTracking } from '@/lib/posthog/track';
import { useCreateContentItem } from '@/hooks/use-content-items';
import { useAuth } from '@/hooks/use-clerk-auth';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'components/editor/add-to-content-button' });

interface AddToContentButtonProps {
  sessionId: string;
  content: EditorContent;
}

export function AddToContentButton({ sessionId, content }: AddToContentButtonProps) {
  const router = useRouter();
  const createContentItem = useCreateContentItem();
  const { userId } = useAuth();

  log.debug('Rendering add-to-content button', {
    userId: userId || 'signed_out',
    action: 'render_add_to_content_button',
    sessionId,
  });

  const [showDialog, setShowDialog] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(content.platform || 'youtube');
  const [selectedStatus, setSelectedStatus] = useState<'idea' | 'in_progress' | 'ready'>('ready');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!content.selectedHookId) {
      toast.error('Please select a hook first');
      return;
    }

    const selectedHook = content.hookOptions.find((h) => h.id === content.selectedHookId);
    if (!selectedHook) {
      toast.error('Selected hook not found');
      return;
    }

    setIsAdding(true);

    try {
      const createdItem = await createContentItem.mutateAsync({
        title: selectedHook.text,
        description: content.fullScript.substring(0, 200),
        platform: selectedPlatform as any,
        scheduled_date: new Date().toISOString(),
        status: selectedStatus,
        content: {
          hook_suggestion: selectedHook.text,
          script_content: content.fullScript,
          cta_suggestion: content.goalAlignedCTA,
          hashtags: content.platformMetadata?.hashtags || [],
        },
      });

      // Track content item creation
      ContentEngineTracking.contentItemCreated({
        itemId: createdItem.id,
        platform: selectedPlatform,
        status: selectedStatus,
      });

      toast.success('Added to Content Ideas');
      setShowDialog(false);
      router.push('/content-engine');
    } catch (error) {
      log.error('Failed to add script to content ideas', {
        userId: userId || 'signed_out',
        action: 'create_content_item',
        error,
        message: error instanceof Error ? error.message : String(error),
      });
      toast.error('Failed to add to content ideas');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <Button onClick={() => setShowDialog(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add to Content Ideas
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Content Ideas</DialogTitle>
            <DialogDescription>
              Add this script to your idea list
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={(v: any) => setSelectedStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea">Idea</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDialog(false)} disabled={isAdding}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={isAdding}>
                {isAdding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
