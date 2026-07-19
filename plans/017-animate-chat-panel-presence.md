# 017 — Animate chat panel presence

- **Status**: DONE
- **Commit**: 0544618
- **Severity**: MEDIUM
- **Category**: Spatial consistency and accessibility
- **Estimated scope**: 1 file, medium

## Problem

The edit-content workspace conditionally inserts and removes the entire chat panel. The panel therefore teleports between absent and fully visible, while the editor immediately changes width.

```tsx
// app/script-creator/edit-content/[itemId]/page.tsx:145 — current
{showChat && (
  <>
    <ResizableHandle className="w-1.5 bg-transparent hover:bg-primary/20 hover:w-2 transition-all group relative">
      <div className="absolute inset-y-1/2 -left-0.5 right-0.5 h-12 bg-border group-hover:bg-primary/50 transition-colors rounded-full" />
    </ResizableHandle>
    <ResizablePanel defaultSize={30} minSize={25} maxSize={40} className="border-l bg-accent/30 shadow-inner flex flex-col">
      <ChatPanel ... />
    </ResizablePanel>
  </>
)}
```

Because the control is a right-edge panel toggle, the missing motion also removes the spatial explanation connecting the `PanelRight` button to the surface it controls.

## Target

- Keep the chat `ResizablePanel` mounted and make it `collapsible` with `collapsedSize={0}` so its state remains interruptible and reopening does not recreate chat state.
- Animate the chat surface with Framer Motion using only `transform` and `opacity`:
  - Open: `opacity: 1`, `transform: "translateX(0%)"`.
  - Closed: `opacity: 0`, `transform: "translateX(100%)"`.
  - Duration: `0.24` seconds.
  - Easing: `[0.32, 0.72, 0, 1]`, the exact drawer curve corresponding to `cubic-bezier(0.32, 0.72, 0, 1)`.
- Closing must let the visual exit complete before calling the panel handle's `collapse()` method. Opening must call `expand()` before animating the surface in.
- Use a small internal presence state if needed so a rapid close-then-open cancels the pending collapse instead of snapping or restarting from an unrelated state.
- Add `useReducedMotion()`:
  - Reduced motion keeps the `opacity` transition for `0.2` seconds using `[0.23, 1, 0.32, 1]`.
  - Reduced motion uses `transform: "translateX(0%)"` for both states.
- When visually closed, the chat surface must set `aria-hidden="true"` and be inert so its textarea and buttons cannot receive keyboard focus.
- Preserve the last user-resized expanded width when closing and reopening. Do not force every reopen back to 30%.

## Repo conventions to follow

- Framer Motion is already installed and used in the app.
- `components/onboarding/motion.ts:3` defines the repo's strong ease-out as `[0.23, 1, 0.32, 1]`.
- `components/onboarding/niche-mapping-form.tsx:182` uses `AnimatePresence` and reduced-motion branching for state transitions.
- `app/script-creator/edit-content/[itemId]/page.tsx` already creates a file logger child and includes `userId` in structured logs. Any new callback or effect must log `action`, `userId`, and `itemId`; panel API failures must include `error`.
- Use the existing `react-resizable-panels` imperative panel handle type rather than introducing another sizing system.

## Steps

1. In `app/script-creator/edit-content/[itemId]/page.tsx`, import `motion` and `useReducedMotion` from `framer-motion`, plus the imperative panel handle type from `react-resizable-panels`.
2. Add a ref for the chat `ResizablePanel` and the minimum internal state needed to distinguish requested visibility from whether the panel has finished its exit.
3. Replace conditional mounting of the chat `ResizablePanel` with a permanently mounted `collapsible` panel using `collapsedSize={0}`, `defaultSize={30}`, `minSize={25}`, and `maxSize={40}`.
4. Wrap `ChatPanel` in a full-height `motion.div`. Apply the exact open, closed, transition, reduced-motion, inert, and `aria-hidden` values from Target.
5. On open, cancel any pending collapse, expand the resizable panel, and animate the surface from right to left. On close, animate the surface rightward and collapse only after that exit completes. Guard animation completion so a stale close completion cannot collapse a panel that was reopened.
6. Keep the `PanelRight` button's existing `aria-pressed`, label, structured logging, and visual selected state.
7. Do not animate the editor by changing width, margin, or flex values manually. Let `react-resizable-panels` own layout sizing; this plan owns the panel surface transition only.

## Boundaries

- Do NOT modify `components/editor/chat-panel.tsx` or chat message/input behavior.
- Do NOT add a dependency; use the installed `framer-motion` and `react-resizable-panels` packages.
- Do NOT animate width, height, margin, padding, top, left, or `flex-grow`.
- Do NOT use CSS keyframes; the toggle must remain interruptible.
- Do NOT add bounce.
- If the installed `react-resizable-panels` imperative handle cannot preserve expanded size, STOP and report the API mismatch instead of substituting a hardcoded width animation.

## Verification

- **Mechanical**: run `./node_modules/.bin/eslint 'app/script-creator/edit-content/[itemId]/page.tsx'`; run `git diff --check`; confirm no new `transition-all`, width animation, or keyframes were added.
- **Feel check**: run the app and open/close the panel repeatedly. Confirm the surface travels from the right edge, the first frame responds immediately, and rapid toggles never flash or collapse after reopening.
- In DevTools, set animation playback to 10%. Confirm the panel uses `translateX` and opacity only, with no scale or blur.
- Resize the panel, close it, reopen it, and confirm the expanded width is retained.
- Emulate `prefers-reduced-motion: reduce`; confirm position movement disappears while a brief opacity transition remains.
- Tab through the page while the panel is closed; no chat control may receive focus.
- **Done when**: open/close is spatial, interruptible, accessible, and preserves the user's resized width without animating layout properties manually.
