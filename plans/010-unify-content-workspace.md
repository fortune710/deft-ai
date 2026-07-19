# 010 — Unify the content workspace controls and states

- **Status**: DONE
- **Commit**: 0544618
- **Severity**: HIGH
- **Category**: Wayfinding, feedback, performance
- **Estimated scope**: 3 files, medium

## Problem

The default board consumes filter state but does not render the controls that change it. Search also expands by animating layout, generation can coexist with a contradictory empty message, and existing structure-matching skeletons are bypassed.

```tsx
// app/content-engine/page.tsx:184 — current
{viewMode === 'list' && (
  <div className="flex items-center gap-2">

// app/content-engine/page.tsx:197 — current
"flex items-center transition-all duration-300 ease-in-out",
showSearch ? "w-[240px] opacity-100" : "w-0 opacity-0 overflow-hidden"

// app/content-engine/page.tsx:328 — current
{itemsLoading ? (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="w-8 h-8 animate-spin" />
  </div>
```

## Target

- Render one persistent desktop workspace toolbar for board and table.
- Keep search at a stable width; do not animate `width` or use `transition-all`.
- Apply search, platform, and status filters to the board.
- During generation with zero items, show generation progress—not an empty message.
- Use `BoardViewSkeleton` or `ListViewSkeleton` while items load.
- Use `storageKeys.localStorage.contentEngineView` and `storageKeys.reactQuery.contentItems` instead of string literals.

## Repo conventions to follow

- Use `cn`, semantic color tokens, Radix controls, and existing skeleton components.
- Use the logger child pattern from `components/app-sidebar.tsx`; every edited named handler logs `userId`, `action`, and relevant state.
- Keep view selection synchronous before persistence.

## Steps

1. Add `contentEngineView` to `utils/storage-keys.ts` and consume it in the page.
2. Replace raw React Query key literals in the edited page with `storageKeys.reactQuery.contentItems`.
3. Restructure the header and controls as sticky workspace chrome with clear title, view switcher, stable search, filter, and generation action.
4. Pass `statusFilter` into `BoardView` and apply it together with search/platform filtering.
5. Replace the centered item spinner with the view-matched skeleton.
6. Suppress every empty-state message while generation is active and show one accurate progress state.

## Boundaries

- Do NOT change generation APIs or item data shapes.
- Do NOT add a board/table slide animation; this is a high-frequency control.
- Do NOT animate layout properties.
- Do NOT add dependencies.

## Verification

- **Mechanical**: run `npm run typecheck`; verify no raw `content-engine-view` or `['content-items']` remains in the edited page.
- **Feel check**: switch views repeatedly; controls do not move, board filters remain controllable, and loading preserves the final workspace shape.
- **Done when**: both views share the same controls and every loading/generation/empty state is mutually exclusive and accurate.
