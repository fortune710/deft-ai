'use client';

import { useState } from 'react';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { OnboardingFormData } from '@/types/niche-mapping';
import { Step1ChatAgent } from './steps/step-1-chat-agent';
import { Step2Goal } from './steps/step-2-goal';
import { Step3Platforms } from './steps/step-3-platforms';
import { Step4Experience } from './steps/step-4-experience';
import { Step5Frequency } from './steps/step-5-frequency';
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  step5Schema,
} from '@/lib/validations/onboarding/questions';
import { useAuth } from '@/hooks/use-clerk-auth';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'components/onboarding/niche-mapping-form' });

interface NicheMappingFormProps {
  onComplete: (data: OnboardingFormData) => Promise<void>;
}

export function NicheMappingForm({ onComplete }: NicheMappingFormProps) {
  const { userId } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<OnboardingFormData>({
    question_1_niche: null,
    question_2_goal: '',
    question_3_platforms: [],
    question_4_experience: '',
    question_5_frequency: '',
  });

  const totalSteps = 5;
  const progressPercentage = (currentStep / totalSteps) * 100;

  const validateStep = (step: number): boolean => {
    log.debug('Validating onboarding step', {
      userId: userId || 'signed_out',
      action: 'validate_onboarding_step',
      step,
    });
    setErrors({});

    try {
      switch (step) {
        case 1:
          step1Schema.parse({
            question_1_niche: formData.question_1_niche,
          });
          break;
        case 2:
          step2Schema.parse({
            question_2_goal: formData.question_2_goal,
          });
          break;
        case 3:
          step3Schema.parse({
            question_3_platforms: formData.question_3_platforms,
          });
          break;
        case 4:
          step4Schema.parse({
            question_4_experience: formData.question_4_experience,
          });
          break;
        case 5:
          step5Schema.parse({
            question_5_frequency: formData.question_5_frequency,
          });
          break;
      }
      log.info('Validated onboarding step', {
        userId: userId || 'signed_out',
        action: 'validate_onboarding_step',
        step,
      });
      return true;
    } catch (error: any) {
      if (error.errors) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          newErrors[err.path[0]] = err.message;
        });
        setErrors(newErrors);
      }
      log.warn('Onboarding step validation failed', {
        userId: userId || 'signed_out',
        action: 'validate_onboarding_step',
        step,
        error,
      });
      return false;
    }
  };

  const handleNext = () => {
    log.debug('Advancing onboarding step', {
      userId: userId || 'signed_out',
      action: 'advance_onboarding_step',
      currentStep,
    });
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setDirection(1);
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    log.debug('Returning to previous onboarding step', {
      userId: userId || 'signed_out',
      action: 'return_onboarding_step',
      currentStep,
    });
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleSubmit = async () => {
    log.info('Submitting onboarding profile', {
      userId: userId || 'signed_out',
      action: 'submit_onboarding_profile',
      currentStep,
    });
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    setErrors({});
    try {
      await onComplete(formData);
    } catch (error) {
      log.error('Onboarding profile submission failed', {
        userId: userId || 'signed_out',
        action: 'submit_onboarding_profile',
        error,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative min-h-screen">
      {/* Sticky Header: Progress Bar */}
      <div className="onboarding-material sticky top-0 z-50 border-b border-border/40 bg-background/75 px-6 py-5 shadow-sm backdrop-blur-xl">
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm font-medium text-primary">
              {Math.round(progressPercentage)}%
            </span>
          </div>

          <div className="relative h-1.5 overflow-hidden rounded-full bg-muted/50">
            <div
              className="absolute inset-0 origin-left rounded-full bg-primary transition-transform duration-300 [transition-timing-function:cubic-bezier(0.77,0,0.175,1)] motion-reduce:transition-none"
              style={{ transform: `scaleX(${progressPercentage / 100})` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content: Steps */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-8 flex flex-col">
        <div className="flex-1 w-full">
          <AnimatePresence initial={false} mode="sync" custom={direction}>
            {currentStep === 1 && (
              <Step1ChatAgent
                key="step-1"
                value={formData.question_1_niche}
                onChange={(value) => {
                  setFormData({ ...formData, question_1_niche: value });
                  handleNext();
                }}
                error={errors.question_1_niche}
                direction={direction}
                shouldReduceMotion={Boolean(shouldReduceMotion)}
              />
            )}
            {currentStep === 2 && (
              <Step2Goal
                key="step-2"
                value={formData.question_2_goal}
                onChange={(value) =>
                  setFormData({ ...formData, question_2_goal: value })
                }
                onBack={handleBack}
                onNext={handleNext}
                error={errors.question_2_goal}
                direction={direction}
                shouldReduceMotion={Boolean(shouldReduceMotion)}
              />
            )}
            {currentStep === 3 && (
              <Step3Platforms
                key="step-3"
                value={formData.question_3_platforms}
                onChange={(value) =>
                  setFormData({ ...formData, question_3_platforms: value })
                }
                onBack={handleBack}
                onNext={handleNext}
                error={errors.question_3_platforms}
                direction={direction}
                shouldReduceMotion={Boolean(shouldReduceMotion)}
              />
            )}
            {currentStep === 4 && (
              <Step4Experience
                key="step-4"
                value={formData.question_4_experience}
                onChange={(value) =>
                  setFormData({ ...formData, question_4_experience: value })
                }
                onBack={handleBack}
                onNext={handleNext}
                error={errors.question_4_experience}
                direction={direction}
                shouldReduceMotion={Boolean(shouldReduceMotion)}
              />
            )}
            {currentStep === 5 && (
              <Step5Frequency
                key="step-5"
                value={formData.question_5_frequency}
                onChange={(value) =>
                  setFormData({ ...formData, question_5_frequency: value })
                }
                onBack={handleBack}
                onNext={handleSubmit}
                isSubmitting={isSubmitting}
                error={errors.question_5_frequency}
                direction={direction}
                shouldReduceMotion={Boolean(shouldReduceMotion)}
              />
            )}
          </AnimatePresence>
        </div>

        {errors.submit && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mt-8 text-center max-w-2xl mx-auto w-full">
            <p className="text-red-400 text-sm">{errors.submit}</p>
          </div>
        )}
      </div>
    </div>
  );
}
