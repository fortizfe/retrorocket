# Phase 0 Research: Mis Tableros (Dashboard) Redesign

All Technical Context fields in `plan.md` are resolved from the existing
codebase (feature 028/029 established the tooling this feature reuses); no
`NEEDS CLARIFICATION` markers remain. This document instead resolves the
open *design/engineering* decisions the spec's Assumptions deliberately left
open, so Phase 1 has a concrete, justified basis to design against.

## 1. Rendering approach for large board lists (no virtualization dependency)

**Decision**: Render all matching boards directly (no list-virtualization
library) up to the validated 200+ board scale from SC-001. Rely on
`React.memo` on the card/row component, stable `key`s, and `useMemo`-derived
filtered/sorted arrays to avoid unnecessary re-renders; consider
`content-visibility: auto` (CSS containment) on off-screen list items as a
low-risk rendering-cost reduction if profiling shows it's needed. The
"smoothly scrollable" bar this decision is validated against is concrete:
sustaining at least 50fps with no dropped-frame stalls while scrolling
through 200+ rendered boards (SC-001), measured via the Chrome DevTools
Performance panel per `quickstart.md` §3 — if this approach can't hit that
bar without virtualization, that would be new evidence to revisit this
decision, not a reason to leave "smooth" unquantified.

**Rationale**: A few hundred lightweight card/row DOM nodes is well within a
modern browser's comfortable render budget — virtualization typically starts
paying off in the low thousands of items. Adding a virtualization dependency
(e.g. `react-window`, `@tanstack/virtual`) to hit a 200-board/300ms target
would violate Constitution V (Simplicity/YAGNI) and require new-dependency
justification (Principle III) without being necessary. Windowed lists also
complicate keyboard focus order and linear screen-reader navigation, working
against FR-015 and WCAG 2.1 AA unless carefully engineered — added risk for
no measured benefit at this scale.

**Alternatives considered**: `react-window` / `@tanstack/virtual` (rejected
— unneeded complexity and added accessibility risk at the validated scale).
If real-world usage later exceeds this ceiling, virtualization can be
reconsidered at that time via the `pick-ui-library` skill, as a separate,
measured decision.

## 2. Search/filter/sort performance approach

**Decision**: Keep search/filter/sort as synchronous client-side operations
over the already-fetched boards array (as today), computed via `useMemo`
keyed on `(boards, query, scopeFilter, sortKey, sortDirection)`. No input
debouncing, no async/worker-based filtering.

**Rationale**: Array operations over up to 200+ plain objects execute in
low-single-digit milliseconds in modern JS engines — the 300ms budget
(SC-001) is dominated by React re-render/paint cost, not compute, so
debouncing would only add perceived latency for no compute benefit. This
also matches the `apple-design` skill's "respond instantly" principle
(§1, Response) — feedback to a keystroke should be immediate, not delayed to
smooth out a cost that isn't actually there. `useMemo` avoids redundant
recomputation on unrelated re-renders (e.g. a delete-in-progress loading
state elsewhere in the tree).

**Alternatives considered**: Debounced search input (rejected — adds
perceptible input lag for a fast local operation); a Web Worker for
filtering (rejected — unjustified complexity for this data volume, violates
Simplicity).

## 3. Board browsing/reachability mechanism

**Decision**: The exact mechanism (traditional pagination applied uniformly
to every layout, continuous/infinite scroll, a "load more" affordance, or
another pattern) is deliberately **not** fixed here — it is resolved by the
2-3 prototype directions mandated by FR-021. The one constraint carried
forward into every candidate direction: whichever mechanism ships MUST route
every board in the source array through the same reachability-safe path, in
every layout the direction offers — no layout may silently truncate the
list past a fixed page/viewport, which is precisely today's grid-view defect
(FR-012).

**Rationale**: Apple HIG has no single prescribed pattern for browsing a
variable-size personal collection — continuous/infinite scroll (Photos,
App Store listing pages), sectioned/paged browsing, and search-narrowed
browsing all appear depending on content type and expected volume. This is
exactly the kind of "genuinely different direction" question the
`prototype` skill (Constitution IX) exists to resolve by building and
comparing real variants, not by presuming an answer during planning.

**Alternatives considered**: Fixing today's numbered-pagination component
(`Pagination.tsx`) in place for both layouts (rejected as the *sole* answer
— a legitimate candidate, but it should compete against continuous-scroll
and other patterns during prototyping rather than being assumed as the
final design).

## 4. Per-item action affordance (rename/delete) reveal pattern

**Decision**: In every candidate direction, rename/delete controls for owned
boards MUST be either always-visible or revealed on **both** `:hover` and
`:focus-within` (never hover-only), satisfying FR-015 regardless of which
visual direction ships.

