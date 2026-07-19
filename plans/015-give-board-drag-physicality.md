# 015 — Give board dragging physical feedback

- **Status**: DONE
- **Commit**: 0544618
- **Severity**: MEDIUM
- **Category**: Physicality and performance
- **Estimated scope**: 2 files, small

## Problem

Drag state makes the grabbed card fade to 50%, while both card and lanes broadly transition every property.

```tsx
// components/content-engine/content-item-card.tsx:138 — current
transition-all cursor-pointer ${isDragging ? 'opacity-50' : ''}

// components/content-engine/board-view.tsx:153 — current
className={`... border-2 border-dashed transition-all ...`}
```

## Target

- Dragged card reads as lifted: solid card background, `opacity-95`, `scale-[1.015]`, stronger shadow, and emphasized border.
- Card response transitions only `transform`, `opacity`, `box-shadow`, `border-color`, and `background-color` for 160ms using `cubic-bezier(0.23, 1, 0.32, 1)`.
- Lane drag-over transitions only background and border color for 160ms.
- `motion-reduce:transform-none` drops scale movement while preserving color/shadow feedback.

## Repo conventions to follow

- Preserve `@hello-pangea/dnd` positioning; apply lift to the inner card, not the draggable wrapper transform.
- Use semantic card/border/primary tokens.
- Log drag completion with `userId`, `action`, source, destination, and item ID.

## Steps

1. Replace both `transition-all` utilities with scoped property lists and exact timing.
2. Add the inner-card lift treatment for `isDragging`.
3. Strengthen the destination lane without animating size or layout.
4. Add structured drag-completion logging without changing the existing optimistic mutation.

## Boundaries

- Do NOT add Framer Motion or a second drag system.
- Do NOT animate width, height, margin, padding, top, or left.
- Do NOT add bounce; drag positioning remains owned by the DnD library.

## Verification

- **Mechanical**: run `npm run typecheck`; verify no `transition-all` remains in the two edited board surfaces.
- **Feel check**: drag rapidly across lanes; the card remains legible and tangible, and lane response never lags pointer movement.
- **Done when**: dragging feels direct at full speed and remains calm with reduced motion.
