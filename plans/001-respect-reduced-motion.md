# 001 — Respect onboarding motion preferences

- **Status**: DONE
- **Commit**: 0544618
- **Severity**: HIGH
- **Category**: Accessibility
- **Estimated scope**: 7 files, medium

## Problem

The onboarding page runs two perpetual full-screen transforms and every step moves on entry and exit without checking the user's motion preference.

```tsx
// app/onboarding/page.tsx:56 — current
<motion.div
  animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15], x: [0, 50, 0], y: [0, -30, 0] }}
  transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
/>
```

```tsx
// components/onboarding/steps/step-2-goal.tsx:27 — current
<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
```

The same translated step treatment occurs in steps 3–5 and the agent states.

## Target

Use Framer Motion's `useReducedMotion()`. With normal motion, retain the intended transform behavior after plans 004 and 005. With reduced motion:

- Background glows are static: no scale, `x`, or `y` animation.
- Step and agent-state transitions use opacity only: `initial={{ opacity: 0 }}`, `animate={{ opacity: 1 }}`, `exit={{ opacity: 0 }}`.
- Opacity transitions use `duration: 0.2` and `ease: [0.23, 1, 0.32, 1]`.
- Loading spinners may continue because they communicate progress, but decorative pulses must not.

## Repo conventions to follow

- The project already uses `framer-motion` directly in `app/onboarding/page.tsx` and each step.
- Keep animation configuration close to the onboarding shell until plan 008 introduces shared variants.
- Any edited event-handler function must follow `AGENTS.md`: use a child of `lib/logger.ts`, include `userId`, `action`, and error/status context; never use `console.*`.

## Steps

1. Import `useReducedMotion` in `app/onboarding/page.tsx` and all onboarding components that directly own translated motion.
2. Make both background glow `animate` props static when reduced motion is enabled.
3. Branch every onboarding step/state variant so reduced motion changes only opacity.
4. Remove decorative pulse animation under reduced motion using Tailwind's `motion-reduce:animate-none`.
5. Do not remove loading feedback or color/opacity state feedback.

## Boundaries

- Do NOT remove all animation globally.
- Do NOT change drawer gestures; Vaul owns their accessible gesture behavior.
- Do NOT add dependencies.
- If the cited components have moved since commit `0544618`, stop and report drift.

## Verification

- **Mechanical**: `bunx eslint app/onboarding/page.tsx components/onboarding`; no new errors.
- **Feel check**: with normal motion, onboarding retains spatial transitions. Emulate `prefers-reduced-motion: reduce`; glows stop moving and steps crossfade without translation.
- **Done when**: every onboarding transform animation has an explicit reduced-motion equivalent and meaningful loading feedback remains visible.
