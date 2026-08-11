# Phase 0 Research: Card Actions Menu Anchored Positioning

No items in Technical Context were left as `NEEDS CLARIFICATION` — `/speckit-clarify` found no critical ambiguities in the spec itself. What follows is the code-level root-cause investigation, performed directly against `main` (commit `4a9aa3f`).

## 1. Root cause of "pinned to the top-left corner" (FR-001–FR-004)

**Decision**: `CardMenu.tsx`'s floating panel (`CardMenu.tsx:79-89`) applies **both** Floating UI's `ref={refs.setFloating}`/`style={floatingStyles}` (whose `style.transform` encodes the computed anchor offset, e.g. `translate(240px, 380px)`) **and** Framer Motion's `initial`/`animate`/`exit` — which includes `scale: 0.95 → 1` — to the *same* `motion.div` node. Framer Motion writes its own `transform` (e.g. `scale(1)`) on that node on every animation frame, which **overwrites, not composes with**, Floating UI's positioning `transform`. With no active positioning transform, the panel renders at its element's base position — `position: fixed; top: 0; left: 0` inside the `FloatingPortal` — i.e. pinned to the viewport's top-left corner, exactly the reported symptom.

**This is not a new diagnosis — it is a known, previously-fixed defect class in this exact codebase, left unfixed here on purpose**: feature 034 (`specs/034-fix-retro-board-bugs`) diagnosed and fixed the identical collision in `RetrospectiveTopbar.tsx`'s options menu and `FacilitatorMenu.tsx` (its `research.md` §1). That research explicitly flagged, under "Scope note":

> `CardMenu.tsx` and `ColumnHeaderMenu.tsx` share the identical pattern (`motion.div` + `style={floatingStyles}` + `animate` including `scale`) and are very likely affected the same way, but neither is named in spec.md's User Story 1 or in the user's bug report. Left untouched per Constitution Principle V (Simplicity/YAGNI).

Direct inspection of `CardMenu.tsx` on `main` today confirms that prediction was correct and remains true: lines 79-88 still show `motion.div` carrying `ref={refs.setFloating}`, `style={floatingStyles}`, and `initial={{ opacity: 0, scale: 0.95 }}` / `animate={{ opacity: 1, scale: 1 }}` / `exit={{ opacity: 0, scale: 0.95 }}` on one node. This is the current feature's bug report arriving for the sibling component 034 predicted but didn't touch.

