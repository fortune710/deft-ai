'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useContentProfile } from '@/hooks/use-content-profile';
import { updateAIContext } from '@/app/actions/onboarding';
import { generateAIContextClient, buildSystemPrompt } from '@/lib/ai/gemini-client';
import { OnboardingFormData } from '@/types/niche-mapping';
import {
  User,
  Target,
  Tv,
  TrendingUp,
  RefreshCw,
  Edit,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { profile, isLoading, refreshProfile } = useContentProfile();
  const { toast } = useToast();
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    if (!isLoading && !profile) {
      router.push('/onboarding');
    }
  }, [isLoading, profile, router]);

  const handleRegenerateAI = async () => {
    if (!profile) return;

    setIsRegenerating(true);
    try {
      const formData: OnboardingFormData = {
        question_1_niche: profile.question_1_niche || '',
        question_2_goal: profile.question_2_goal || '',
        question_3_platforms: profile.question_3_platforms || [],
        question_4_experience: profile.question_4_experience || '',
        question_5_frequency: profile.question_5_frequency || '',
      };

      const aiContext = await generateAIContextClient(formData);
      const systemPrompt = buildSystemPrompt(formData, aiContext);

      const result = await updateAIContext(aiContext, systemPrompt);

      if (result.success) {
        await refreshProfile();
        toast({
          title: 'AI Strategy Updated',
          description: 'Your content strategy has been regenerated successfully.',
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to regenerate AI strategy',
        variant: 'destructive',
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  if (isLoading) {
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

  const contentPillars = profile.ai_context?.content_pillars || [];
  const miniSeries = profile.ai_context?.mini_series_ideas || [];
  const referenceCreators = profile.ai_context?.reference_creators || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Content Profile</h1>
            <p className="text-muted-foreground">Your personalized content strategy</p>
          </div>
          <Button
            onClick={() => router.push('/onboarding')}
            variant="outline"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <CardTitle>Profile Overview</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Niche</div>
                  <div className="font-semibold">{profile.question_1_niche || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Primary Goal</div>
                  <div className="font-semibold capitalize">
                    {profile.question_2_goal?.replace(/_/g, ' ') || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Experience Level
                  </div>
                  <div className="font-semibold capitalize">
                    {profile.question_4_experience?.replace(/_/g, ' ') || 'N/A'}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Platforms</div>
                  <div className="flex flex-wrap gap-2">
                    {profile.question_3_platforms.map((platform) => (
                      <Badge
                        key={platform.name}
                        variant={platform.isPrimary ? 'default' : 'secondary'}
                      >
                        {platform.name}
                        {platform.isPrimary && ' (Primary)'}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Posting Frequency
                  </div>
                  <div className="font-semibold capitalize">
                    {profile.question_5_frequency?.replace(/_/g, ' ') || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <CardTitle>AI Content Strategy</CardTitle>
              </div>
              <Button
                onClick={handleRegenerateAI}
                disabled={isRegenerating}
                variant="outline"
                size="sm"
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Strategy
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {contentPillars.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4" />
                  <h3 className="font-semibold">Content Pillars</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {contentPillars.map((pillar, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 rounded-lg border">
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      <p className="text-sm">{pillar}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {miniSeries.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Tv className="w-4 h-4" />
                    <h3 className="font-semibold">Mini-Series Ideas</h3>
                  </div>
                  <div className="space-y-3">
                    {miniSeries.map((series, index) => (
                      <div key={index} className="p-3 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{series.title}</h4>
                          <Badge variant="outline">
                            {series.episode_count} episodes
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {series.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {referenceCreators.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4" />
                    <h3 className="font-semibold">Reference Creators</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {referenceCreators.map((creator, index) => (
                      <div key={index} className="p-3 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{creator.name}</h4>
                          <Badge variant="secondary">{creator.platform}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{creator.why}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
