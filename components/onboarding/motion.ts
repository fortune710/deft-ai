import type { Transition, Variants } from 'framer-motion';

export const onboardingEaseOut = [0.23, 1, 0.32, 1] as const;
export const onboardingEaseInOut = [0.77, 0, 0.175, 1] as const;

export const onboardingMotion = {
  pressDuration: 0.15,
  stateDuration: 0.2,
  stepDuration: 0.24,
  progressDuration: 0.3,
} as const;

export const stepTransition: Transition = {
  duration: onboardingMotion.stepDuration,
  ease: onboardingEaseOut,
};

export const stepVariants: Variants = {
  enter: (direction: number) => ({
    opacity: 0,
    transform: `translateX(${direction * 24}px)`,
  }),
  center: {
    opacity: 1,
    transform: 'translateX(0px)',
  },
  exit: (direction: number) => ({
    opacity: 0,
    transform: `translateX(${direction * -24}px)`,
  }),
};

export const reducedStepVariants: Variants = {
  enter: { opacity: 0, transform: 'translateX(0px)' },
  center: { opacity: 1, transform: 'translateX(0px)' },
  exit: { opacity: 0, transform: 'translateX(0px)' },
};

export const reducedStepTransition: Transition = {
  duration: onboardingMotion.stateDuration,
  ease: onboardingEaseOut,
};
