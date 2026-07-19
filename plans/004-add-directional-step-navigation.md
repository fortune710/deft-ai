# 004 — Give step navigation spatial direction

- **Status**: DONE
- **Commit**: 0544618
- **Severity**: MEDIUM
- **Category**: Spatial consistency
- **Estimated scope**: 6 files, medium

## Problem

Every questionnaire step enters upward and exits farther upward, including when the user presses Back. This does not communicate the relationship between previous and next steps.

```tsx
// components/onboarding/steps/step-3-platforms.tsx:49 — current
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
>
```

## Target

Track a navigation direction of `1` forward and `-1` backward in `NicheMappingForm`. Pass it through `AnimatePresence custom={direction}` and step motion variants.

```ts
const stepVariants = {
  enter: (direction: number) => ({ opacity: 0, transform: `translateX(${direction * 24}px)` }),
  center: { opacity: 1, transform: 'translateX(0px)' },
  exit: (direction: number) => ({ opacity: 0, transform: `translateX(${direction * -24}px)` }),
};
const stepTransition = { duration: 0.24, ease: [0.23, 1, 0.32, 1] };
```

Reduced motion must use opacity only for all three variants. Enter and exit follow the same axis and mirror direction.

## Repo conventions to follow

- Framer Motion and `AnimatePresence` are already installed and used.
- Prefer full `transform` strings over `x` shorthand for compositor-friendly predetermined motion.
- Put shared variants in a small onboarding-local module, e.g. `components/onboarding/motion.ts`; no new package.
- New or edited handlers require structured logs per `AGENTS.md`, using the authenticated Clerk user ID when available rather than a placeholder.

## Steps

1. Add `direction` state to `NicheMappingForm`, set `1` immediately before forward transitions and `-1` immediately before back transitions.
2. Create shared `stepVariants` and `stepTransition` in `components/onboarding/motion.ts`.
3. Pass `custom={direction}` to `AnimatePresence` and each step motion root.
4. Replace vertical step motion in steps 2–5 with the shared variants.
5. Keep the agent's internal state motion separate; only its transition into step 2 uses the form direction.
6. Branch to opacity-only variants under reduced motion.

## Boundaries

- Do NOT alter validation or form progression.
- Do NOT animate more than 24px.
- Do NOT add bounce; this is navigation, not momentum-driven gesture motion.

## Verification

- **Mechanical**: lint all six files and run the existing typecheck command.
- **Feel check**: Continue moves content left as the next step enters from the right; Back exactly mirrors that path. Repeated rapid navigation must not jump vertically.
- **Done when**: direction accurately reflects the user's action and reduced motion crossfades.
