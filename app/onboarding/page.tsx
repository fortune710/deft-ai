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
  const [error, setError] = useState<string | null>(null);


  const handleComplete = async (data: OnboardingFormData) => {
    setError(null);

    try {
      console.log('Saving content profile...');
      const result = await saveContentProfile(data);
      console.log('Save result:', result);

      if (result.success) {
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
    }
  };

  const handleRetry = () => {
    setError(null);
  };


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
