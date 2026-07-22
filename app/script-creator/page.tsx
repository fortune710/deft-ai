'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Loader2,
  FileText,
  Trash2,
  Clock,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { useContentProfile } from '@/hooks/use-content-profile';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useChatSessions, useCreateSession, useDeleteSession } from '@/hooks/use-script-chats';
import type { EditorContent } from '@/types/script-chat';
import { FilmScriptFill } from '@/components/icons/script';
import { logger } from '@/lib/logger';
import { useAuth } from '@/hooks/use-clerk-auth';

const log = logger.child({ file: 'app/script-creator/page.tsx' });

const primaryCtaClassName =
  'h-11 rounded-xl border border-primary/70 bg-gradient-to-b from-primary/80 to-primary px-6 font-semibold shadow-[0_2px_6px_hsl(var(--primary)/0.12)] transition-[background-image,box-shadow,transform] hover:from-primary/90 hover:to-primary/90 hover:shadow-[0_3px_8px_hsl(var(--primary)/0.16)] active:translate-y-px motion-reduce:transform-none';

export default function ScriptCreatorPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const { profile, isLoading: profileLoading } = useContentProfile();
  const { data: sessions, isLoading: sessionsLoading } = useChatSessions();
  const createSession = useCreateSession();
  const deleteSession = useDeleteSession();

  const [showNewScriptDialog, setShowNewScriptDialog] = useState(false);
  const [newScriptPrompt, setNewScriptPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const primaryPlatform = profile?.question_3_platforms?.find((p) => p.isPrimary);

  log.debug('Rendering script creator page', {
    action: 'render_script_creator_page',
    userId: userId || 'signed_out',
    sessionCount: sessions?.length || 0,
    isGenerating,
  });

  useEffect(() => {
    if (!profileLoading && !profile) {
      router.push('/onboarding');
    }
  }, [profileLoading, profile, router]);

  const handleCreateScript = async () => {
    if (!newScriptPrompt.trim()) return;

    log.info('Starting script generation', {
      action: 'generate_script',
      userId: userId || 'signed_out',
      platform: primaryPlatform?.name || 'youtube',
      promptLength: newScriptPrompt.trim().length,
    });
    setIsGenerating(true);

    try {
      const response = await fetch('/api/chat/generate-initial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: newScriptPrompt,
          platform: primaryPlatform?.name || 'youtube',
        }),
      });

      if (!response.ok) {
        log.error('Script generation request failed', {
          action: 'generate_script',
          userId: userId || 'signed_out',
          statusCode: response.status,
          error: response.statusText || 'Failed to generate script',
        });
        throw new Error('Failed to generate script');
      }

      const generatedContent = await response.json();

      const editorContent: EditorContent = {
        hookOptions: generatedContent.hookOptions,
        selectedHookId: generatedContent.selectedHook || generatedContent.hookOptions[0]?.id,
        fullScript: generatedContent.fullScript,
        visualDirection: generatedContent.visualDirection,
        platformMetadata: generatedContent.platformMetadata,
        thumbnailStrategy: generatedContent.thumbnailStrategy,
        goalAlignedCTA: generatedContent.goalAlignedCTA,
        estimatedDuration: generatedContent.estimatedDuration,
        platform: primaryPlatform?.name,
      };

      const title = newScriptPrompt.length > 50
        ? newScriptPrompt.substring(0, 50) + '...'
        : newScriptPrompt;

      const session = await createSession.mutateAsync({
        title,
        editorContent,
      });

      toast.success('Script generated');
      log.info('Script generated successfully', {
        action: 'generate_script',
        userId: userId || 'signed_out',
        statusCode: response.status,
        sessionId: session.id,
      });
      router.push(`/script-creator/editor/${session.id}`);
    } catch (error) {
      log.error('Failed to generate script', {
        action: 'generate_script',
        userId: userId || 'signed_out',
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error('Failed to generate script');
    } finally {
      setIsGenerating(false);
      setShowNewScriptDialog(false);
      setNewScriptPrompt('');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    log.info('Deleting script session', {
      action: 'delete_script_session',
      userId: userId || 'signed_out',
      sessionId,
    });
    try {
      await deleteSession.mutateAsync(sessionId);
      toast.success('Script deleted');
      log.info('Script session deleted', {
        action: 'delete_script_session',
        userId: userId || 'signed_out',
        sessionId,
      });
    } catch (error) {
      log.error('Failed to delete script session', {
        action: 'delete_script_session',
        userId: userId || 'signed_out',
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error('Failed to delete script');
    }
  };

  if (profileLoading || sessionsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[500px]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!profile || !profile.completed_at) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text font-alan-sans text-4xl font-bold tracking-tight text-transparent">
              Script Creator
            </h1>
            <p className="font-inter text-lg text-muted-foreground">
              Create and edit AI-powered video scripts
            </p>
          </div>
          <Button
            onClick={() => setShowNewScriptDialog(true)}
            size="lg"
            className={primaryCtaClassName}
          >
            New Script
          </Button>
        </div>

        {!sessions || sessions.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center py-12 text-center">
            <FilmScriptFill className="mb-5 h-12 w-12 text-primary" aria-hidden="true" />
            <h2 className="text-2xl font-bold">Create Your First Script</h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              Turn your next idea into a ready-to-record script with scroll-stopping hooks,
              clear visual direction, and a CTA built to convert.
            </p>
            <Button
              onClick={() => setShowNewScriptDialog(true)}
              size="lg"
              className={`${primaryCtaClassName} mt-6`}
            >
              Create Script
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => {
              const selectedHook = session.editor_content.hookOptions?.find(
                (h) => h.id === session.editor_content.selectedHookId
              );
              return (
                <Card
                  key={session.id}
                  className="cursor-pointer hover:shadow-md transition-shadow group"
                  onClick={() => router.push(`/script-creator/editor/${session.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <CardTitle className="line-clamp-2 mt-2">{session.title}</CardTitle>
                    {selectedHook && (
                      <CardDescription className="line-clamp-2">{selectedHook.text}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {session.editor_content.estimatedDuration || '30-60s'}
                      </div>
                      {session.editor_content.platform && (
                        <Badge variant="secondary" className="text-xs">
                          {session.editor_content.platform}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Updated {new Date(session.updated_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={showNewScriptDialog} onOpenChange={setShowNewScriptDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Script</DialogTitle>
              <DialogDescription>
                Describe your video idea and we&apos;ll generate a complete script instantly
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="e.g., 5 productivity hacks for busy entrepreneurs"
                value={newScriptPrompt}
                onChange={(e) => setNewScriptPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCreateScript();
                  }
                }}
                autoFocus
              />
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  Be specific about your topic. The AI will generate 3 hook options, a full script,
                  visual direction, and more.
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowNewScriptDialog(false)}
                  disabled={isGenerating}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateScript} disabled={!newScriptPrompt.trim() || isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Script
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
