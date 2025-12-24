'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, addDays } from 'date-fns';
import { Calendar as CalendarIcon, Sparkles, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { createContentPlanSchema } from '@/lib/validations/content-engine';
import { useCreatePlan } from '@/hooks/use-content-plans';
import { useBatchCreateContentItems } from '@/hooks/use-content-items';
import { useGenerateContentPlan } from '@/hooks/use-generate-content-plan';
import { useContentProfile } from '@/hooks/use-content-profile';
import { toast } from 'sonner';
import type { Platform } from '@/types/content-engine';
import { z } from 'zod';

interface GeneratePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (planId: string) => void;
}

const platformOptions: { value: Platform; label: string }[] = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'twitter', label: 'Twitter' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
];

type FormData = z.infer<typeof createContentPlanSchema>;

export function GeneratePlanDialog({ open, onOpenChange, onSuccess }: GeneratePlanDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [progressDetails, setProgressDetails] = useState('');
  const [currentAgent, setCurrentAgent] = useState('');

  const { profile } = useContentProfile();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(createContentPlanSchema),
    defaultValues: {
      title: `Content Plan - ${format(new Date(), 'MMMM yyyy')}`,
      start_date: new Date(),
      platforms: profile?.question_3_platforms?.map((p: any) => p.name as Platform) || [],
    },
  });

  const selectedDate = watch('start_date');
  const selectedPlatforms = watch('platforms') || [];

  const handlePlatformToggle = (platform: Platform) => {
    const current = selectedPlatforms;
    const updated = current.includes(platform)
      ? current.filter((p) => p !== platform)
      : [...current, platform];
    setValue('platforms', updated);
  };

  const formatFrequency = (frequency: string): string => {
    const frequencyMap: Record<string, string> = {
      '1_2_per_week': '1-2 times per week',
      '3_4_per_week': '3-4 times per week',
      'daily': 'Daily',
      'not_sure': 'Not sure yet',
    };
    return frequencyMap[frequency] || frequency.replace(/_/g, ' ');
  };

  const onSubmit = async (data: FormData) => {
    if (!profile) {
      toast.error('Please complete onboarding first');
      return;
    }

    if (!data.platforms || data.platforms.length === 0) {
      toast.error('Please select at least one platform');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setProgressMessage('Starting content generation');
    setProgressDetails('');
    setCurrentAgent('Orchestrator');

    try {
      const response = await fetch('/api/content/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planName: data.title || `Content Plan - ${format(data.start_date, 'MMMM yyyy')}`,
          platforms: data.platforms,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start content generation');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream available');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.error) {
              throw new Error(data.message);
            }

            setProgress(data.progress);
            setProgressMessage(data.message);
            setProgressDetails(data.details || '');
            if (data.agent) {
              setCurrentAgent(data.agent);
            }

            if (data.phase === 'complete' && data.contentPlan) {
              toast.success('Content plan created successfully!');
              onOpenChange(false);
              onSuccess(data.contentPlan.id);
              return;
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error generating plan:', error);
      toast.error(error?.message || 'Failed to generate content plan');
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setProgressMessage('');
      setProgressDetails('');
      setCurrentAgent('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Generate 30-Day Content Plan
          </DialogTitle>
          <DialogDescription>
            AI will create a complete 30-day content calendar based on your profile and preferences.
          </DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          <div className="space-y-4 py-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            </div>
            <div className="text-center space-y-3">
              {currentAgent && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full text-sm font-medium text-blue-700 dark:text-blue-300">
                  <Sparkles className="h-4 w-4" />
                  {currentAgent}
                </div>
              )}
              <p className="font-semibold text-lg">{progressMessage}</p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{Math.round(progress)}%</span>
                <span>Step {Math.ceil(progress / 33)} of 3</span>
              </div>
              {progressDetails && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {progressDetails}
                </p>
              )}
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left space-y-2">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">What's happening:</p>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <p className={progress >= 0 && progress < 45 ? 'font-semibold text-blue-600' : ''}>
                    ✓ Agent 1: Generating 200+ scroll-stopping ideas
                  </p>
                  <p className={progress >= 45 && progress < 65 ? 'font-semibold text-blue-600' : ''}>
                    {progress >= 45 ? '✓' : '○'} Agent 2: Scoring and selecting best 30
                  </p>
                  <p className={progress >= 65 && progress < 95 ? 'font-semibold text-blue-600' : ''}>
                    {progress >= 65 ? '✓' : '○'} Agent 3: Creating platform-specific content
                  </p>
                  <p className={progress >= 95 ? 'font-semibold text-blue-600' : ''}>
                    {progress >= 95 ? '✓' : '○'} Saving to your content calendar
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Plan Title (Optional)</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder={`Content Plan - ${format(new Date(), 'MMMM yyyy')}`}
              />
              {errors.title && (
                <p className="text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setValue('start_date', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.start_date && (
                <p className="text-sm text-red-600">{errors.start_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Select Platforms</Label>
              <div className="grid grid-cols-2 gap-3">
                {platformOptions.map((platform) => (
                  <div key={platform.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={platform.value}
                      checked={selectedPlatforms.includes(platform.value)}
                      onCheckedChange={() => handlePlatformToggle(platform.value)}
                    />
                    <Label
                      htmlFor={platform.value}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {platform.label}
                    </Label>
                  </div>
                ))}
              </div>
              {errors.platforms && (
                <p className="text-sm text-red-600">{errors.platforms.message}</p>
              )}
            </div>

            {selectedPlatforms.length > 0 && profile?.question_5_frequency && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-2">
                <p className="text-sm font-semibold">Plan Preview</p>
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <p>
                    Duration: <strong>30 days</strong>
                  </p>
                  <p>
                    Platforms: <strong>{selectedPlatforms.length}</strong>
                  </p>
                  <p>
                    Posting Frequency: <strong>{formatFrequency(profile.question_5_frequency)}</strong>
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={selectedPlatforms.length === 0}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Plan
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
