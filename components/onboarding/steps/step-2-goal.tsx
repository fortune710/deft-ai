'use client';

import { motion } from 'framer-motion';
import { Target, TrendingUp, Award, Send, DollarSign } from 'lucide-react';
import { GOAL_OPTIONS } from '@/lib/validations/onboarding/options';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Step2GoalProps {
  value: string;
  onChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  error?: string;
}

const GOAL_ICONS = {
  grow_audience: TrendingUp,
  get_engagement: Target,
  build_authority: Award,
  drive_traffic: Send,
  sell_product: DollarSign,
};

export function Step2Goal({ value, onChange, onBack, onNext, error }: Step2GoalProps) {
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
          <Target className="w-4 h-4" />
          <span>Strategic Goals</span>
          <div className="ml-auto text-xs opacity-60 font-mono tracking-tight">Step 2 / 5</div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm md:text-base font-semibold text-foreground leading-snug">
              What is your primary goal right now?
            </h3>
            <p className="text-xs text-muted-foreground">
              This drives your strategy, tone, and calls-to-action.
            </p>
          </div>

          <div className="space-y-1.5 pb-2">
            {GOAL_OPTIONS.map((option) => {
              const Icon = GOAL_ICONS[option.value as keyof typeof GOAL_ICONS];
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
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Back
            </button>
            <Button
              onClick={onNext}
              disabled={!value}
              className="bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground gap-2 font-medium px-6 tracking-wide h-10 rounded-2xl shadow-sm transition-all"
            >
              Continue
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


