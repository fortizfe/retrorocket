feat(cards): unify card owner controls into an Owner Action Hub (058)

## Summary
- Replaces the scattered owner controls on retrospective cards with one **Owner Action Hub**. Before, the colour chip sat in the header corner and the edit and delete buttons sat in the footer. Now there is one always-visible trigger in the card footer. It opens an anchored menu with **Edit card**, a **5×3 colour grid** and **Delete card**, and Delete asks for confirmation inside the same menu.
- All owner actions sit behind one gate (`canEdit && isOwner`). This also applies to cards inside groups.
- **Fixes a pre-existing production bug (on `main`)**: `RetrospectivePage` passed the user's *display name* as `currentUser`, but cards, likes and reactions store the **uid**. As a result:
  - `isOwner` was always false: the old edit and delete buttons never appeared for anyone, and the colour chip showed for everyone because it did not check ownership.
  - The "I liked this", "my reaction" and typing-indicator self-checks were also wrong.

  Now fixed: the page passes the uid. There is a regression test with uid ≠ name.
- Silent failures are gone. A failed delete or colour change now shows a localized toast and recovers: the card stays, or the colour reverts. Colour changes now show immediately.
- Focus is predictable:
  - after a delete, focus moves to the next card, then the previous one, then the column's "Add card" button;
  - after Save or Cancel, it returns to the trigger.
- The facilitator's convert-to-action menu (⋮) is unchanged. It sits next to the hub, with a different icon (`Settings2` vs `MoreVertical`).
- The in-app guide topic "Cards & colours" is updated in es and en.
- Spec-kit trail: `specs/058-card-owner-action-hub/` (spec, clarifications, plan, research incl. §13 design/motion decisions, data-model, contracts, quickstart, tasks, agent-assignments). Source story: RETROROCK-1.

Built with TDD (tests first) across 36 tasks, delegated to `frontend-agent`, `qa-agent` and `docs-agent` per `agent-assignments.yml`.

## Accessibility (Constitution Principle VIII, WCAG 2.1 AA)
- WAI-ARIA menu pattern:
  - the trigger has `aria-haspopup="menu"` and `aria-expanded`;
  - `menuitem` and `menuitemradio` swatches, with a check icon on the selected one so selection is not shown by colour alone;
  - a 2-D arrow-key grid, Home/End, and Escape/Tab close and return focus.
- Announcements:
  - the delete confirmation goes through an assertive live region outside the menu;
  - colour changes go through a polite live region on the card.
- Contrast: the trigger icon passes **≥ 4.5:1 on all 15 card colours × light/dark** (automated, `cardColors.a11y.test.ts`).
- Targets: 44×44px below 768px and 36×36px at 768px and above (verified in e2e).
- **axe: 0 violations** with the panel closed, open and confirming delete (desktop and touch viewports, both themes).
- Floating UI focus-guard spans tripped axe `aria-hidden-focus`. They are disabled locally in `OwnerActionMenu` (`guards={false}`, `preserveTabOrder={false}`), which is safe because the panel closes on Tab itself. **Known, pre-existing**: the same violation exists in the untouched facilitator `CardMenu`, which needs a follow-up.

## Design & motion (Constitution Principle IX)
Skills used:
- **`apple-design`** and **`emil-design-eng`**: trigger icon, panel layout, destructive separation, confirm hierarchy.
- **`animate`**: 150ms panel enter/exit with full transform strings, a 120ms opacity-only confirm cross-fade, and an immediate unmount on drag.
- **`review-animations`**: two findings applied (the trigger press feedback was not transitioning `transform`; menu rows were missing `transition-colors`).

Reduced motion is honoured through the app-wide `MotionConfig`. Zero layout shift is measured in e2e.

## Test plan
- [x] Unit/component: `npm run test:run`, 2775+ passing, exit 0, no unhandled errors.
- [x] `npm run type-check`, `npm run lint`: exit 0.
- [x] Coverage: `OwnerActionMenu.tsx` 98% lines / 83% branches; `postDeleteFocus.ts` 100% lines / 93% branches. Global thresholds hold.
- [x] E2E, new `e2e/card-owner-actions.spec.ts`:
  - visibility and gating, including anonymous boards and grouped cards;
  - colour sync across users;
  - edit, delete with confirm, and the focus targets;
  - facilitator coexistence;
  - offline failures;
  - a double Confirm sends exactly one DELETE;
  - reduced motion and zero layout shift;
  - viewport containment and dark theme.
- [x] E2E a11y, `e2e/accessibility.spec.ts`: axe in 3 panel states plus target sizes. The 5 old header-ColorPicker tests were rewritten against the hub's colour grid and the add-card form's ColorPicker, so no coverage was lost.
- [x] Shared fixture fix: `e2e/fixtures/board.ts` scoped `addCardToFirstColumn` to the first column. Before, it could add a card to the wrong column.
- [x] Quickstart scenarios: 17/19 fully automated. #13 (panel closes live when another user starts grouping mode) and #17 (right-edge flip) are covered only at unit / top-edge level.
- [ ] Known pre-existing e2e flakes, which also fail on `main`: `accessibility.spec.ts:430` (grouping-suggestions timeout) and `concurrent-board-network.spec.ts:22` under full-suite load.

## Follow-ups (not in this PR)
- Apply the same focus-guard axe fix to the facilitator `CardMenu` (pre-existing violation).
- `onLike` and `onReaction` still pass identity arguments that are never sent to the server (dead parameters). They can be cleaned up separately.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
