'use client';

import { motion } from 'framer-motion';
import { PLATFORM_OPTIONS } from '@/lib/validations/onboarding/options';
import { Platform } from '@/types/niche-mapping';
import { Music, Instagram, Youtube, Twitter, Linkedin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
  onBack: () => void;
  onNext: () => void;
  error?: string;
}

export function Step3Platforms({ value, onChange, onBack, onNext, error }: Step3PlatformsProps) {
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-xl mx-auto mt-4"
    >
      <div className="border border-border/40 rounded-2xl bg-background/50 backdrop-blur-sm p-5 md:p-6 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 text-muted-foreground mb-6 text-sm font-medium">
          <Instagram className="w-4 h-4" />
          <span>Platform Presence</span>
          <div className="ml-auto text-xs opacity-60 font-mono tracking-tight">Step 3 / 5</div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm md:text-base font-semibold text-foreground leading-snug">
              Where are you posting content first?
            </h3>
            <p className="text-xs text-muted-foreground">
              Select all that apply, then mark which one is your primary focus.
            </p>
          </div>

          <div className="space-y-1.5 pb-2">
            {PLATFORM_OPTIONS.map((option) => {
              const Icon = PLATFORM_ICONS[option.value as keyof typeof PLATFORM_ICONS];
              const isSelected = selectedPlatforms.includes(option.value);

              return (
                <button
                  key={option.value}
                  onClick={() => handlePlatformToggle(option.value)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all duration-200 group",
                    isSelected
                      ? "bg-primary/5 border-primary shadow-sm"
                      : "bg-transparent border-transparent hover:bg-muted/30"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 shrink-0 flex items-center justify-center rounded-lg transition-all duration-500",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "bg-muted text-muted-foreground/60 group-hover:bg-muted/30"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={cn(
                    "text-[13px] font-medium transition-colors flex-1",
                    isSelected ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {option.label}
                  </span>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {selectedPlatforms.length > 0 && (
            <div className="space-y-3 pt-6 relative mt-2">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
              <p className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest pl-1">
                Primary Platform Focus
              </p>
              <div className="flex flex-wrap gap-2">
                {value.map((platform) => {
                  const option = PLATFORM_OPTIONS.find((o) => o.value === platform.name);
                  if (!option) return null;
                  const isPrimary = platform.isPrimary;

                  return (
                    <button
                      key={platform.name}
                      onClick={() => handlePrimaryChange(platform.name)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-300 border flex items-center gap-2",
                        isPrimary
                          ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                          : "bg-muted/50 text-muted-foreground border-transparent hover:border-border/60"
                      )}
                    >
                      {option.label}
                      {isPrimary && <div className="w-1 h-1 rounded-full bg-primary-foreground animate-pulse" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
              disabled={selectedPlatforms.length === 0}
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
