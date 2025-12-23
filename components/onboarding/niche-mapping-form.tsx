'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { OnboardingFormData } from '@/types/niche-mapping';
import { Step1Niche } from './steps/step-1-niche';
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
    <div className="w-full max-w-3xl mx-auto space-y-8">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-400">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-sm font-medium text-violet-400">
            {Math.round(progressPercentage)}%
          </span>
        </div>

        <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progressPercentage}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>

        <div className="flex justify-center gap-2">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all ${
                index + 1 === currentStep
                  ? 'bg-violet-400 scale-125 animate-pulse'
                  : index + 1 < currentStep
                    ? 'bg-gradient-to-r from-violet-400 to-cyan-400'
                    : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 min-h-[500px]">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <Step1Niche
              key="step-1"
              value={formData.question_1_niche}
              onChange={(value) =>
                setFormData({ ...formData, question_1_niche: value })
              }
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
              error={errors.question_5_frequency}
            />
          )}
        </AnimatePresence>
      </div>

      {errors.submit && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400 text-sm">{errors.submit}</p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1 || isSubmitting}
          className="bg-white/5 border-white/10 text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {currentStep < totalSteps ? (
          <Button
            type="button"
            onClick={handleNext}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-violet-500 to-cyan-500 text-white hover:opacity-90"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-violet-500 to-cyan-500 text-white hover:opacity-90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating your engine...
              </>
            ) : (
              <>
                Complete Setup
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
