# 008 — Create one onboarding motion vocabulary

- **Status**: DONE
- **Commit**: 0544618
- **Severity**: LOW
- **Category**: Cohesion and tokens
- **Estimated scope**: 8 files, medium

## Problem

Motion values are implicit, repeated, and inconsistent across the agent states, questionnaire steps, progress bar, and controls. There is no onboarding-local vocabulary for entry, movement, state feedback, or reduced motion.

```tsx
// representative current code
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -20 }}
```

Other elements use Tailwind `ease-out`, unqualified Framer defaults, 200ms, 300ms, 500ms, and perpetual 15–18 second loops.

## Target

Create `components/onboarding/motion.ts` containing shared, typed values:

```ts
export const onboardingEaseOut = [0.23, 1, 0.32, 1] as const;
export const onboardingEaseInOut = [0.77, 0, 0.175, 1] as const;
export const onboardingMotion = {
  pressDuration: 0.15,
  stateDuration: 0.2,
  stepDuration: 0.24,
  progressDuration: 0.3,
} as const;
```

Also export the directional variants from plan 004 and a fade-only reduced-motion variant. The personality is crisp and calm: no bounce on navigation, no excessive travel, no motion that delays input.

## Repo conventions to follow

- Keep the module onboarding-local; do not impose it on unrelated product areas.
- Use Framer Motion's typed `Variants` where applicable.
- CSS/Tailwind transitions must use the equivalent exact cubic-bezier values.

## Steps

1. Execute plans 001–007 first so target behavior is settled.
2. Add the typed motion module with the exact curves and duration scale above.
3. Replace duplicated Framer transition objects in onboarding components with imports from the module.
4. Ensure CSS utility timings match the same scale.
5. Add a short comment documenting when each duration/curve is appropriate; do not document generic animation theory.

## Boundaries

- Do NOT create global CSS tokens in this plan.
- Do NOT add spring bounce to non-gesture transitions.
- Do NOT refactor unrelated motion code.

## Verification

- **Mechanical**: typecheck and lint all onboarding files; search for ad hoc Framer easing arrays in onboarding and confirm intentional exceptions only.
- **Feel check**: review the full flow at normal speed and 10% playback. State changes should share timing and navigation should feel distinct from selection feedback.
- **Done when**: onboarding has one documented curve/duration vocabulary with reduced-motion variants.
