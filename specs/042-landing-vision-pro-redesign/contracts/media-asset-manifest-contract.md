# Contract: Media Asset Manifest

**Enforces**: FR-004, FR-005, FR-006, FR-007, SC-005, SC-006. Applies to
`src/features/landing/data/mediaAssets.ts` and every file it references
under `public/landing-media/`.

## Contract

1. Every `Landing Section` with a non-null `mediaAssetKey` (`data-model.md`)
   MUST resolve to a `Media Asset` entry present in the manifest — no
   section may reference a key the manifest doesn't define.
2. Every `Media Asset` entry MUST define both `light.src` and `dark.src`,
   and both paths MUST resolve to a real, non-empty file under
   `public/landing-media/` at build time. A manifest entry with a missing
   variant is a contract violation, not an acceptable partial state (FR-006).
3. Every `Media Asset` with `kind: 'video'` MUST define `light.poster` and
   `dark.poster`, each resolving to a real static image file (FR-007's
   reduced-motion/blocked-autoplay fallback depends on this).
4. No file under `public/landing-media/` may be a placeholder, an empty
   asset, or contain visibly empty-state product UI (e.g. a board with zero
   cards, a dashboard with zero boards) — every capture MUST depict the
   populated Demo Dataset (FR-005, SC-005).
5. No file under `public/landing-media/` may be sourced from anything other
   than a run of `e2e/fixtures/landing-capture.ts` against the Firebase
   Emulator Suite (`contracts/capture-script-contract.md`) — a hand-edited
   or externally-sourced image/video MUST NOT be committed in its place.

## Verification procedure

1. A Vitest unit test (`src/test/features/landing/mediaAssets.test.ts`)
   iterates every entry in `mediaAssets.ts` and asserts, for each: both
   theme variants are present, every referenced file exists on disk
   (resolved relative to `public/`), and every `video` entry has both
   posters. This test runs in the standard `npm run test` suite and is
   coverage-gated like any other unit test (Constitution Principle VI).
2. Before merge, a human reviewer opens every file under
   `public/landing-media/` (or the rendered page in both themes) and
   confirms rule 4 (no empty-state captures) — this qualitative check is
   recorded in the same product-owner sign-off that closes SC-008, since
   "realistic-looking" is not fully machine-verifiable.
3. `contracts/capture-script-contract.md`'s own verification procedure is
   the upstream guarantee for rule 5 — this contract only asserts the
   *output* is well-formed, not how it was produced.
