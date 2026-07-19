# 007 — Make selectable rows feel immediate and explicit

- **Status**: DONE
- **Commit**: 0544618
- **Severity**: MEDIUM
- **Category**: Physicality and accessibility
- **Estimated scope**: 5 files, medium

## Problem

Onboarding choices visually depend on subtle color and border changes. The option buttons do not expose selected state through `aria-pressed`, and the custom-answer container is a clickable `div` around a textarea.

```tsx
// components/onboarding/steps/step-1-chat-agent.tsx:440 — current
<div
  className={cn("w-full flex items-center ... border transition-all mt-1", ...)}
  onClick={() => handleAnswerSelect(currentQuestion.id, 'custom')}
>
```

## Target

- Single-select and toggle buttons expose `aria-pressed={isSelected}`.
- Option rows add instant press response: `active:scale-[0.98]` and `transition-transform duration-150 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)]`.
- Keyboard focus uses a consistent visible ring and never relies solely on color.
- Selected state includes an explicit check/radio mark.
- Custom answer uses a semantic grouping: the textarea receives focus normally, its wrapper uses `focus-within` for selected styling, and no non-semantic clickable `div` acts as a button.
- Touch targets remain at least 44px tall.

## Repo conventions to follow

- Use `cn` and existing color tokens.
- Reuse Lucide `Check`/`CheckCircle2` rather than custom SVG.
- Keep the shared Button component's existing active feedback; apply row-specific scale only to raw option buttons.
- Any handler edited for semantics must receive structured logging per `AGENTS.md` without `console.*`.

## Steps

1. Add `type="button"` and `aria-pressed` to every selectable raw button in steps 1–5.
2. Add the exact 150ms press transform to selectable rows.
3. Add consistent `focus-visible` ring utilities and explicit selected marks.
4. Refactor the custom-answer wrapper so `focus-within` controls its visual state and the textarea remains the only text interaction target.
5. Preserve optimistic local selection: visual state changes synchronously on pointer activation.

## Boundaries

- Do NOT change option values, validation, or Clerk/Convex behavior.
- Do NOT animate from `scale(0)`.
- Do NOT remove textarea focus indication entirely; move it to the containing option surface.

## Verification

- **Mechanical**: lint changed files; inspect rendered buttons for `aria-pressed`.
- **Feel check**: mouse-down/touch-down produces immediate subtle compression. Tab navigation always shows location. Screen readers announce pressed state. The custom answer has one coherent focus surface.
- **Done when**: selection is legible without color alone and all choice controls respond immediately.
