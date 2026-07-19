# 002 — Move progress animation to the compositor

- **Status**: DONE
- **Commit**: 0544618
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 1 file, small

## Problem

The progress bar animates `width` through `transition-all`, producing layout work and allowing unrelated properties to animate.

```tsx
// components/onboarding/niche-mapping-form.tsx:128 — current
<div className="relative h-2 bg-muted/30 rounded-full overflow-hidden">
  <div
    className="absolute inset-y-0 left-0 bg-primary transition-all duration-500 ease-out rounded-full"
    style={{ width: `${progressPercentage}%` }}
  >
```

## Target

Keep the fill at full width and animate a transform:

```tsx
<div
  className="absolute inset-0 origin-left rounded-full bg-primary transition-transform duration-300 [transition-timing-function:cubic-bezier(0.77,0,0.175,1)] motion-reduce:transition-none"
  style={{ transform: `scaleX(${progressPercentage / 100})` }}
/>
```

Use `300ms` because this is an occasional on-screen morph, not an entering element. Do not animate `width`.

## Repo conventions to follow

- Continue using Tailwind utilities and the existing inline style for the data-driven value.
- Reuse the same rounded track and primary color.
- Log edited handlers according to `AGENTS.md`; this visual-only edit should not introduce a function.

## Steps

1. Replace the percentage `width` style with `transform: scaleX()`.
2. Add `origin-left` so progress grows from the start edge.
3. Replace `transition-all duration-500 ease-out` with the exact transform-only transition above.
4. Remove the nested decorative pulse; plan 006 also documents this cleanup.

## Boundaries

- Do NOT alter progress calculation or step count.
- Do NOT introduce a JavaScript animation loop.
- Do NOT add dependencies.

## Verification

- **Mechanical**: `bunx eslint components/onboarding/niche-mapping-form.tsx`.
- **Feel check**: move forward and backward repeatedly. The bar must reverse smoothly from its current visual position. In DevTools Performance, the transition must not trigger layout on every frame.
- **Done when**: the only animated progress property is `transform`, and reduced motion updates immediately.
