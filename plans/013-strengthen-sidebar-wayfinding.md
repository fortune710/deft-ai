# 013 — Strengthen sidebar wayfinding and recovery

- **Status**: DONE
- **Commit**: 0544618
- **Severity**: HIGH
- **Category**: Agency, wayfinding, response
- **Estimated scope**: 1 file, small

## Problem

The sidebar defaults to off-canvas collapse without rendering a trigger or rail. Active matching is exact-only, the active appearance shares the same primitive accent as hover, and icons receive both primitive gap and `mr-2`.

```tsx
// components/app-sidebar.tsx:115 — current
<Sidebar>

// components/app-sidebar.tsx:147 — current
const isActive = pathname === item.href;

// components/app-sidebar.tsx:152 — current
<Icon className="mr-2 h-4 w-4" />
```

## Target

- Use icon collapse rather than disappearing off-canvas.
- Render a focusable `SidebarRail` and tooltips for collapsed navigation.
- Match child routes with `pathname === href || pathname.startsWith(`${href}/`)`.
- Give active rows a distinct primary-tinted surface/indicator and `aria-current="page"`; hover remains quieter.
- Remove doubled icon margin.
- Logo links to `/content-engine`; version metadata is visually secondary.

## Repo conventions to follow

- Reuse `SidebarRail`, `SidebarMenuButton`, `Link`, and existing semantic tokens.
- Keep the existing logger child and include `userId` in any edited handler log.
- Use scoped color/transform transitions only; exact press feedback is `active:scale-[0.98]` over 160ms with `cubic-bezier(0.23, 1, 0.32, 1)` and reduced-motion opt-out.

## Steps

1. Set `collapsible="icon"` and render `SidebarRail tabIndex={0}`.
2. Add tooltips and parent-route-aware active state to tool and settings rows.
3. Add `aria-current`, a clear active treatment, subtle press feedback, and remove icon `mr-2`.
4. Replace the `#` brand anchor with a product-home Link and demote version typography.

## Boundaries

- Do NOT edit the shared sidebar primitive.
- Do NOT animate the Cmd/Ctrl+B keyboard toggle.
- Do NOT add decorative gradients.

## Verification

- **Mechanical**: run `npm run typecheck`.
- **Feel check**: collapse, navigate to a child route, and confirm the parent remains selected; tab to the rail and restore the sidebar.
- **Done when**: the sidebar never becomes unrecoverable and current location is unmistakable.
