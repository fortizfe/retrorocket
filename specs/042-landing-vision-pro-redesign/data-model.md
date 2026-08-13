# Phase 1 Data Model: Landing Page Redesign — Immersive Commercial Showcase

This feature is presentation-only — nothing here is persisted to Firestore
or any runtime database. "Entities" below are the structural shape of the
build-time/static content the landing page renders and the capture script
produces, per the Key Entities in `spec.md`.

## Landing Section

Represents one full-viewport-height segment of the page below the hero (the
hero itself is a distinct, non-repeating layout per FR-001 and is not an
instance of this entity). The closing footer strip (copyright/closing
boilerplate) is likewise not an instance of this entity — per FR-002's
footer exception, it follows the last `Landing Section` as ordinary
boilerplate without itself being full-viewport-height.

| Field | Type | Notes |
|---|---|---|
| `key` | string (enum) | Stable identifier, e.g. `realTimeCollaboration`, `cardWorkflow`, `dashboard`, `export`, `trust`. Drives the `i18next` `landing.*` key namespace and the `Media Asset` lookup key. |
| `order` | integer | Render order below the hero. Sections MAY be freely added/removed/reordered per FR-012 as long as messaging parity holds. |
| `messagingPurpose` | enum: `capabilityHighlight` \| `howItWorksStep` \| `trustSignal` \| `closing` | Preserves the informational categories required by FR-012, mapped from the current inventory (capabilities, how-it-works, technology/trust, final message). |
| `mediaAssetKey` | string \| null | Foreign key into `Media Asset` (see below). Every section except a purely typographic closing/trust-strip section is expected to have one, per US2 Acceptance Scenario 1. |
| `parallaxIntensity` | enum: `standard` \| `reduced` | `reduced` applies below the mobile breakpoint (research.md #9); authored per section, not globally fixed, so a denser section can opt for less displacement independent of viewport. |

**Validation rules**:
- `order` values MUST be unique and contiguous starting at 0 (below the hero).
- Every `key` MUST resolve to an existing `landing.<key>.*` translation entry
  in both `en.json` and `es.json` (FR-009) — enforced by a unit test over the
  `mediaAssets.ts`/locale files, not at runtime.
- If `mediaAssetKey` is non-null, it MUST resolve to a `Media Asset` entry
  that has both a `light` and `dark` variant (FR-006) — enforced by the same
  unit test (`contracts/media-asset-manifest-contract.md`).

## Media Asset

A real screenshot or short video capture of the running application,
produced by the capture script (research.md #7) and referenced by exactly
one `Landing Section`.

| Field | Type | Notes |
|---|---|---|
| `sectionKey` | string | Matches a `Landing Section.key`. |
| `kind` | enum: `screenshot` \| `video` | Determines whether `SectionMedia` renders `<img>` or `<video>` (+ poster). |
| `productArea` | string | Free-text description of what's depicted (e.g. "real-time board — card voting"), used only for the capture script's own documentation/traceability, never rendered to visitors. |
| `light` | asset reference | `{ src: string; poster?: string }`. `poster` only applies when `kind === 'video'`. |
| `dark` | asset reference | Same shape as `light`, captured with the app's dark theme active. |
| `capturedAt` | ISO date string | Set by the capture script each time it runs; lets a future audit tell how stale a Media Asset is relative to the current UI. |

**Validation rules**:
- Every `Media Asset` MUST have both `light.src` and `dark.src` populated
  (FR-006) — a section may never fall back silently to one theme's asset.
- Every `kind: 'video'` asset MUST have `poster` populated on both `light`
  and `dark` (research.md #4 — required for the reduced-motion/
  blocked-autoplay fallback, FR-007).
- `src`/`poster` paths MUST resolve to a real file under
  `public/landing-media/` at build time — enforced by the same unit test
  that validates the manifest, so a missing capture output fails CI rather
  than 404s in production.
- No field may contain real user/customer identifiers (FR-005) — structurally
  guaranteed by capturing exclusively against the Firebase Emulator Suite
  (research.md #7), not by field-level validation.

## Demo Dataset

The fictional-but-realistic seed content the capture script writes into the
Firebase Emulator Suite before capturing, so every `Media Asset` shows
populated, non-empty product surfaces (FR-005, research.md #8).

| Field | Type | Notes |
|---|---|---|
| `boards` | array of `{ titleKey: string; templateId; cardGroups: DemoCardGroup[] }` | Fictional board titles (e.g. "Product Design Weekly"), one per product surface a `Media Asset` needs to depict. |
| `DemoCardGroup` | `{ column: string; cards: string[]; grouped: boolean }` | Natural-language card text (not `"Seed card 0001"`); `grouped` drives whether `seedBoardGroups` is also invoked for that set. |
| `displayName` | string | A fictional presenter name used for the seeded session (never a real user's), shown wherever the dashboard/board surfaces a user identity. |

**Validation rules**:
- Card/board text MUST read as natural language, not templated placeholders
  (FR-005/SC-005) — enforced by human review in the capture-script contract's
  checklist (`contracts/capture-script-contract.md`), not automated, since
  "realistic" is a qualitative bar.
- The Demo Dataset is seeded exclusively through the existing
  `seedBoards`/`seedBoardCards`/`seedBoardGroups` fixtures (unmodified) —
  the capture script supplies data, not new seeding logic.

## Relationships

```text
Landing Section (1) ──── (0..1) Media Asset
Media Asset (1) ──── (1) light variant
Media Asset (1) ──── (1) dark variant
Demo Dataset (1) ──── (*) Media Asset   [content source, not a runtime FK]
```

No entity here has a lifecycle/state-transition model — all are static,
regenerated wholesale each time the capture script runs (FR-015), not
incrementally updated in place.
