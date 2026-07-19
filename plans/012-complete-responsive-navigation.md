# 012 — Complete responsive navigation and landmarks

- **Status**: DONE
- **Commit**: 0544618
- **Severity**: HIGH
- **Category**: Wayfinding and accessibility
- **Estimated scope**: 3 files, medium

## Problem

Desktop renders nested `<main>` landmarks, while mobile receives only primary tools and loses Profile Settings and Customize.

```tsx
// components/app-layout.tsx:31 — current
<SidebarInset>
  <main className="flex-1 overflow-y-auto pb-16 md:pb-0">

// components/app-layout.tsx:23 — current
<MobileTabBar navItems={filteredNavItems} />
```

## Target

- Exactly one `<main>` landmark per rendered layout.
- Wrap navigation destinations in a semantic `<nav aria-label="Primary">`.
- Mobile keeps the primary destinations and adds an explicit More menu for Profile Settings and Customize.
- Current destinations expose `aria-current="page"`.
- Edited component functions and interactions use structured logging with `userId` and `action`.

## Repo conventions to follow

- Reuse `DropdownMenu`, `Button`, Lucide icons, and exported navigation metadata.
- Use the existing mobile fixed-bar layout; do not introduce a new router or drawer dependency.
- Use direct, specific labels.

## Steps

1. Export settings navigation metadata from `components/app-sidebar.tsx`.
2. Change the desktop inner `<main>` in `AppLayout` to a non-landmark container because `SidebarInset` already renders `<main>`.
3. Pass settings destinations to `MobileTabBar`.
4. Add a semantic More control with Profile Settings and Customize links.
5. Add navigation landmarks, `aria-current`, accessible icon labels, and structured interaction logs.

## Boundaries

- Do NOT wire placeholder billing/upgrade destinations.
- Do NOT exceed five persistent bottom-bar targets; secondary destinations belong in More.
- Do NOT change authorization or route structure.

## Verification

- **Mechanical**: run `npm run typecheck`; inspect desktop and mobile DOM for exactly one `<main>`.
- **Feel check**: at mobile width, reach every primary tool, Profile Settings, and Customize with keyboard and touch.
- **Done when**: current location is announced and no navigation destination disappears by breakpoint.
