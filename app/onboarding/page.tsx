'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* Base Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />

        {/* Animated Glows */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.15, 0.25, 0.15],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.2, 0.1],
            x: [0, -40, 0],
            y: [0, 40, 0]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] bg-primary/15 rounded-full blur-[120px]"
        />

        {/* Mesh Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)]" />

        {/* Subtle Noise/Texture Overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      <div className="relative z-10 h-full min-h-screen flex flex-col pb-12">
        {/* <div className="text-center space-y-6 pt-16 px-6 max-w-5xl mx-auto w-full">
          <div className="flex justify-center">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 backdrop-blur-xl animate-pulse">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
              Discover Your Creator DNA
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
              Our AI reasoning engine will help you map out your unique niche and strategy.
            </p>
          </div>
        </div> */}

        {error && (
          <div className="max-w-5xl mx-auto w-full px-6 mt-12">
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
          </div>
        )}

        <div className="flex-1 w-full flex flex-col">
          <NicheMappingForm onComplete={handleComplete} />
        </div>
      </div>
    </div>
  );
}
