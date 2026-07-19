# 003 — Tighten selection and control transitions

- **Status**: DONE
- **Commit**: 0544618
- **Severity**: HIGH
- **Category**: Performance and cohesion
- **Estimated scope**: 6 files, medium

## Problem

Selectable rows, icons, chips, and primary controls use broad `transition-all`. Icon state changes take 500ms, exceeding the 300ms UI budget.

```tsx
// components/onboarding/steps/step-2-goal.tsx:61 — current
"... transition-all duration-200 group"
// components/onboarding/steps/step-2-goal.tsx:68 — current
"... transition-all duration-500"
```

This pattern repeats in steps 3–5, the agent answer rows, and `components/onboarding/chat-input.tsx:139`.

## Target

- Selection rows: `transition-[background-color,border-color,box-shadow,transform] duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]`.
- Icon tiles: `transition-[background-color,color,box-shadow,transform] duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]`.
- Primary-platform chips: the same explicit properties at `200ms`, not `300ms`.
- Buttons: rely on the shared Button component where possible; remove local `transition-all`.
- Back controls: `transition-colors duration-150`.
- Reduced motion preserves color changes but removes transform transitions.

## Repo conventions to follow

- Keep Tailwind arbitrary transition-property syntax.
- `components/ui/button.tsx` already supplies a shared transition and press offset; do not duplicate it locally.
- Preserve current color tokens and selected-state values.

## Steps

1. Replace every onboarding `transition-all` with the smallest explicit property list.
2. Reduce every 500ms icon transition to 200ms.
3. Reduce platform chip transitions to 200ms.
4. Remove redundant transition utilities from shared `<Button>` usages.
5. Confirm no layout property is included in any onboarding transition.

## Boundaries

- Do NOT change selection behavior or data shape.
- Do NOT edit the global Button component in this plan.
- Do NOT change motion-based step navigation; plans 004 and 005 own it.

## Verification

- **Mechanical**: `rg -n "transition-all|duration-500" components/onboarding` returns no active onboarding matches; lint all changed files.
- **Feel check**: rapidly alternate options. Visual states must retarget without flashing or waiting. Inspect at 10% playback speed for synchronized border, fill, icon, and shadow changes.
- **Done when**: all onboarding transitions name their properties and interactive state changes complete within 200ms.
