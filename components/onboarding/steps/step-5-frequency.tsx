'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Calendar, CalendarDays, Clock, HelpCircle, Loader2, Zap } from 'lucide-react';

import { OnboardingOptionRow, OnboardingStepCard, OnboardingStepFooter } from '@/components/onboarding/step-ui';
import { reducedStepTransition, reducedStepVariants, stepTransition, stepVariants } from '@/components/onboarding/motion';
import { useAuth } from '@/hooks/use-clerk-auth';
import { logger } from '@/lib/logger';
import { FREQUENCY_OPTIONS } from '@/lib/validations/onboarding/options';

const log = logger.child({ module: 'components/onboarding/steps/step-5-frequency' });

interface Step5FrequencyProps {
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  isSubmitting?: boolean;
  error?: string;
  direction: number;
  shouldReduceMotion: boolean;
}

const FREQUENCY_ICONS = {
  '1_2_per_week': Calendar,
  '3_4_per_week': CalendarDays,
  daily: Zap,
  not_sure: HelpCircle,
};

export function Step5Frequency({ value, onChange, onBack, onNext, isSubmitting, error, direction, shouldReduceMotion }: Step5FrequencyProps) {
  const { userId } = useAuth();

  log.debug('Rendering publishing cadence step', {
    userId: userId || 'signed_out',
    action: 'render_onboarding_frequency_step',
    hasSelection: Boolean(value),
  });

  const handleSelect = (nextValue: string) => {
    log.info('Selected publishing cadence', {
      userId: userId || 'signed_out',
      action: 'select_onboarding_frequency',
      frequency: nextValue,
    });
    onChange(nextValue);
  };

  return (
    <motion.div custom={direction} variants={shouldReduceMotion ? reducedStepVariants : stepVariants} initial="enter" animate="center" exit="exit" transition={shouldReduceMotion ? reducedStepTransition : stepTransition} className="mx-auto mt-4 w-full max-w-xl">
      <OnboardingStepCard icon={Clock} eyebrow="Publishing cadence" title="How often can you realistically post?" description="Consistency beats ambition. Choose a pace you can sustain without burning out.">
        <div className="space-y-2">
          {FREQUENCY_OPTIONS.map((option) => (
            <OnboardingOptionRow key={option.value} icon={FREQUENCY_ICONS[option.value as keyof typeof FREQUENCY_ICONS]} label={option.label} description={option.description} selected={value === option.value} onClick={() => handleSelect(option.value)} />
          ))}
        </div>
        <OnboardingStepFooter
          onBack={onBack}
          onNext={onNext}
          backDisabled={isSubmitting}
          nextDisabled={!value || isSubmitting}
          nextContent={isSubmitting ? <><Loader2 className="size-4 animate-spin motion-reduce:animate-none" />Finalizing…</> : <>Complete setup<ArrowRight className="size-4" /></>}
        />
      </OnboardingStepCard>
      {error && <p role="alert" className="mt-4 text-center text-sm text-destructive">{error}</p>}
    </motion.div>
  );
}
