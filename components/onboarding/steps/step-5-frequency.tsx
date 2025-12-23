'use client';

import { motion } from 'framer-motion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FREQUENCY_OPTIONS } from '@/lib/validations/onboarding';
import { Calendar, CalendarDays, Zap, HelpCircle } from 'lucide-react';

const FREQUENCY_ICONS = {
  '1_2_per_week': Calendar,
  '3_4_per_week': CalendarDays,
  daily: Zap,
  not_sure: HelpCircle,
};

interface Step5FrequencyProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function Step5Frequency({ value, onChange, error }: Step5FrequencyProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          How often can you realistically post?
        </h2>
        <p className="text-gray-400 text-lg">
          Consistency beats ambition. Be honest to avoid burnout.
        </p>
      </div>

      <RadioGroup value={value} onValueChange={onChange} className="space-y-3">
        {FREQUENCY_OPTIONS.map((option) => {
          const Icon =
            FREQUENCY_ICONS[option.value as keyof typeof FREQUENCY_ICONS];
          const isSelected = value === option.value;

          return (
            <div key={option.value} className="relative">
              <RadioGroupItem
                value={option.value}
                id={option.value}
                className="peer sr-only"
              />
              <Label
                htmlFor={option.value}
                className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border-violet-400/50 shadow-lg shadow-violet-500/20'
                    : 'bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 hover:border-violet-400/30'
                }`}
              >
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                    isSelected
                      ? 'bg-gradient-to-br from-violet-500 to-cyan-500'
                      : 'bg-white/10'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-400'}`}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="font-semibold text-white">{option.label}</div>
                  <div className="text-sm text-gray-400">{option.description}</div>
                </div>
              </Label>
            </div>
          );
        })}
      </RadioGroup>

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </motion.div>
  );
}
