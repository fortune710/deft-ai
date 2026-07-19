# UI and motion implementation plans

These plans were audited against commit `0544618`. Execute them in the order below because later consolidation plans depend on earlier behavior changes.

| Plan | Title | Severity | Status | Dependencies |
| --- | --- | --- | --- | --- |
| 001 | Respect onboarding motion preferences | HIGH | DONE | None |
| 002 | Move progress animation to the compositor | HIGH | DONE | 001 |
| 003 | Tighten selection and control transitions | HIGH | DONE | 001 |
| 004 | Give step navigation spatial direction | MEDIUM | DONE | 001 |
| 005 | Remove serialized step-transition latency | MEDIUM | DONE | 004 |
| 006 | Reserve continuous motion for real progress | MEDIUM | DONE | 001, 002 |
| 007 | Make selectable rows feel immediate and explicit | MEDIUM | DONE | 003 |
| 009 | Unify onboarding hierarchy and materials | MEDIUM | DONE | 003, 007 |
| 008 | Create one onboarding motion vocabulary | LOW | DONE | 001–007, 009 |
| 010 | Unify the content workspace controls and states | HIGH | DONE | None |
| 011 | Make content cards accessible and directly actionable | HIGH | DONE | 010 |
| 012 | Complete responsive navigation and landmarks | HIGH | DONE | None |
| 013 | Strengthen sidebar wayfinding and recovery | HIGH | DONE | 012 |
| 014 | Fix content dialog draft editing | HIGH | DONE | 010 |
| 015 | Give board dragging physical feedback | MEDIUM | DONE | 011 |
| 016 | Refine content metadata typography | MEDIUM | DONE | 010, 011, 015 |
| 017 | Animate chat panel presence | MEDIUM | DONE | None |
| 018 | Synchronize the chat resize handle | LOW | DONE | 017 |

## Recommended execution order

1. Establish accessibility behavior with 001.
2. Fix the two highest-cost motion patterns with 002 and 003.
3. Implement directional, immediately responsive navigation with 004 and 005.
4. Remove purposeless looping motion with 006.
5. Improve selection semantics and tactile response with 007.
6. Apply the shared visual hierarchy and component system with 009.
7. Consolidate the settled behavior into the motion vocabulary in 008.
8. Establish the content workspace and responsive navigation with 010 and 012.
9. Improve object actions and sidebar wayfinding with 011 and 013.
10. Fix dialog draft behavior with 014.
11. Add board physicality with 015, then finish hierarchy with 016.
12. Animate the edit-content chat panel with 017, then synchronize its resize handle with 018.

After each plan, perform its mechanical checks and feel check before proceeding. Plans 004, 005, 007, and 009 require testing with keyboard and touch input; plans 001, 009, and 017 require accessibility media-query testing.
