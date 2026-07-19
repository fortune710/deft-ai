# 016 — Refine content metadata typography

- **Status**: DONE
- **Commit**: 0544618
- **Severity**: MEDIUM
- **Category**: Typography and hierarchy
- **Estimated scope**: 3 files, small

## Problem

High-frequency board and table metadata uses 9–10px black/bold uppercase text with wide tracking, making the workspace noisy and difficult to scan.

```tsx
// components/content-engine/content-item-card.tsx:145 — current
"... text-[9px] font-black uppercase tracking-widest ..."

// components/content-engine/list-view.tsx:264 — current
className="text-[10px] ... uppercase tracking-widest font-bold ..."
```

## Target

- Column/table labels: `text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground`.
- Platform metadata: `text-[11px] font-semibold tracking-[0.02em]`; retain platform casing instead of forcing uppercase.
- Card titles: `text-sm font-semibold leading-snug tracking-[-0.01em]`.
- Supporting copy: `text-xs leading-5 text-muted-foreground`.
- Preserve tabular counts and existing platform colors.

## Repo conventions to follow

- Use semantic foreground tokens rather than adding another gray scale.
- Keep system/app font configuration unchanged.
- Edited component functions log render/interaction context per `AGENTS.md` with `userId` and `action`.

## Steps

1. Normalize board column headings and counts.
2. Normalize card platform badges, titles, and descriptions.
3. Normalize table headers and platform badges with the exact target styles.
4. Check truncation and wrapping at 200% text zoom.

## Boundaries

- Do NOT change copy or data values.
- Do NOT globally change badge or table primitives.
- Do NOT add a custom font.

## Verification

- **Mechanical**: run `npm run typecheck`; verify scoped files no longer contain `text-[9px]`, `text-[10px]`, `font-black`, or `tracking-widest` for metadata.
- **Feel check**: scan board and table in light/dark mode and at 200% zoom; labels remain secondary but readable.
- **Done when**: titles lead, metadata supports, and dense UI no longer depends on microscopic text.
