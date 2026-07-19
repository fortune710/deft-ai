'use client';

import { motion } from 'framer-motion';
import { GraduationCap, Rocket, Sprout, User } from 'lucide-react';

import { OnboardingOptionRow, OnboardingStepCard, OnboardingStepFooter } from '@/components/onboarding/step-ui';
import { reducedStepTransition, reducedStepVariants, stepTransition, stepVariants } from '@/components/onboarding/motion';
import { useAuth } from '@/hooks/use-clerk-auth';
import { logger } from '@/lib/logger';
import { EXPERIENCE_OPTIONS } from '@/lib/validations/onboarding/options';

const log = logger.child({ module: 'components/onboarding/steps/step-4-experience' });

interface Step4ExperienceProps {
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  error?: string;
  direction: number;
  shouldReduceMotion: boolean;
}

const EXPERIENCE_ICONS = {
  complete_beginner: Sprout,
  some_experience: User,
  experienced_creator: Rocket,
};

export function Step4Experience({ value, onChange, onBack, onNext, error, direction, shouldReduceMotion }: Step4ExperienceProps) {
  const { userId } = useAuth();

  log.debug('Rendering creator experience step', {
    userId: userId || 'signed_out',
    action: 'render_onboarding_experience_step',
    hasSelection: Boolean(value),
  });

  const handleSelect = (nextValue: string) => {
    log.info('Selected creator experience level', {
      userId: userId || 'signed_out',
      action: 'select_onboarding_experience',
      experience: nextValue,
    });
    onChange(nextValue);
  };

  return (
    <motion.div custom={direction} variants={shouldReduceMotion ? reducedStepVariants : stepVariants} initial="enter" animate="center" exit="exit" transition={shouldReduceMotion ? reducedStepTransition : stepTransition} className="mx-auto mt-4 w-full max-w-xl">
      <OnboardingStepCard icon={GraduationCap} eyebrow="Creator level" title="How comfortable are you creating content today?" description="This helps us tailor guidance to your level—no judgment, just a better fit.">
        <div className="space-y-2">
          {EXPERIENCE_OPTIONS.map((option) => (
            <OnboardingOptionRow key={option.value} icon={EXPERIENCE_ICONS[option.value as keyof typeof EXPERIENCE_ICONS]} label={option.label} description={option.description} selected={value === option.value} onClick={() => handleSelect(option.value)} />
          ))}
        </div>
        <OnboardingStepFooter onBack={onBack} onNext={onNext} nextDisabled={!value} />
      </OnboardingStepCard>
      {error && <p role="alert" className="mt-4 text-center text-sm text-destructive">{error}</p>}
    </motion.div>
  );
}
