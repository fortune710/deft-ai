# 005 — Remove serialized step-transition latency

- **Status**: DONE
- **Commit**: 0544618
- **Severity**: MEDIUM
- **Category**: Response and interruptibility
- **Estimated scope**: 1 file, small

## Problem

The form uses `AnimatePresence mode="wait"`, forcing the outgoing step to finish before the new one mounts. This creates avoidable latency after Continue or Back.

```tsx
// components/onboarding/niche-mapping-form.tsx:142 — current
<AnimatePresence mode="wait">
```

## Target

After plan 004, use `mode="sync"` (or omit the mode, whose default is sync) with the shared 240ms directional transition. Outgoing and incoming steps overlap while staying absolutely isolated inside a stable layout wrapper. Interaction must not be locked for the duration.

If overlap causes container-height collapse, use a CSS grid stack:

```tsx
<div className="grid">
  <div className="col-start-1 row-start-1">...</div>
</div>
```

Do not animate height.

## Repo conventions to follow

- Use the variants created by plan 004.
- Keep `AnimatePresence` because it provides interruptible exit tracking.
- Keep the main content width at `max-w-5xl` and step width at `max-w-xl`.

## Steps

1. Execute plan 004 first.
2. Replace `mode="wait"` with synchronized presence.
3. Ensure the presence wrapper keeps a stable content area during overlap.
4. Ensure Continue and Back are not disabled solely because a transition is playing.
5. Verify rapid reversals animate from the current presentation state without duplicated focusable controls lingering after exit.

## Boundaries

- Do NOT animate layout height or use artificial timers.
- Do NOT change submission loading locks.
- Do NOT duplicate step content in persistent DOM after exit completes.

## Verification

- **Mechanical**: lint and typecheck `niche-mapping-form.tsx`.
- **Feel check**: click Continue and immediately Back. The interface must reverse cleanly with no blank frame and no wait between action and incoming content.
- **Done when**: the next step becomes visible immediately and rapid reversal remains coherent.