**Confirming evidence — the fix has already shipped three times for sibling components**:
- `ReactionPicker.tsx` (predates the collision entirely) — a plain `<div>` carries `style={floatingStyles}` with no competing `animate` prop; it has never exhibited this bug.
- `RetrospectiveTopbar.tsx`'s options menu and `FacilitatorMenu.tsx` (feature 034, shipped in release ≥1.16.0) — both split into an outer non-animated positioning `<div ref={refs.setFloating} style={floatingStyles}>` wrapping an inner `motion.div` that owns only `initial`/`animate`/`exit`/`transition`.
- `ColorPicker.tsx` (feature 037, shipped in release 1.18.0) — same split, plus a refinement: the inner `motion.div`'s `animate`/`initial`/`exit` use full `transform: 'scale(0.94) translateY(-4px)'` strings instead of Framer Motion's `scale`/`y` shorthand props, because (per that file's own comment, citing feature 036 T039) the shorthand properties animate via `requestAnimationFrame` on the main thread and can drop frames under load — the full-string form lets Framer Motion use its more efficient animation path.

**Alternatives considered**:
- *Use Floating UI's `transform: false` option, switching to literal `top`/`left` pixel values.* Rejected — same reasoning `research.md` §1 in feature 034 already gave: Framer Motion would still need to express `scale` as a `transform`, recreating the identical collision on the same node.
- *Remove the entrance/exit animation from `CardMenu` entirely.* Rejected — regresses existing polish and violates Constitution Principle IX's expectation that motion decisions go through the `animate` skill deliberately, not be stripped reactively, when the proven split-node fix is directly available and requires no new design decision.
- *Fix `useBoardMenuOverlay` itself so no consumer can make this mistake (e.g., have the hook forbid/warn on animate props).* Rejected — the hook doesn't render the floating panel at all (each consumer renders its own JSX inside `FloatingPortal`), so this isn't a hook-level defect; changing the hook's contract to police consumer JSX would be a disproportionate, speculative abstraction for a JSX-structure mistake, and would still leave `ColumnHeaderMenu.tsx`'s existing instance unaddressed unless that consumer were also touched (out of scope, see below).

## 2. Why the codebase's own prior fix didn't already prevent this

**Decision**: No structural safeguard prevents a `useBoardMenuOverlay` consumer from putting `style={floatingStyles}` and an `animate` prop on the same node — the fix pattern is documented in code comments (`FacilitatorMenu.tsx:183-190`, `ColorPicker.tsx`'s own top-of-block comment) and reinforced by feature 034's `contracts/ui-behavior-contracts.md` Contract 1, but nothing enforces it project-wide. `CardMenu.tsx` and `ColumnHeaderMenu.tsx` were written (`CardMenu.tsx` predates feature 034; `ColumnHeaderMenu.tsx` per feature 034's own scope note) without the split and were never brought into line because each prior feature scoped itself narrowly to its own reported symptom (Constitution Principle V).

**Rationale**: This matches the current feature's spec Assumption that the fix applies to "the card's actions/options control" specifically — consistent with the project's established practice (034, 037) of fixing exactly the reported component(s) rather than sweeping every hook consumer, while leaving a clear paper trail (this document, and the contract in Phase 1) of the one other known-affected component (`ColumnHeaderMenu.tsx`) for a future, separately-scoped fix.

**Alternatives considered**:
- *Fix `ColumnHeaderMenu.tsx` opportunistically in this same feature, since the defect and fix are identical.* Rejected for this plan — spec.md's Assumptions scope this feature to the card's actions menu only, and the user's bug report named only that menu; bundling an unrequested second fix would violate Constitution Principle V and expand this feature's test/verification surface beyond what was asked. Recorded here so it's easy to pick up as its own small, well-understood follow-up.

## 3. Fix design for `CardMenu.tsx`

**Decision**: Apply the exact pattern already proven in `FacilitatorMenu.tsx`/`ColorPicker.tsx`:
- Outer element: a plain `<div ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()} aria-label={...} className="z-[9999]">` — carries positioning and all Floating UI/ARIA wiring, no Framer Motion props.
- Inner element: `<motion.div initial={{opacity:0, transform:'scale(0.95) translateY(...)'}} animate={{opacity:1, transform:'scale(1) translateY(0px)'}} exit={{opacity:0, transform:'scale(0.95) translateY(...)'}} transition={{duration:0.15, ease:[0.23,1,0.32,1]}}>` — owns only the entrance/exit animation, using full `transform` strings (not `scale`/`y` shorthand) per the `ColorPicker.tsx` precedent, and carries the existing `min-w-[280px] max-h-[90vh] overflow-visible` styling classes plus the panel's content (currently rendered as a `<div className="p-4">...</div>` inside the `motion.div`).
- `aria-label` and `getFloatingProps()` stay on the **outer** wrapper only, never duplicated onto the inner `motion.div` — `ColorPicker.tsx`'s own comment documents a real `aria-required-children` axe violation this exact duplication caused when first attempted there.
- The panel's own `transformOrigin` (already derived from the resolved placement by `useBoardMenuOverlay`, `CardMenu.tsx:41`/`useBoardMenuOverlay.ts:132-135`) moves from the outer wrapper's `style={floatingStyles}` (which already includes it) onto the inner `motion.div`'s own `style` if the scale animation needs it to originate correctly from the anchor edge — matching `ColorPicker.tsx`'s `style={{ transformOrigin: floatingStyles.transformOrigin }}` on its inner `motion.div`.

**Rationale**: This is a direct reapplication of an already-designed, already-reviewed, already-shipped pattern — no new design decision, no new dependency, minimal diff, and it keeps `CardMenu.tsx`'s existing visual result (same colors, spacing, opacity/scale feel) unchanged, satisfying spec.md's Assumption that "no new menu actions or content are being added — this is strictly a positioning/anchoring correction."

**Alternatives considered**: none beyond what was already evaluated and rejected in §1 — this section only concerns exactly *how* to apply the already-decided fix approach to `CardMenu.tsx`'s specific JSX.

## 4. Test strategy

**Decision**: Two new tests, mirroring feature 034's T002/T004:
1. **Structural unit test** (`CardMenu.test.tsx`) — asserts the DOM node receiving `style={floatingStyles}` is a distinct element from the node receiving Framer Motion's `animate` prop, using the same `vi.mock('framer-motion', ...)` technique already established in `src/test/features/boards/facilitator/FacilitatorMenu.test.tsx`. Written first and confirmed to fail against the current single-node implementation, then made to pass by the fix (Constitution Principle I).
2. **Playwright bounding-box anchoring test** (`e2e/retrospective-board.spec.ts`) — opens `CardMenu` through the real UI (clicking the trigger button, not the REST endpoint the existing convert-to-action-item test uses) and asserts the panel's bounding box is adjacent to the trigger's bounding box, for a card away from the top-left corner of the viewport, and again after scrolling. This closes the gap that let the original defect ship without any E2E signal — today's only E2E coverage of convert-to-action-item never renders the menu at all.

**Rationale**: Reuses exactly the verification approach `contracts/ui-behavior-contracts.md` (feature 034) established for Contract 1, applied to the one additional consumer this feature fixes. No new test infrastructure or technique is introduced.

**Alternatives considered**:
- *Only add the Playwright test, skip the unit test.* Rejected — the structural unit test is what makes the regression class (not just this one instance of it) mechanically un-reintroducible at the component level, and is cheap/fast compared to E2E; both are already established as necessary in this codebase's own precedent (034's T002 *and* T004, not one or the other).
- *Assert an exact pixel position.* Rejected — `contracts/ui-behavior-contracts.md` Contract 1 already establishes "no test may assert a fixed pixel position — only 'anchored to trigger' relative positioning, since exact pixels are viewport-dependent," and this feature's spec.md Success Criteria are phrased the same way (SC-001/SC-002).

## Summary of resolved unknowns

| Area | Status |
|------|--------|
| Root cause of the reported top-left positioning | Resolved — Framer Motion/Floating UI `transform` collision on the same DOM node in `CardMenu.tsx`, identical to feature 034's diagnosis for two sibling menus (§1) |
| Why this specific menu was never fixed before | Resolved — feature 034 explicitly predicted and deliberately deferred it as out of that feature's reported scope (§1, §2) |
| Fix approach for `CardMenu.tsx` | Resolved — reapply the exact split-node + full-transform-string pattern already shipped in `FacilitatorMenu.tsx`/`ColorPicker.tsx` (§3) |
| `ColumnHeaderMenu.tsx`'s identical defect | Confirmed present, explicitly out of scope for this feature (§2, plan.md Constraints) |
| Test strategy | Resolved — structural unit test + real UI-driven Playwright bounding-box test, mirroring feature 034's T002/T004 (§4) |
| New dependencies required | None — `@floating-ui/react` and `framer-motion` are already installed and sufficient |
| Data model / Firestore schema changes | None required |
