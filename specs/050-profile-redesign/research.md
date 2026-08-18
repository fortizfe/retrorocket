# Phase 0 Research: Mi Perfil (Profile) Redesign

All Technical Context fields in `plan.md` are resolved from the existing
codebase (features 018/028/029/031 established the tooling and
backend-mediated architecture this feature reuses); no `NEEDS
CLARIFICATION` markers remain. This document resolves the open
*design/engineering* decisions the spec's Assumptions deliberately left
open, so Phase 1 has a concrete, justified basis to design against.

## 1. No new dependency or data-scale handling needed

**Decision**: No list-virtualization, data-grid, or new form library is
needed. Mi Perfil renders exactly one user's own data: one profile record,
a small, bounded set of linkable providers (2-3, fixed by the OAuth
providers the app supports), and a connected-AI-assistants list that in
practice holds a handful of entries. Continue using the existing
shared UI primitives (`src/lib/components/ui/*`) and framer-motion.

**Rationale**: Unlike the dashboard's board list (feature 031, validated at
200+ items), nothing on this page has unbounded scale. Adding any new
dependency here would violate Constitution V (Simplicity/YAGNI) and require
new-dependency justification (Principle III) without a measured need.

**Alternatives considered**: None seriously considered — no problem exists
that an existing tool doesn't already solve.

## 2. Accessible disabled-placeholder pattern (FR-007)

**Decision**: The "Exportar mis datos" and "Eliminar cuenta" controls keep
their native `disabled` attribute (already correct for preventing
interaction and default browser/AT handling) and additionally gain: (a) a
persistently visible "not yet available" label/badge (not only a `title`
tooltip, which is not reliably exposed to touch or screen-reader users),
and (b) an accessible description — via `aria-describedby` pointing to that
same visible label — so assistive technology announces both the control's
name and its unavailable status together, not color/opacity alone.

**Rationale**: The current implementation communicates "coming soon"
through a text label already ("Próximamente"), but the codebase inventory
found no `aria-describedby`/programmatic association verified for it —
this closes that gap rather than introducing a new interaction pattern.
Native `disabled` (over a clickable-but-inert `aria-disabled` pattern) is
appropriate here because these controls have no reason to be focusable:
per Apple HIG and WCAG 2.1 AA, a control that can never be activated is
correctly removed from the tab order rather than kept focusable with no
action.

**Alternatives considered**: `aria-disabled="true"` on a focusable element
(rejected — implies the control might become interactive via some other
state change, which isn't true here; native `disabled` is simpler and
matches current behavior, satisfying Constitution V).

## 3. Motion decisions

**Decision**: Continue using framer-motion (Constitution III — already
adopted) for: page/section entrance, the display-name save success/error
transition, the connected-app revoke-in-progress → removed transition, and
any provider-linking-in-progress indicator shown before the full-page OAuth
redirect. Reuse the existing `useReducedMotion` hook for every one of these.
Each new motion decision MUST be made via the `animate` skill (Constitution
IX), not ad hoc; the final result MUST pass a `review-animations` critique
pass before this feature closes. `find-animation-opportunities` is
consulted to confirm none of these moments is over-animated relative to
their actual significance (e.g., a routine save confirmation should read as
quiet, not celebratory).

**Rationale**: Consistency with the app's already-adopted motion system and
the precedent set in features 028/029/031 for how this app makes and
records motion decisions.

## 4. Landing-page regression guard for the shared `UserProfileForm`

**Decision**: `UserProfileForm.tsx` is redesigned once; both of its call
sites — Mi Perfil (`isFirstTime={false}`, default) and the landing page's
first-time setup (`isFirstTime={true}`) — MUST be exercised against the
new implementation before this feature is considered complete.
`src/test/pages/Landing.test.tsx` and the first-time-setup path in
`e2e/authentication.spec.ts` are the existing regression guards; no new
test file is required unless the chosen visual direction changes the
component's public prop contract (it should not — `userProfile`, `onSave`,
`isFirstTime` are sufficient for every rendering mode across the explored
directions).

**Rationale**: FR-009/SC-006 exist specifically because this component is
shared; the landing page (feature 042) already received its own
Apple-HIG redesign and explicitly treated Mi Perfil as out of scope — this
feature must not silently pull the landing page's first-time-setup moment
along for a visual change it didn't ask for, beyond what the shared
component itself contributes.

