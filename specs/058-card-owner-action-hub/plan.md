# Implementation Plan: Card Owner Action Hub (Owner Controls Redesign)

**Branch**: `058-card-owner-action-hub` | **Date**: 2026-10-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/058-card-owner-action-hub/spec.md` (source HU: `retro-rocket/.hu/card-owner-controls-redesign.md`, RETROROCK-1)

## Summary

Today an owned retrospective card has three owner controls in two places: a colour chip in the header, and edit/delete buttons in the footer. This plan replaces them with one always-visible **Owner Action Hub** trigger in the card footer. The trigger opens an anchored menu with Edit card, a 5×3 colour grid and Delete card. Delete asks for confirmation inside the menu first.

All three actions are shown under one gate, `canEditCard = canEdit && isOwner`. That closes today's UI gap where non-owners see a colour control the server then rejects. The facilitator's convert-to-action `CardMenu` sits next to the trigger and is not changed.

The work is frontend-only. It reuses `useBoardMenuOverlay` (Floating UI), Framer Motion, `cardColors.ts`, `react-hot-toast` and the existing owner-only `PATCH`/`DELETE /api/cards/:id` endpoints. It also adds:

- an optimistic colour update that reverts on failure;
- localized error toasts where failures are silent today;
- focus moving to a predictable place after delete and after edit.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 18.2

**Primary Dependencies**:
- `@floating-ui/react`, through the existing `useBoardMenuOverlay` hook;
- framer-motion, under the app-root `MotionConfig reducedMotion="user"`;
- lucide-react (`Settings2`, `Pencil`, `Trash2`, `Check`);
- react-i18next;
- react-hot-toast;
- Tailwind CSS with the semantic theme tokens;
- @dnd-kit, for the drag state only.

No new dependencies.

**Storage**: N/A. No schema, API or `firestore.rules` change. Card update and delete go through the existing owner-only endpoints, and changes reach other participants through the existing real-time sync.

**Testing**:
- Vitest + Testing Library: new `OwnerActionMenu.test.tsx` and `postDeleteFocus.test.ts`; updated `DraggableCard.test.tsx`, `CardFooter.test.tsx` and `cardColors.a11y.test.ts`.
- Playwright: new `e2e/card-owner-actions.spec.ts`, plus axe scans added to `e2e/accessibility.spec.ts`.

**Target Platform**: Web SPA (Vite → Vercel). Desktop and mobile/tablet browsers, including touch-only devices and projected shared screens.

**Project Type**: Web application. All changes are under `retro-rocket/src/`, with no changes to `server/` or `api/`.

**Performance Goals**:
- The panel responds within 100ms of activation (SC-008).
- Enter/exit animation is 120–200ms, with no layout shift (SC-006).
- No perceptible slowdown on boards with about 20 cards per column. One closed trigger per owned card; the panel is mounted only while open.

**Constraints**:
- WCAG 2.1 AA in light and dark themes: 4.5:1 icon contrast on all 15 card colours, a visible focus ring, 44px touch targets below 768px.
- Principle IX: the Apple-design skills make the visual and motion decisions.
- All copy goes through i18next (es/en).
- `CardMenu.tsx` and `ColorPicker.tsx` stay unchanged.

**Scale/Scope**:
- 1 new component and 1 new pure helper.
- 5 existing components edited: `DraggableCard`, `CardFooter`, `SelectableCard`, `SortableCard`, and `GroupableColumn` (markers only).
- 11 new i18n keys in each of 2 locales.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | The behaviour contract (contracts B1–B10, a11y table) and quickstart scenarios become failing tests first: unit tests for the menu, helper, card and footer, plus e2e. Enforced in `/speckit-tasks` ordering. | ✅ PASS |
| II. Library-First | `OwnerActionMenu` is a self-contained component with a narrow props interface, and post-delete focus is a pure DOM helper in `retrospective/utils/`, both testable in isolation before being wired into `DraggableCard`. | ✅ PASS |
| III. Proven Libraries | Reuses Floating UI (through the shared hook), Framer Motion, lucide-react and react-hot-toast. No new dependency. | ✅ PASS |
| IV. SOLID | The menu owns only its interaction state. Persistence stays behind the existing `onUpdate`/`onDelete` callbacks → `useOptimizedCards` → `backendRetrospectiveClient`. No Firestore access in the UI. | ✅ PASS |
| V. KISS / YAGNI | No global "open menu" store (Floating UI dismissal already gives one-at-a-time), no viewport-specific sheet, no undo. The only new state is the 4-state menu machine plus `pendingColor` and `restoreTriggerFocus`. | ✅ PASS |
| VI. Unit tests & 80% floor | The new component targets ≥ 80% (SC-011). Thresholds in `vitest.config.ts` are untouched. | ✅ PASS |
| VII. Playwright E2E | Card add/edit/delete is a named critical flow ("adding cards"). New `card-owner-actions.spec.ts` covers owner/non-owner visibility, colour, edit, delete with confirmation, and the facilitator coexisting. | ✅ PASS |
| VIII. WCAG 2.1 AA | The a11y contract specifies the menu pattern, keyboard model, live regions, 44px targets, contrast tests on 15 colours × 2 themes, and axe scans in all three panel states. Delete styling pairs colour with an icon. | ✅ PASS |
| IX. Apple design & motion tooling | Implementation tasks must use `apple-design`/`emil-design-eng` (trigger icon, panel layout, destructive separation), `animate` (panel enter/exit, confirm cross-fade) and `review-animations` (before the PR). The PR lists them. | ✅ PASS (enforced in tasks) |
| Real-Time Data Security | No rules or access-pattern change. The server already enforces owner-only edit and delete; the client gate now matches it. | ✅ PASS |
| Error Handling & Resilience | Removes two silent `console.error` paths (colour, delete) in favour of localized toasts plus state recovery. | ✅ PASS (improves) |
| i18n | 11 new keys × es/en; no hardcoded strings. | ✅ PASS |

**Post-design re-check (after Phase 1)**: still passes. The design artifacts add no dependency, persistence or cross-feature state, and nothing goes into Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/058-card-owner-action-hub/
├── plan.md                         # This file
├── research.md                     # Phase 0: decisions §1–§12
├── data-model.md                   # Phase 1: client state machine, DOM markers, i18n keys
├── quickstart.md                   # Phase 1: automated + 19 manual validation scenarios
├── contracts/
│   └── owner-action-menu.md        # Phase 1: component props, behaviour + a11y contract
├── checklists/
│   └── requirements.md             # Spec quality checklist (16/16)
└── tasks.md                        # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
retro-rocket/
├── src/
│   ├── features/boards/
│   │   ├── retrospective/
│   │   │   ├── components/
│   │   │   │   ├── OwnerActionMenu.tsx          # NEW — trigger + menu (Edit · colour grid · Delete/confirm)
│   │   │   │   ├── DraggableCard.tsx            # EDIT — drop header ColorPicker; pendingColor; focus restore; actions slot
│   │   │   │   ├── CardFooter.tsx               # EDIT — drop Edit2/Trash2 + onEdit/onDelete/isDeleting props
│   │   │   │   ├── SelectableCard.tsx           # EDIT — forward isSortableDragging
│   │   │   │   ├── SortableCard.tsx             # EDIT — pass useSortable().isDragging down
│   │   │   │   └── CardMenu.tsx                 # UNCHANGED (facilitator)
│   │   │   └── utils/
│   │   │       └── postDeleteFocus.ts           # NEW — getPostDeleteFocusTarget()
│   │   └── clustering/components/
│   │       └── GroupableColumn.tsx              # EDIT — data-card-column, data-add-card-trigger markers
│   ├── lib/components/ui/ColorPicker.tsx        # UNCHANGED (still used by new-card form)
│   ├── locales/es.json, en.json                 # EDIT — retrospective.card.ownerActions.*
│   └── test/
│       ├── features/boards/retrospective/
│       │   ├── OwnerActionMenu.test.tsx         # NEW
│       │   ├── postDeleteFocus.test.ts          # NEW
│       │   ├── DraggableCard.test.tsx           # EDIT
│       │   └── CardFooter.test.tsx              # EDIT
│       └── lib/utils/cardColors.a11y.test.ts    # EDIT — trigger icon contrast × 15 × 2 themes
└── e2e/
    ├── card-owner-actions.spec.ts               # NEW
    └── accessibility.spec.ts                    # EDIT — axe: panel closed / open / confirming
```

