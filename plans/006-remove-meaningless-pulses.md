# 006 — Reserve continuous motion for real progress

- **Status**: DONE
- **Commit**: 0544618
- **Severity**: MEDIUM
- **Category**: Purpose and frequency
- **Estimated scope**: 3 files, small

## Problem

Continuous pulse animation is used on settled states and layered on top of actual spinners.

```tsx
// components/onboarding/niche-mapping-form.tsx:133 — current
<div className="absolute inset-0 bg-white/20 animate-pulse" />

// components/onboarding/steps/step-3-platforms.tsx:137 — current
{isPrimary && <div className="w-1 h-1 rounded-full bg-primary-foreground animate-pulse" />}

// components/onboarding/steps/step-1-chat-agent.tsx:360 — current
<div className="flex items-center gap-4 animate-pulse">
```

The first two communicate no changing state. The agent row already contains a spinner, making the parent pulse redundant.

## Target

- Progress fill: solid primary fill with no pulse overlay.
- Primary-platform indicator: static check or solid dot; no pulse.
- Agent loading row: keep `Loader2 animate-spin`, remove pulse from the whole row, and use a static muted placeholder or a restrained opacity shimmer only on the placeholder bar.
- Add `motion-reduce:animate-none` to retained loading animation where appropriate.

## Repo conventions to follow

- Use existing Lucide icons; `CheckCircle2` or `Check` is acceptable if already imported nearby.
- Keep selected-state color tokens.
- Loading animation must only appear while `isStreaming` or `isSubmitting` is true.

## Steps

1. Delete the progress bar pulse overlay.
2. Replace the selected primary chip's pulsing dot with a static selected mark.
3. Remove `animate-pulse` from the entire agent loading row.
4. Keep exactly one clear progress signal in each loading region.
5. Add accessible loading text or `aria-live="polite"` if the existing state is not announced.

## Boundaries

- Do NOT remove spinners that communicate active work.
- Do NOT add decorative looping animation elsewhere.
- Do NOT change streaming logic.

## Verification

- **Mechanical**: `rg -n "animate-pulse" components/onboarding` should return no unjustified settled-state pulses; lint changed files.
- **Feel check**: selected options feel stable; agent processing remains unmistakably active without multiple competing rhythms.
- **Done when**: every infinite onboarding animation has a current-state purpose.
