'use client';

import type { ComponentType, ReactNode } from 'react';
import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'components/onboarding/step-ui' });

interface OnboardingStepCardProps {
  icon: ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function OnboardingStepCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
}: OnboardingStepCardProps) {
  log.debug('Rendering onboarding step card', {
    userId: 'resolved_by_parent',
    action: 'render_onboarding_step_card',
    eyebrow,
  });

  return (
    <section className="onboarding-material overflow-hidden rounded-3xl border border-border/60 bg-background/80 p-5 shadow-[0_18px_60px_-32px_hsl(var(--foreground)/0.35)] backdrop-blur-xl md:p-7">
      <div className="mb-5 flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-muted-foreground">
        <Icon className="size-3.5 text-primary" />
        <span>{eyebrow}</span>
      </div>
      <header className="mb-6 space-y-2">
        <h2 className="text-xl font-semibold leading-tight tracking-[-0.02em] text-foreground md:text-2xl">
          {title}
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </header>
      {children}
    </section>
  );
}

interface OnboardingOptionRowProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
}

export function OnboardingOptionRow({
  icon: Icon,
  label,
  description,
  selected,
  onClick,
}: OnboardingOptionRowProps) {
  log.debug('Rendering onboarding option row', {
    userId: 'resolved_by_parent',
    action: 'render_onboarding_option_row',
    label,
    selected,
  });

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'group flex min-h-12 w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left outline-none transition-[background-color,border-color,box-shadow,transform] duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] motion-reduce:transform-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40',
        selected
          ? 'border-primary/70 bg-primary/[0.08] shadow-sm'
          : 'border-transparent bg-transparent hover:border-border/70 hover:bg-muted/40',
      )}
    >
      <span
        className={cn(
          'flex size-8 p-1.5 shrink-0 items-center justify-center rounded-lg transition-[background-color,color,box-shadow,transform] duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]',
          selected
            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
            : 'bg-muted text-muted-foreground group-hover:text-foreground',
        )}
      >
        <Icon className="w-4 h-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-sm font-semibold', selected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground')}>
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-sm leading-5 text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color,opacity,transform] duration-200',
          selected
            ? 'scale-100 border-primary bg-primary text-primary-foreground opacity-100'
            : 'scale-95 border-border opacity-50',
        )}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
    </button>
  );
}

interface OnboardingStepFooterProps {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  backDisabled?: boolean;
  nextLabel?: string;
  nextContent?: ReactNode;
}

export function OnboardingStepFooter({
  onBack,
  onNext,
  nextDisabled,
  backDisabled,
  nextLabel = 'Continue',
  nextContent,
}: OnboardingStepFooterProps) {
  log.debug('Rendering onboarding step footer', {
    userId: 'resolved_by_parent',
    action: 'render_onboarding_step_footer',
    nextDisabled: Boolean(nextDisabled),
  });

  return (
    <footer className="mt-6 flex items-center justify-between border-t border-border/50 pt-5">
      <Button type="button" variant="ghost" onClick={onBack} disabled={backDisabled} className="h-11 px-4 text-muted-foreground">
        Back
      </Button>
      <Button type="button" onClick={onNext} disabled={nextDisabled} className="h-11 rounded-xl px-6 font-semibold shadow-sm shadow-primary/15">
        {nextContent ?? nextLabel}
      </Button>
    </footer>
  );
}
