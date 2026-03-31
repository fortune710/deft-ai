'use client';

import { motion } from 'framer-motion';
import { FREQUENCY_OPTIONS } from '@/lib/validations/onboarding/options';
import { Calendar, CalendarDays, Zap, HelpCircle, Clock, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Step5FrequencyProps {
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  isSubmitting?: boolean;
  error?: string;
}

const FREQUENCY_ICONS = {
  '1_2_per_week': Calendar,
  '3_4_per_week': CalendarDays,
  daily: Zap,
  not_sure: HelpCircle,
};

export function Step5Frequency({ value, onChange, onBack, onNext, isSubmitting, error }: Step5FrequencyProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-xl mx-auto mt-4"
    >
      <div className="border border-border/40 rounded-2xl bg-background/50 backdrop-blur-sm p-5 md:p-6 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 text-muted-foreground mb-6 text-sm font-medium">
          <Clock className="w-4 h-4" />
          <span>Cadence</span>
          <div className="ml-auto text-xs opacity-60 font-mono tracking-tight">Step 5 / 5</div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm md:text-base font-semibold text-foreground leading-snug">
              How often can you realistically post?
            </h3>
            <p className="text-xs text-muted-foreground">
              Consistency beats ambition. Be honest to avoid burnout.
            </p>
          </div>

          <div className="space-y-1.5 pb-2">
            {FREQUENCY_OPTIONS.map((option) => {
              const Icon = FREQUENCY_ICONS[option.value as keyof typeof FREQUENCY_ICONS];
              const isSelected = value === option.value;

              return (
                <button
                  key={option.value}
                  onClick={() => onChange(option.value)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition-all duration-200 group",
                    isSelected
                      ? "bg-primary/5 border-primary shadow-sm"
                      : "bg-transparent border-transparent hover:bg-muted/30"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 shrink-0 flex items-center justify-center rounded-lg transition-all duration-500",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "bg-muted text-muted-foreground/60 group-hover:bg-muted/30"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className={cn(
                      "text-[13px] font-semibold transition-colors",
                      isSelected ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {option.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground/60 leading-tight">
                      {option.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 mt-2 relative">
            <div className="absolute top-0 left-0 right-0 h-12 -mt-12 bg-gradient-to-t from-background/50 to-transparent pointer-events-none" />
            <button
              onClick={onBack}
              disabled={isSubmitting}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
            >
              Back
            </button>
            <Button
              onClick={onNext}
              disabled={!value || isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-bold px-8 h-12 rounded-2xl shadow-lg shadow-primary/20 transition-all min-w-[160px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Finalizing...
                </>
              ) : (
                <>
                  Complete Setup
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      {error && (
        <p className="text-red-400 text-xs mt-4 text-center">{error}</p>
      )}
    </motion.div>
  );
}


