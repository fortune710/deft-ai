# 011 — Make content cards accessible and directly actionable

- **Status**: DONE
- **Commit**: 0544618
- **Severity**: HIGH
- **Category**: Accessibility and control mapping
- **Estimated scope**: 1 file, medium

## Problem

The board card is a clickable `div` with no link semantics or keyboard behavior. Its overflow action is also hidden only through hover opacity.

```tsx
// components/content-engine/content-item-card.tsx:136 — current
<div
  onClick={handleCardClick}
  className={`group ... cursor-pointer ...`}
>

// components/content-engine/content-item-card.tsx:156 — current
className="h-6 w-6 opacity-0 group-hover:opacity-100 z-10"
```

## Target

- Use a real `Link` for the card's primary “open content” action.
- Keep schedule and overflow controls as separate semantic buttons, never nested inside the link.
- Show the overflow control for keyboard focus (`group-focus-within`) and touch/coarse pointers; do not make access hover-only.
- Use scoped 160ms response transitions with `cubic-bezier(0.23, 1, 0.32, 1)` and `motion-reduce:transform-none`.
- Replace `console.error` with structured logging including `userId`, `action`, item ID, and error.

## Repo conventions to follow

- Use Next `Link`, existing `Button`, `cn`, and the logger child pattern.
- Preserve Radix event isolation around menus/popovers.
- Keep destructive confirmation behavior unchanged.

## Steps

1. Remove router-driven card click handling.
2. Make title/description a clearly focused link to `/script-creator/edit-content/${item.id}`.
3. Keep date and overflow controls outside the link with visible focus rings and accessible labels.
4. Make overflow visibility work for hover, focus-within, and touch.
5. Add structured logs to edited interactions and remove `console.error`.

## Boundaries

- Do NOT change rename, duplicate, schedule, or delete data behavior.
- Do NOT make a link contain buttons.
- Do NOT use `transition-all`.

## Verification

- **Mechanical**: run `npm run typecheck`; search the file for `console.` and `onClick={handleCardClick}`—both must be absent.
- **Feel check**: tab through a card; open, date, and overflow are separately reachable and focus-visible. Touch users can always find overflow.
- **Done when**: the primary action works with Enter and all secondary actions remain independent.
