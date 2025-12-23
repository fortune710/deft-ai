'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Sparkles, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { NicheMappingForm } from '@/components/onboarding/niche-mapping-form';
import { saveContentProfile } from '@/app/actions/onboarding';
import { OnboardingFormData } from '@/types/niche-mapping';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { generateAIContextClient, buildSystemPrompt } from '@/lib/ai/gemini-client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function OnboardingPage() {
  const router = useRouter();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
     supabase.auth.getUser().then((user) => console.log(user))
  }, [])

  const handleComplete = async (data: OnboardingFormData) => {
    setIsGenerating(true);
    setError(null);

    try {
      console.log('Starting AI context generation...');
      const aiContext = await generateAIContextClient(data);
      console.log('AI context generated:', aiContext);

      console.log('Building system prompt...');
      const systemPrompt = buildSystemPrompt(data, aiContext);
      console.log('System prompt built');

      console.log('Saving content profile...');
      const result = await saveContentProfile(data, aiContext, systemPrompt);
      console.log('Save result:', result);

      if (result.success) {
        setIsSuccess(true);
        setTimeout(() => {
          router.push('/content-engine');
        }, 2000);
      } else {
        throw new Error(result.error || 'Failed to save profile');
      }
    } catch (error: any) {
      console.error('Error in handleComplete:', error);
      const errorMessage = error?.message || 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      setIsGenerating(false);
    }
  };

  const handleRetry = () => {
    setError(null);
  };

  if (isGenerating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center space-y-6 py-12">
            <div className="flex justify-center">
              <Loader2 className="w-16 h-16 animate-spin text-primary" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl">Generating Your Content Strategy</CardTitle>
              <CardDescription className="text-base">
                AI is analyzing your responses and creating a personalized content plan.
                This may take a moment...
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center space-y-6 py-12">
            <div className="flex justify-center">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl">Your Content Engine is Ready</CardTitle>
              <CardDescription className="text-base">
                We've analyzed your niche and created a personalized content strategy
                just for you.
              </CardDescription>
            </div>
            <p className="text-sm text-muted-foreground">Redirecting to Content Engine...</p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <Sparkles className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Let's Discover Your Content Identity
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Answer 5 quick questions to unlock a personalized content strategy
            powered by AI
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{error}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    className="ml-4"
                  >
                    Try Again
                  </Button>
                </div>
                <p className="text-xs opacity-80">
                  Check the browser console for more details. If the error persists, try restarting the dev server.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <NicheMappingForm onComplete={handleComplete} />
      </div>
    </div>
  );
}