**Alternatives considered**: Forking a Mi-Perfil-only variant of the form,
leaving the landing page on the old implementation (rejected — duplicates
the display-name-edit logic/validation/tests, violating Constitution
II/V, and reintroduces exactly the kind of drift the shared component was
built to avoid).

## 5. Visual direction exploration process and the product-owner decision artifact

**Decision**: Explore 2-3 genuinely distinct visual directions for Mi
Perfil, each built as a real, working view against actual
`backendProfileClient`/`useLinkedProviders`/`connectedAppsService` data
(not static mockups) — the same process established and validated in
features 029/031/033. In addition to the real, interactive candidates, this
feature produces the specific artifact the product owner asked for: a
single, self-contained comparison page (a published Claude Artifact) that
presents all 2-3 directions side by side — key visual differences,
representative screenshots or embedded views of each state (loaded, error,
saving), and a short rationale per direction — so the product owner can
review and make the FR-015/SC-005 selection from one place, then record
which direction ships (and why the others were not chosen) back into
`data-model.md`.

**Rationale**: The constitution's design-exploration process (real,
functional candidates, product-owner sign-off) is reused unchanged from
precedent. The explicit artifact requirement in this feature's input
("Recuerda hacer un artefacto para la decisión...") is satisfied by
producing a durable, shareable comparison document *in addition to* the
live candidates, rather than asking the product owner to compare three
separate running routes from memory — this makes the decision record
itself durable and reviewable independent of the dev-only routes.

**Note on tooling**: the constitution names the `prototype` skill
specifically for building the candidate directions, but neither `prototype`
nor `pick-ui-library` is installed in this environment. Per the same
precedent set in features 029/031/033, `apple-design`/`emil-design-eng` are
substituted for building the candidates. This is recorded here explicitly
— rather than only in `tasks.md` — so the substitution is visible before
implementation starts, and the product-owner review checkpoint is scoped to
acknowledge it alongside the direction selection.

## 6. Apple HIG component vocabulary relevant to this feature (reference inventory)

Non-binding reference for Phase 1 / prototyping, drawn from the
constitution-mandated `apple-design` skill and general HIG component
vocabulary — this does not fix any candidate direction's choices, it only
inventories which Apple interface concepts are relevant to a personal
account/settings surface like this one:

- **Settings/account surfaces** — Mi Perfil is closest in kind to
  Apple's Settings/account-profile pattern: identity summary at the top
  (avatar, name, primary account), grouped sections below (security/access,
  connected apps), destructive/irreversible actions visually separated and
  deliberately unemphasized.
- **Forms** — the display-name edit field maps to HIG's guidance on
  inline, single-field editing: immediate validation feedback, a clear
  saved/error state, no modal required for a single-field change.
- **Lists** — linked providers and connected apps are both short,
  homogeneous row lists — HIG's list-row vocabulary (leading icon/avatar,
  primary/secondary text, trailing action) applies directly.
- **Materials & depth** — card-level separation between "identity",
  "access & security" (providers + connected apps), and "account actions"
  (export/delete placeholders) is a candidate differentiator between
  directions, per skill §12.
- **Destructive actions** — HIG's guidance on visually and spatially
  separating destructive/irreversible actions (delete account) from
  routine ones is directly relevant to how the disabled placeholders are
  positioned, independent of FR-007's accessibility fix.

## Summary of resolved unknowns

| Topic | Resolution |
|---|---|
| New dependency / data-scale handling | None needed — page has no unbounded-scale data (§1) |
| Disabled-placeholder accessibility pattern | Native `disabled` + persistent visible label + `aria-describedby` (§2) |
| Motion system | framer-motion + `useReducedMotion`, via `animate`/`review-animations`/`find-animation-opportunities` skills (§3) |
| Landing-page shared-component regression guard | Existing `Landing.test.tsx` + `authentication.spec.ts` first-time-setup coverage, prop contract held stable (§4) |
| Visual direction process + PO decision artifact | 2-3 real working directions (`apple-design`/`emil-design-eng`, substituting for the uninstalled `prototype` skill) + one published comparison Artifact for product-owner selection (§5) |
| Relevant HIG vocabulary | Settings/account surfaces, Forms, Lists, Materials & depth, Destructive actions (§6) |
