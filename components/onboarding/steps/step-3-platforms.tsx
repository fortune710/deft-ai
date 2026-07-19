'use client';

import { motion } from 'framer-motion';
import { Check, Instagram, Linkedin, Music, Twitter, Youtube } from 'lucide-react';

import { OnboardingOptionRow, OnboardingStepCard, OnboardingStepFooter } from '@/components/onboarding/step-ui';
import { reducedStepTransition, reducedStepVariants, stepTransition, stepVariants } from '@/components/onboarding/motion';
import { useAuth } from '@/hooks/use-clerk-auth';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { PLATFORM_OPTIONS } from '@/lib/validations/onboarding/options';
import type { Platform } from '@/types/niche-mapping';

const log = logger.child({ module: 'components/onboarding/steps/step-3-platforms' });

const PLATFORM_ICONS = {
  tiktok: Music,
  instagram: Instagram,
  youtube_shorts: Youtube,
  twitter: Twitter,
  linkedin: Linkedin,
};

interface Step3PlatformsProps {
  value: Platform[];
  onChange: (value: Platform[]) => void;
  onBack: () => void;
  onNext: () => void;
  error?: string;
  direction: number;
  shouldReduceMotion: boolean;
}

export function Step3Platforms({ value, onChange, onBack, onNext, error, direction, shouldReduceMotion }: Step3PlatformsProps) {
  const { userId } = useAuth();
  const selectedPlatforms = value.map((platform) => platform.name);

  log.debug('Rendering platform selection step', {
    userId: userId || 'signed_out',
    action: 'render_onboarding_platform_step',
    selectedCount: selectedPlatforms.length,
  });

  const handlePlatformToggle = (platformValue: string) => {
    const exists = value.some((platform) => platform.name === platformValue);
    const nextValue = exists
      ? value.filter((platform) => platform.name !== platformValue)
      : [...value, { name: platformValue, isPrimary: value.length === 0 }];

    log.info('Toggled onboarding platform', {
      userId: userId || 'signed_out',
      action: 'toggle_onboarding_platform',
      platform: platformValue,
      selected: !exists,
    });
    onChange(nextValue);
  };

  const handlePrimaryChange = (platformValue: string) => {
    log.info('Changed primary onboarding platform', {
      userId: userId || 'signed_out',
      action: 'change_primary_onboarding_platform',
      platform: platformValue,
    });
    onChange(value.map((platform) => ({ ...platform, isPrimary: platform.name === platformValue })));
  };

  return (
    <motion.div custom={direction} variants={shouldReduceMotion ? reducedStepVariants : stepVariants} initial="enter" animate="center" exit="exit" transition={shouldReduceMotion ? reducedStepTransition : stepTransition} className="mx-auto mt-4 w-full max-w-xl">
      <OnboardingStepCard icon={Instagram} eyebrow="Platform presence" title="Where are you posting content first?" description="Select every platform you use, then choose the one that deserves your primary focus.">
        <div className="space-y-2">
          {PLATFORM_OPTIONS.map((option) => (
            <OnboardingOptionRow key={option.value} icon={PLATFORM_ICONS[option.value as keyof typeof PLATFORM_ICONS]} label={option.label} selected={selectedPlatforms.includes(option.value)} onClick={() => handlePlatformToggle(option.value)} />
          ))}
        </div>

        {value.length > 0 && (
          <div className="mt-6 border-t border-border/50 pt-5">
            <p className="mb-3 text-xs font-semibold tracking-[0.08em] text-muted-foreground">PRIMARY FOCUS</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Primary platform">
              {value.map((platform) => {
                const option = PLATFORM_OPTIONS.find((candidate) => candidate.value === platform.name);
                if (!option) return null;
                return (
                  <button
                    key={platform.name}
                    type="button"
                    aria-pressed={platform.isPrimary}
                    onClick={() => handlePrimaryChange(platform.name)}
                    className={cn(
                      'flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold outline-none transition-[background-color,border-color,color,box-shadow,transform] duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] motion-reduce:transform-none focus-visible:ring-3 focus-visible:ring-ring/40',
                      platform.isPrimary ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'border-border/70 bg-muted/50 text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {option.label}
                    {platform.isPrimary && <Check className="size-3.5" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <OnboardingStepFooter onBack={onBack} onNext={onNext} nextDisabled={value.length === 0} />
      </OnboardingStepCard>
      {error && <p role="alert" className="mt-4 text-center text-sm text-destructive">{error}</p>}
    </motion.div>
  );
}