**Structure Decision**: This is the existing web-application layout. Every change sits in the frontend SPA (`retro-rocket/src/`) inside the `boards/retrospective` feature module, with marker-only edits in `boards/clustering`. Tests follow the existing `src/test/` mirror and `e2e/` conventions.

## Implementation approach (order for `/speckit-tasks`)

Each step is test-first (Principle I).

1. **i18n keys**: add the 11 `ownerActions.*` keys to es and en.
2. **`postDeleteFocus.ts`**: tests first (next / previous / add-trigger / null), then the helper.
3. **`OwnerActionMenu`** (Story 1 core): tests first for contract B1–B10 and the a11y table, then the component. Use the `apple-design` skill for the trigger icon and panel layout, and the `animate` skill for enter/exit and the confirm cross-fade.
4. **`CardFooter`**: update tests, then remove edit/delete.
5. **`DraggableCard`**:
   - update tests first: gating matrix, no header picker, optimistic colour + revert + toast, focus restore after edit, footer order with `CardMenu`;
   - then wire it up;
   - forward `isSortableDragging` through `SortableCard` → `SelectableCard`.
6. **`GroupableColumn` markers** and an integration test for post-delete focus.
7. **Contrast**: extend `cardColors.a11y.test.ts`. If the `text-text-secondary` icon fails on any colour, switch it to `text-text-primary`.
8. **E2E**: `card-owner-actions.spec.ts` (quickstart 1–4, 6–8, 11, 12, 14) and axe scans in three states (SC-007).
9. **`review-animations`** pass, quickstart manual run (mobile, reduced motion, dark theme), and the PR note on Principle IX skills.

**Migration safety**: Steps 3–4 can land behind the existing `canEditCard` gate in one PR. There is no data migration and no feature flag, because the change is visual and behavioural only and no server contract changes.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Framer Motion `transform` overwrites Floating UI positioning (known regression) | Mandatory two-node split (research §1), covered by a unit test asserting the role sits only on the positioning node. |
| `role="menu"` with non-item children triggers axe `aria-required-children` | Confirm message is described through `aria-describedby`/live region; axe e2e covers all three states. |
| The trigger icon fails 4.5:1 on a pale pastel in dark theme | Automated 15 × 2 contrast test, with a `text-text-primary` fallback already proven by the same suite. |
| The 44px mobile trigger makes the footer taller on small cards | Accepted by the spec (FR-022). Verified at 375px in the quickstart (#16). |
| Optimistic colour flickers back before sync arrives | `pendingColor` is cleared only when `card.color` matches it (research §5). |

## Complexity Tracking

No constitution violations, so nothing to justify.
