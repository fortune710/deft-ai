# 014 — Fix content dialog draft editing

- **Status**: DONE
- **Commit**: 0544618
- **Severity**: HIGH
- **Category**: Feedback and optimistic state
- **Estimated scope**: 2 files, medium

## Problem

Falsy fallback values prevent users from clearing fields, and save visibility depends on truthiness instead of actual draft changes.

```tsx
// components/content-engine/content-item-dialog.tsx:126 — current
value={editedTitle || item.title}

// components/content-engine/content-item-dialog.tsx:135 — current
value={editedDescription || item.description || ''}

// components/content-engine/content-item-dialog.tsx:176 — current
{(editedTitle || editedDescription) && (
```

## Target

- Initialize drafts from the selected item when the dialog opens or item changes.
- Inputs use draft values directly and allow an empty description.
- Compute dirty state by comparing drafts with item values.
- Reject only an empty trimmed title.
- `useUpdateContentItem` updates the Convex list cache optimistically before the request resolves.
- Copy controls are disabled when their section has no content.
- Every edited handler logs `userId`, `action`, item ID, and errors through the logger.

## Repo conventions to follow

- Follow the optimistic Convex pattern in `useUpdateItemPosition`.
- Use existing toasts and form controls.
- No `console.*`.

## Steps

1. Replace empty-string sentinel state with real item-backed draft initialization.
2. Derive `isDirty`; always render an explicit save area with accurate disabled/pending state.
3. Send both title and description in one optimistic update.
4. Add `.withOptimisticUpdate` to `useUpdateContentItem` for the list query.
5. Disable empty copy actions and log copy/save outcomes.

## Boundaries

- Do NOT change generated-content schemas.
- Do NOT remove the title non-empty constraint.
- Do NOT delay local visual state until the network completes.

## Verification

- **Mechanical**: run `npm run typecheck`.
- **Feel check**: clear a description, save, and confirm it stays empty immediately; simulate failure and confirm Convex rollback restores server state.
- **Done when**: draft behavior is predictable, optimistic, and never falsely confirms copying empty content.
