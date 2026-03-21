'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
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
} from '@/lib/validations/onboarding';

interface NicheMappingFormProps {
  onComplete: (data: OnboardingFormData) => Promise<void>;
}

export function NicheMappingForm({ onComplete }: NicheMappingFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<OnboardingFormData>({
    question_1_niche: '',
    question_2_goal: '',
    question_3_platforms: [],
    question_4_experience: '',
    question_5_frequency: '',
  });

  const totalSteps = 5;
  const progressPercentage = (currentStep / totalSteps) * 100;

  const validateStep = (step: number): boolean => {
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
      return true;
    } catch (error: any) {
      if (error.errors) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err: any) => {
          newErrors[err.path[0]] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    setErrors({});
    try {
      await onComplete(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative min-h-screen">
      {/* Sticky Header: Progress Bar */}
      <div className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/40 py-6 px-6 shadow-sm">
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm font-medium text-primary">
              {Math.round(progressPercentage)}%
            </span>
          </div>

          <div className="relative h-2 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-primary transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progressPercentage}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Steps */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-8 flex flex-col">
        <div className="flex-1 w-full">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <Step1ChatAgent
                key="step-1"
                value={formData.question_1_niche}
                onChange={(value) => {
                  setFormData({ ...formData, question_1_niche: value });
                  handleNext();
                }}
                error={errors.question_1_niche}
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

      {/* Sticky Footer: Navigation (Only for Step 1) */}
      {currentStep === 1 && (
        <div className="sticky bottom-0 z-50 bg-background/60 backdrop-blur-xl border-t border-border/40 py-4 px-6 shadow-[0_-8px_40px_rgba(0,0,0,0.12)]">
          <div className="max-w-5xl mx-auto flex justify-between items-center gap-4 w-full">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1 || isSubmitting}
              className="h-11 px-6 text-muted-foreground hover:text-foreground transition-all flex items-center gap-2 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            <div className="flex items-center gap-3">
              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating Engine...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
