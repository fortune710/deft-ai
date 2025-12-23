'use client';

import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PLATFORM_OPTIONS } from '@/lib/validations/onboarding';
import { Platform } from '@/types/niche-mapping';
import { Music, Instagram, Youtube, Twitter, Linkedin } from 'lucide-react';

const PLATFORM_ICONS = {
  tiktok: Music,
  instagram: Instagram,
  youtube_shorts: Youtube,
  twitter: Twitter,
  linkedin: Linkedin,
};

interface Step3PlatformsProps {
  value: Platform[];
  onChange: (value: Platform[]) => void;
  error?: string;
}

export function Step3Platforms({ value, onChange, error }: Step3PlatformsProps) {
  const handlePlatformToggle = (platformValue: string) => {
    const exists = value.find((p) => p.name === platformValue);
    if (exists) {
      onChange(value.filter((p) => p.name !== platformValue));
    } else {
      onChange([...value, { name: platformValue, isPrimary: value.length === 0 }]);
    }
  };

  const handlePrimaryChange = (platformValue: string) => {
    onChange(
      value.map((p) => ({
        ...p,
        isPrimary: p.name === platformValue,
      }))
    );
  };

  const selectedPlatforms = value.map((p) => p.name);
  const primaryPlatform = value.find((p) => p.isPrimary)?.name;

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
          Where are you posting content first?
        </h2>
        <p className="text-gray-400 text-lg">
          Select all that apply, then mark which one is your primary focus.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <p className="text-sm font-medium text-white">Select your platforms:</p>
          {PLATFORM_OPTIONS.map((option) => {
            const Icon =
              PLATFORM_ICONS[option.value as keyof typeof PLATFORM_ICONS];
            const isSelected = selectedPlatforms.includes(option.value);

            return (
              <div
                key={option.value}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-white/10 border-violet-400/50'
                    : 'bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10'
                }`}
              >
                <Checkbox
                  id={option.value}
                  checked={isSelected}
                  onCheckedChange={() => handlePlatformToggle(option.value)}
                  className="border-white/20 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
                />
                <Label
                  htmlFor={option.value}
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isSelected
                        ? 'bg-gradient-to-br from-violet-500 to-cyan-500'
                        : 'bg-white/10'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-gray-400'}`}
                    />
                  </div>
                  <span className="font-medium text-white">{option.label}</span>
                </Label>
              </div>
            );
          })}
        </div>

        {selectedPlatforms.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-white/10">
            <p className="text-sm font-medium text-white">
              Which is your primary platform?
            </p>
            <RadioGroup value={primaryPlatform} onValueChange={handlePrimaryChange}>
              {value.map((platform) => {
                const option = PLATFORM_OPTIONS.find(
                  (o) => o.value === platform.name
                );
                if (!option) return null;

                const Icon =
                  PLATFORM_ICONS[option.value as keyof typeof PLATFORM_ICONS];

                return (
                  <div
                    key={platform.name}
                    className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${
                      platform.isPrimary
                        ? 'bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border-violet-400/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <RadioGroupItem
                      value={platform.name}
                      id={`primary-${platform.name}`}
                      className="border-white/20"
                    />
                    <Label
                      htmlFor={`primary-${platform.name}`}
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                    >
                      <Icon className="w-5 h-5 text-gray-400" />
                      <span className="text-white">{option.label}</span>
                      {platform.isPrimary && (
                        <span className="ml-auto text-xs px-2 py-1 rounded-full bg-violet-500/30 text-violet-300">
                          Primary
                        </span>
                      )}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </motion.div>
  );
}
