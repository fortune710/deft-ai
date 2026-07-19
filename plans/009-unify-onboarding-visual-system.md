# 009 — Unify onboarding hierarchy and materials

- **Status**: DONE
- **Commit**: 0544618
- **Severity**: MEDIUM
- **Category**: Visual design and usability
- **Estimated scope**: 8 files, large

## Problem

The global header already communicates progress, while each card repeats `Step X / 5`. Core questions are visually small, descriptions drop to 11px at low opacity, and agent/questionnaire states use different card, spacing, and typography treatments.

```tsx
// components/onboarding/steps/step-2-goal.tsx:35 — current
<div className="flex items-center ... text-sm font-medium">
  <Target className="w-4 h-4" />
  <span>Strategic Goals</span>
  <div className="ml-auto text-xs opacity-60 font-mono">Step 2 / 5</div>
</div>

<h3 className="text-sm md:text-base font-semibold">What is your primary goal right now?</h3>
<div className="text-[11px] text-muted-foreground/60">...</div>
```

## Target

- Keep one global progress treatment; remove repeated card step counters.
- Use a shared onboarding card surface: `rounded-3xl border border-border/60 bg-background/80 shadow-[0_18px_60px_-32px_hsl(var(--foreground)/0.35)] backdrop-blur-xl` with a solid fallback under reduced transparency.
- Card eyebrow: `text-xs font-semibold tracking-[0.08em] text-muted-foreground`.
- Main question: `text-xl md:text-2xl font-semibold leading-tight tracking-[-0.02em] text-foreground`.
- Supporting copy: `text-sm leading-6 text-muted-foreground`, never 11px at 60% opacity.
- Use a consistent footer: Back on the left, primary action on the right, minimum 44px controls.
- Extract shared primitives only where they remove meaningful duplication: `OnboardingStepCard`, `OnboardingOptionRow`, and `OnboardingStepFooter`.
- Preserve the existing product color tokens; do not introduce an unrelated palette or glass-on-glass layers.

## Repo conventions to follow

- Use Tailwind, `cn`, Lucide icons, and existing `Button`.
- Keep `font-lexend-deca` for concise display labels and `font-alan-sans` for readable body copy only where already established.
- Respect `prefers-reduced-transparency`: use a solid `bg-background` and remove backdrop blur.
- Every created/edited component function must follow the repository logging instruction. Avoid logging during render; add structured logs to interaction handlers with Clerk user ID, `action`, and relevant state.

## Steps

1. Create shared card, option-row, and footer components under `components/onboarding/` with focused props and no business logic.
2. Move steps 2–5 to the shared visual primitives without changing their data behavior.
3. Apply the same card hierarchy to the agent's follow-up-question state.
4. Remove repeated `Step X / 5` card counters; retain meaningful section labels such as “Strategic goal” and “Publishing cadence.”
5. Raise question and supporting-copy typography to the exact target values.
6. Normalize footer placement and control heights across desktop and mobile.
7. Add reduced-transparency and increased-contrast fallbacks for card surfaces.
8. Verify option descriptions wrap comfortably at 200% text zoom.

## Boundaries

- Do NOT redesign the app outside onboarding.
- Do NOT change validation, copy meaning, database calls, or agent behavior.
- Do NOT stack multiple translucent surfaces.
- Do NOT add decorative gradients or shadows without hierarchy purpose.

## Verification

- **Mechanical**: lint/typecheck all onboarding components; verify no duplicated card step counters remain.
- **Feel check**: each screen immediately answers where the user is, what decision is required, and how to continue. Test dark/light mode, mobile width, 200% text zoom, reduced transparency, and increased contrast.
- **Done when**: agent and questionnaire screens read as one system, supporting text is comfortably legible, and the primary task dominates each card.
