# 018 — Synchronize the chat resize handle

- **Status**: DONE
- **Commit**: 0544618
- **Severity**: LOW
- **Category**: Cohesion and performance
- **Estimated scope**: 1 file, small

## Problem

The resize handle is conditionally mounted with the chat panel and uses `transition-all`. Its width also changes on hover, so the boundary can animate an unintended layout property and appear as a separate event from the panel surface.

```tsx
// app/script-creator/edit-content/[itemId]/page.tsx:147 — current
<ResizableHandle className="w-1.5 bg-transparent hover:bg-primary/20 hover:w-2 transition-all group relative">
  <div className="absolute inset-y-1/2 -left-0.5 right-0.5 h-12 bg-border group-hover:bg-primary/50 transition-colors rounded-full" />
</ResizableHandle>
```

`components/ui/resizable.tsx:23-42` supplies its own handle children and does not render arbitrary children passed by this call site, so the nested decorative bar is not a reliable animation target.

## Target

- Keep the handle mounted beside the permanently mounted panel introduced by plan 017.
- Give the handle a fixed width for both states. Remove `hover:w-2` and `transition-all`.
- Animate only `opacity` and `background-color`:
  - Visible: `opacity: 1`.
  - Hidden: `opacity: 0`, `pointer-events: none`.
  - Duration: `160ms`.
  - Easing: `cubic-bezier(0.23, 1, 0.32, 1)`.
- Disable the resize handle while the chat is closing or closed so dragging cannot race the panel collapse.
- Reduced motion may retain this opacity/color transition because it has no positional movement.
- Remove the ineffective nested decorative `<div>` from the page rather than changing the shared resizable component.

## Repo conventions to follow

- `components/onboarding/motion.ts:3` defines the same strong ease-out curve as `[0.23, 1, 0.32, 1]`.
- Existing controls use Tailwind arbitrary transition-property and timing-function utilities.
- The handle remains a direct child of `ResizablePanelGroup`; do not wrap it in a motion component.
- `app/script-creator/edit-content/[itemId]/page.tsx` already has structured logging for the controlling toggle. No additional hover logging is needed.

## Steps

1. Execute plan 017 first so the handle and chat panel can remain mounted together.
2. In `app/script-creator/edit-content/[itemId]/page.tsx`, remove the nested decorative `<div>` from `ResizableHandle`.
3. Replace `transition-all` and `hover:w-2` with a fixed width and `transition-[opacity,background-color] duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]`. Tailwind's `duration-150` is acceptable for the specified 160ms interaction budget because this repo's utility scale has no 160ms token; if exactness is required, use `duration-[160ms]`.
4. Branch the handle class from the same requested-visibility state used in plan 017: open uses `opacity-100`; closing/closed uses `pointer-events-none opacity-0`.
5. Pass `disabled={!showChat}` (or the equivalent requested-visibility boolean) to the resize handle.

## Boundaries

- Do NOT edit `components/ui/resizable.tsx`.
- Do NOT animate handle width, height, margin, padding, top, left, or flex values.
- Do NOT add keyframes, scale, bounce, or a new dependency.
- Do NOT change the panel sizes or collapse timing owned by plan 017.

## Verification

- **Mechanical**: run `./node_modules/.bin/eslint 'app/script-creator/edit-content/[itemId]/page.tsx'`; run `git diff --check`; verify `rg -n "hover:w-2|transition-all" 'app/script-creator/edit-content/[itemId]/page.tsx'` has no match in the chat handle.
- **Feel check**: open and close the panel at normal speed and 10% playback. The handle must fade as part of the same event, never remain visible over a closed panel, and never widen on hover.
- Rapidly click the panel toggle and attempt to drag the boundary while it closes. The handle must not capture pointer input after closing starts.
- Emulate reduced motion; the same short opacity/color feedback may remain because it has no movement.
- **Done when**: the boundary reads as part of the drawer, does not animate layout, and cannot be dragged while hidden.
