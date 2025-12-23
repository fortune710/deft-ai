'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateContentItem } from '@/hooks/use-content-items';
import { toast } from 'sonner';
import type { ContentItem, Platform } from '@/types/content-engine';

interface ContentItemDialogProps {
  item: ContentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const platformLabels: Record<Platform, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  twitter: 'Twitter',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
};

export function ContentItemDialog({ item, open, onOpenChange }: ContentItemDialogProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  const updateItem = useUpdateContentItem();

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
    toast.success('Copied to clipboard');
  };

  const handleSaveBasicInfo = () => {
    if (!editedTitle && !editedDescription) return;

    const updates: any = {};
    if (editedTitle) updates.title = editedTitle;
    if (editedDescription) updates.description = editedDescription;

    updateItem.mutate(
      { itemId: item.id, updates },
      {
        onSuccess: () => {
          toast.success('Content updated');
          setEditedTitle('');
          setEditedDescription('');
        },
        onError: () => {
          toast.error('Failed to update content');
        },
      }
    );
  };

  const CopyButton = ({ section, text }: { section: string; text: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleCopy(text, section)}
      className="ml-auto"
    >
      {copiedSection === section ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );

  return (
    <Dialog open={open && !!item} onOpenChange={onOpenChange}>
      {item && (
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-xl mb-2">{item.title}</DialogTitle>
                <div className="flex items-center gap-2">
                  <Badge>{platformLabels[item.platform]}</Badge>
                  <span className="text-sm text-gray-500">
                    {format(new Date(item.scheduled_date), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editedTitle || item.title}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Content title"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editedDescription || item.description || ''}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Content description"
                rows={2}
              />
            </div>

            {(editedTitle || editedDescription) && (
              <Button onClick={handleSaveBasicInfo} disabled={updateItem.isPending}>
                Save Changes
              </Button>
            )}
          </div>

          <Tabs defaultValue="hook" className="mt-6">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="hook">Hook</TabsTrigger>
              <TabsTrigger value="script">Script</TabsTrigger>
              <TabsTrigger value="cta">CTA</TabsTrigger>
              <TabsTrigger value="hashtags">Hashtags</TabsTrigger>
              <TabsTrigger value="clips">Clips</TabsTrigger>
              <TabsTrigger value="caption">Caption</TabsTrigger>
            </TabsList>

            <TabsContent value="hook" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Opening Hook</h3>
                <CopyButton
                  section="hook"
                  text={item.content.hook_suggestion || ''}
                />
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {item.content.hook_suggestion || 'No hook generated yet.'}
              </p>
            </TabsContent>

            <TabsContent value="script" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Full Script</h3>
                <CopyButton
                  section="script"
                  text={item.content.script_content || ''}
                />
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {item.content.script_content || 'No script generated yet.'}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="cta" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Call-to-Action</h3>
                <CopyButton section="cta" text={item.content.cta_suggestion || ''} />
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {item.content.cta_suggestion || 'No CTA generated yet.'}
              </p>
            </TabsContent>

            <TabsContent value="hashtags" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Hashtags</h3>
                <CopyButton
                  section="hashtags"
                  text={(item.content.hashtags || []).map((h) => `#${h}`).join(' ')}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(item.content.hashtags || []).map((hashtag, index) => (
                  <Badge key={index} variant="secondary">
                    #{hashtag}
                  </Badge>
                ))}
                {(!item.content.hashtags || item.content.hashtags.length === 0) && (
                  <p className="text-sm text-gray-500">No hashtags generated yet.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="clips" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">B-Roll & Clip Suggestions</h3>
                <CopyButton
                  section="clips"
                  text={(item.content.clip_suggestions || []).join('\n')}
                />
              </div>
              <ul className="space-y-2">
                {(item.content.clip_suggestions || []).map((clip, index) => (
                  <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                    <span className="mr-2 text-gray-400">{index + 1}.</span>
                    <span>{clip}</span>
                  </li>
                ))}
                {(!item.content.clip_suggestions || item.content.clip_suggestions.length === 0) && (
                  <p className="text-sm text-gray-500">No clip suggestions generated yet.</p>
                )}
              </ul>
            </TabsContent>

            <TabsContent value="caption" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Platform Caption</h3>
                <CopyButton section="caption" text={item.content.caption || ''} />
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {item.content.caption || 'No caption generated yet.'}
              </p>
            </TabsContent>
          </Tabs>
        </DialogContent>
      )}
    </Dialog>
  );
}
