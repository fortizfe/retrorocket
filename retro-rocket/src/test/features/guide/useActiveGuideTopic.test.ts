import { createElement, type ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { useActiveGuideTopic } from '@/features/guide/hooks/useActiveGuideTopic';

/**
 * src/test/setup.ts globally mocks react-router-dom's `useParams` to always
 * return `{}` (most tests don't need real route-param resolution). This
 * hook's entire contract is reading a real `:topicSlug` param, so — same as
 * this repo's established precedent for tests that need real routing
 * behavior (src/test/features/auth/AuthGuard.test.tsx, src/test/pages/
 * RetrospectivePage.test.tsx) — this file registers its own
 * `vi.mock('react-router-dom', ...)` spreading the actual module, which
 * takes precedence over setup.ts's mock for this file and restores real
 * `useParams`/`MemoryRouter`/`Routes`/`Route` behavior.
 */
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return actual;
});

/**
 * spec-kit feature 057-getting-started-guide, tasks.md T019 (Phase 4: User
 * Story 2 — TDD red step). `src/features/guide/hooks/useActiveGuideTopic.ts`
 * does not exist yet (T024 creates it, per research.md Decision 2 — the
 * active topic is resolved from the `:topicSlug` route param, not
 * client-only state); this file is written first, per Constitution
 * Principle I (NON-NEGOTIABLE TDD).
 *
 * Expected failure right now: `Cannot find module
 * '@/features/guide/hooks/useActiveGuideTopic'` (the file doesn't exist).
 *
 * ---
 *
 * CHOSEN, DOCUMENTED CONTRACT (T024's implementation MUST match this):
 *
 *   function useActiveGuideTopic(): GuideTopic | undefined
 *
 * The hook reads `useParams<{ topicSlug: string }>()` and looks up
 * `topicSlug` against `guideTopics` (from
 * `src/features/guide/content/topics.ts`, T022). It returns the matching
 * `GuideTopic` object when `topicSlug` is a known id, and returns the
 * sentinel value `undefined` — the chosen "no active topic" / overview
 * state — both when there is no `:topicSlug` param at all (bare `/guide`)
 * and when `topicSlug` doesn't match any registered topic id (spec.md Edge
 * Case: an old/mistyped deep link falls back to the guide's overview
 * rather than a broken page). `GuidePage.tsx` (T027, T029) is expected to
 * render the overview whenever this hook returns `undefined`.
 *
 * `guideTopics` is real (imported implicitly via the hook), not mocked
 * here, since T018/topics.test.ts already pins `anonymous-mode` as one of
 * the 12 required topic ids — using that real, spec-required id keeps this
 * test from depending on registry internals beyond what's already a
 * documented contract.
 *
 * Test setup: `renderHook` is wrapped in a `MemoryRouter` with a `Routes`
 * table exposing both `/guide` and `/guide/:topicSlug` so `useParams`
 * resolves realistically, following this repo's established
 * MemoryRouter-wrapped hook/component test pattern (see
 * src/test/features/auth/AuthGuard.test.tsx) — `src/test/features/teams/
 * useTeamsQuery.test.ts` is the reference for plain `renderHook` usage but
 * covers a hook with no routing dependency, so the routing wrapper here
 * additionally follows AuthGuard's MemoryRouter convention. The wrapper is
 * built with `createElement` rather than JSX so this file can keep the
 * `.test.ts` extension the task specifies (JSX syntax needs `.tsx` under
 * this project's esbuild/TS config; no other `.test.ts` hook test in this
 * repo uses inline JSX either).
 */

const renderAtRoute = (initialPath: string) =>
    renderHook(() => useActiveGuideTopic(), {
        wrapper: ({ children }: { children: ReactNode }) =>
            createElement(
                MemoryRouter,
                { initialEntries: [initialPath] },
                createElement(
                    Routes,
                    null,
                    createElement(Route, { path: '/guide', element: children }),
                    createElement(Route, { path: '/guide/:topicSlug', element: children })
                )
            ),
    });

describe('useActiveGuideTopic (spec 057 research.md Decision 2, data-model.md)', () => {
    it('returns the matching topic object for a known :topicSlug', () => {
        const { result } = renderAtRoute('/guide/anonymous-mode');

        expect(result.current).toBeDefined();
        expect(result.current?.id).toBe('anonymous-mode');
    });

    it('returns undefined (no active topic / overview sentinel) for an unknown slug', () => {
        const { result } = renderAtRoute('/guide/not-a-real-topic');

        expect(result.current).toBeUndefined();
    });

    it('returns undefined (no active topic / overview sentinel) when no :topicSlug param is present', () => {
        const { result } = renderAtRoute('/guide');

        expect(result.current).toBeUndefined();
    });
});
