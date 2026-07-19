'use client';

import { motion } from 'framer-motion';
import { Award, DollarSign, Send, Target, TrendingUp } from 'lucide-react';

import { GOAL_OPTIONS } from '@/lib/validations/onboarding/options';
import { OnboardingOptionRow, OnboardingStepCard, OnboardingStepFooter } from '@/components/onboarding/step-ui';
import { reducedStepTransition, reducedStepVariants, stepTransition, stepVariants } from '@/components/onboarding/motion';
import { useAuth } from '@/hooks/use-clerk-auth';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'components/onboarding/steps/step-2-goal' });

interface Step2GoalProps {
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  error?: string;
  direction: number;
  shouldReduceMotion: boolean;
}

const GOAL_ICONS = {
  grow_audience: TrendingUp,
  get_engagement: Target,
  build_authority: Award,
  drive_traffic: Send,
  sell_product: DollarSign,
};

export function Step2Goal({ value, onChange, onBack, onNext, error, direction, shouldReduceMotion }: Step2GoalProps) {
  const { userId } = useAuth();

  log.debug('Rendering strategic goal step', {
    userId: userId || 'signed_out',
    action: 'render_onboarding_goal_step',
    hasSelection: Boolean(value),
  });

  const handleSelect = (nextValue: string) => {
    log.info('Selected onboarding strategic goal', {
      userId: userId || 'signed_out',
      action: 'select_onboarding_goal',
      goal: nextValue,
    });
    onChange(nextValue);
  };

  return (
    <motion.div
      custom={direction}
      variants={shouldReduceMotion ? reducedStepVariants : stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={shouldReduceMotion ? reducedStepTransition : stepTransition}
      className="mx-auto mt-4 w-full max-w-xl"
    >
      <OnboardingStepCard
        icon={Target}
        eyebrow="Strategic goal"
        title="What is your primary goal right now?"
        description="This drives your strategy, tone, and calls-to-action."
      >
        <div className="space-y-2">
          {GOAL_OPTIONS.map((option) => (
            <OnboardingOptionRow
              key={option.value}
              icon={GOAL_ICONS[option.value as keyof typeof GOAL_ICONS]}
              label={option.label}
              description={option.description}
              selected={value === option.value}
              onClick={() => handleSelect(option.value)}
            />
          ))}
        </div>
        <OnboardingStepFooter onBack={onBack} onNext={onNext} nextDisabled={!value} />
      </OnboardingStepCard>
      {error && <p role="alert" className="mt-4 text-center text-sm text-destructive">{error}</p>}
    </motion.div>
  );
}
