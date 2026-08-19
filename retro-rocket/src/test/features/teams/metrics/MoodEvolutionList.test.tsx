import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MoodEvolutionList from '@/features/teams/metrics/components/MoodEvolutionList';
import type { RetrospectiveMoodPoint } from '@/features/teams/metrics/types/teamMetrics';

// 056-team-metrics-dashboard, T027 (spec.md User Story 3 / data-model.md
// "RetrospectiveMoodPoint" / tasks.md T027):
//
//   "Component test: MoodEvolutionList renders one row per moodEvolution entry in the
//   order given, a numeric score when present, and an explicit 'no data' state (not a
//   color-only cue) when moodScore is null — in
//   src/test/features/teams/metrics/MoodEvolutionList.test.tsx."
//
// Signature contract: MoodEvolutionList(props: { moodEvolution: RetrospectiveMoodPoint[] })
// — a small presentational component, sibling of ActivitySummary/ActionItemsSummary
// (src/test/features/teams/metrics/{ActivitySummary,ActionItemsSummary}.test.tsx),
// mirroring their render/screen conventions. `RetrospectiveMoodPoint` is already
// defined in src/features/teams/metrics/types/teamMetrics.ts:
//
//   { retrospectiveId: string; retrospectiveTitle: string; createdAt: Date; moodScore: number | null }
//
// per that file's own docstring, "Always pre-sorted ascending by createdAt (oldest
// first) by the backend — the frontend does not re-sort" — so this component trusts
// the array order it's given and this test does NOT feed it out-of-order input
// expecting it to reorder.
//
// react-i18next is mocked globally in src/test/setup.ts with `t: (key) => key`, so any
// i18n-driven copy (including the "no data" state's wording, whose i18n keys land in
// T032) renders as its raw translation key rather than real prose — this test therefore
// checks for the PRESENCE of some non-color-only "no data" signal (text content, or an
// accessible name) via a loose pattern, matching ActivitySummary.test.tsx's convention
// of not pinning exact copy/i18n keys the component itself hasn't decided yet.
//
// MoodEvolutionList does not exist yet — this file is expected to fail with a
// "Cannot find module" error until
// src/features/teams/metrics/components/MoodEvolutionList.tsx is implemented (T031).

function point(overrides: Partial<RetrospectiveMoodPoint> = {}): RetrospectiveMoodPoint {
    return {
        retrospectiveId: 'retro-1',
        retrospectiveTitle: 'Sprint 1 Retro',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        moodScore: 7.5,
        ...overrides,
    };
}

describe('MoodEvolutionList', () => {
    it('renders one row per moodEvolution entry, in the order given', () => {
        const moodEvolution: RetrospectiveMoodPoint[] = [
            point({ retrospectiveId: 'retro-1', retrospectiveTitle: 'Sprint 1 Retro', moodScore: 6 }),
            point({ retrospectiveId: 'retro-2', retrospectiveTitle: 'Sprint 2 Retro', moodScore: 8 }),
            point({ retrospectiveId: 'retro-3', retrospectiveTitle: 'Sprint 3 Retro', moodScore: 4 }),
        ];

        render(<MoodEvolutionList moodEvolution={moodEvolution} />);

        // All three rows are present, and appear in DOCUMENT ORDER matching the array
        // order given — the component must not re-sort (data-model.md: the backend
        // already sorts ascending by createdAt, the frontend trusts that order as-is).
        const renderedOrder = screen
            .getAllByText(/Sprint \d Retro/)
            .map((el) => el.textContent);
        expect(renderedOrder).toEqual(['Sprint 1 Retro', 'Sprint 2 Retro', 'Sprint 3 Retro']);
    });

    it('shows the numeric moodScore for a row that has one', () => {
        const moodEvolution: RetrospectiveMoodPoint[] = [
            point({ retrospectiveId: 'retro-1', retrospectiveTitle: 'Sprint 1 Retro', moodScore: 7.5 }),
        ];

        render(<MoodEvolutionList moodEvolution={moodEvolution} />);

        expect(screen.getByText('7.5')).toBeInTheDocument();
    });

    it('shows an explicit, non-color-only "no data" indicator for a row whose moodScore is null', () => {
        const moodEvolution: RetrospectiveMoodPoint[] = [
            point({ retrospectiveId: 'retro-1', retrospectiveTitle: 'Unanalyzed Retro', moodScore: null }),
        ];

        render(<MoodEvolutionList moodEvolution={moodEvolution} />);

        // The row itself still renders...
        expect(screen.getByText('Unanalyzed Retro')).toBeInTheDocument();

        // ...and no numeric score is fabricated in its place.
        expect(screen.queryByText(/^\d+(\.\d+)?$/)).not.toBeInTheDocument();

        // A "no data" cue is conveyed through TEXT CONTENT (or an accessible name on
        // an icon), not color alone — matches on the raw i18n key's likely English/
        // Spanish fallback text, or an accessible name exposed via role/alt/aria-label
        // for an icon-based treatment, without pinning exact copy (T031/T032 decide
        // the final wording).
        const textCue = screen.queryByText(/no data|sin datos/i);
        const accessibleIconCue = screen.queryByRole('img', { name: /no data|sin datos/i });
        expect(textCue ?? accessibleIconCue).not.toBeNull();
    });
});
