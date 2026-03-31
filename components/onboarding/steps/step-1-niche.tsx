'use client';

import { motion } from 'framer-motion';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { NICHE_EXAMPLES } from '@/lib/validations/onboarding/options';

interface Step1NicheProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function Step1Niche({ value, onChange, error }: Step1NicheProps) {
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
          What niche do you want to create content in?
        </h2>
        <p className="text-gray-400 text-lg">
          Be as specific or broad as you like. This is the foundation of everything.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="niche" className="text-white">
          Your niche
        </Label>
        <Textarea
          id="niche"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g., Fitness for busy professionals"
          className="min-h-[120px] bg-white/5 backdrop-blur-xl border-white/10 text-white placeholder:text-gray-500 focus:border-violet-400/50 focus:ring-violet-400/20"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      <div className="space-y-3">
        <p className="text-gray-400 text-sm">Need inspiration? Try these:</p>
        <div className="flex flex-wrap gap-2">
          {NICHE_EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => onChange(example)}
              className="px-3 py-1.5 text-sm bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 hover:border-violet-400/50 transition-all"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