**Rationale**: Hover has no equivalent on touch input, and CSS `:hover`
alone never triggers for keyboard-only navigation — a hover-only pattern
structurally fails a whole class of users. This is required both by the
`apple-design` skill's Flexibility principle (design for the full range of
input methods and abilities, §16) and by WCAG 2.1 AA operability
(Constitution VIII), independent of which visual direction the product owner
selects.

**Alternatives considered**: Swipe-to-reveal actions (viable as an
*additional* touch affordance on narrow viewports if a candidate direction
wants it, but not a substitute for a keyboard-reachable control — swipe has
no keyboard equivalent, so any direction adopting swipe MUST also expose an
always-reachable, non-gesture alternative).

## 5. Date localization fix

**Decision**: Replace the hardcoded `'es-ES'` locale literal passed to date
formatting in `BoardCard.tsx` and `BoardListItem.tsx` with the active
`i18next` language (`i18n.language`), mapped to the equivalent
`Intl.DateTimeFormat`/date-fns locale identifier.

**Rationale**: Directly resolves FR-016/SC-005. No new dependency is
needed — the existing formatting call site already accepts a locale
argument; only the source of that argument changes from a literal string to
the currently active language.

## 6. Motion decisions

**Decision**: Continue using framer-motion (Constitution III — already
adopted) for entrance/exit and list-reflow animation, reusing the
`AnimatePresence`-must-directly-wrap-the-animated-list and stagger-delay-cap
(`Math.min(index * 0.05, 0.3)`) fixes established in feature 028, and the
existing `useReducedMotion` hook for every new animated interaction (list
reflow on filter/sort/scope change, per-item action reveal, card
press/hover feedback, modal enter/exit). Each new motion decision MUST be
made via the `animate` skill (Constitution IX), not ad hoc; the final result
MUST pass a `review-animations` critique pass before this feature closes.

**Rationale**: Consistency with the app's already-adopted motion system and
prior fixes; avoids reintroducing the exit-animation regression feature 028
already resolved once for this same view.

## 7. Visual direction exploration process

**Decision**: Explore 2-3 genuinely distinct visual directions using the
`prototype` skill before committing to one, with the product owner
personally reviewing and approving the shipped direction (FR-021, SC-007) —
the same process established and validated in feature 029.

**Rationale**: Constitution-mandated for this task shape (design work with
genuinely different candidate directions); precedent already exercised and
signed off on by the product owner in feature 029, so the same procedure
(built via `prototype`, functional not static, reviewed side-by-side,
one selected with the rest recorded as rejected with a reason) is reused
rather than re-invented.

**Note on tooling**: the constitution names the `prototype` skill
specifically for this step, but it is not installed in this environment.
Per the same precedent set in feature 029, `apple-design`/`emil-design-eng`
are substituted for building the three real, interactive candidates
(`tasks.md` T003-T005). This is recorded here explicitly — rather than only
in `tasks.md` — so the substitution is visible before implementation
starts, and the product-owner review checkpoint (`tasks.md` T009) is
scoped to acknowledge it alongside the direction selection.

## 8. Apple HIG component vocabulary relevant to this feature (reference inventory)

Non-binding reference for Phase 1 / prototyping, drawn from the constitution-
mandated `apple-design` skill and general HIG component vocabulary — this
does not fix any candidate direction's choices, it only inventories which
Apple interface concepts are relevant to a personal-collection browsing
surface like this one:

- **Collections / Lists & Tables** — the core grid-vs-row browsing
  vocabulary this view already partially uses (today's Grid/List toggle).
- **Searching** — a persistent search field scoped to the current
  collection, live-filtering as the visitor types (see §2 above).
- **Toolbars** — the search/filter/sort/layout controls bar
  (`BoardControlsBar.tsx`) maps to this concept; per the `apple-design`
  skill §12 (Materials & depth), a toolbar is a good candidate for a
  translucent (`backdrop-filter`) floating layer rather than an opaque bar.
- **Segmented Controls** — the All / Created / Joined scope filter maps
  naturally to this component.
- **Materials** — translucent card/toolbar treatment, material-weight
  hierarchy, and scroll-edge fade effects (skill §12) are candidates for
  differentiating the visual directions explored in Phase 1.

## Summary of resolved unknowns

| Topic | Resolution |
|---|---|
| Virtualization dependency | Not needed at validated scale (§1) |
| Search/filter/sort implementation | Synchronous, memoized, no debounce (§2) |
| Reachability mechanism | Deferred to prototype phase, reachability constraint fixed (§3) |
| Rename/delete affordance pattern | Always-visible or hover+focus-within, never hover-only (§4) |
| Date locale bug | Use `i18n.language` instead of hardcoded `es-ES` (§5) |
| Motion system | framer-motion + `useReducedMotion`, via `animate`/`review-animations` skills (§6) |
| Visual direction process | 2-3 directions via `prototype`, product-owner approval (§7) |
| Relevant HIG vocabulary | Collections, Searching, Toolbars, Segmented Controls, Materials (§8) |
