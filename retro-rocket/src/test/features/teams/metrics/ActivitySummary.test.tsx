import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ActivitySummary from '@/features/teams/metrics/components/ActivitySummary';

// 056-team-metrics-dashboard, T005 (spec.md User Story 1 / data-model.md
// "TeamMetricsSummary" / tasks.md T014):
//
//   "ActivitySummary (retrospective count + average participants) ... FR-010: a team
//   with zero retrospectives shows a clear empty state."
//
// Signature contract: ActivitySummary(props: { retrospectiveCount: number;
// averageParticipants: number }) — a small presentational component, mirroring
// src/test/features/teams/TeamMemberList.test.tsx's render/screen conventions.
// react-i18next is mocked globally in src/test/setup.ts with `t: (key) => key`, so any
// i18n-driven copy (including the empty-state message) renders as its raw translation
// key rather than real prose — this test therefore checks for the presence of
// SOME additional empty-state text distinguishing the zero case from the populated
// case, without pinning the exact wording/key (that's decided by the component, T014,
// and its i18n keys, T016).
//
// ActivitySummary does not exist yet — this file is expected to fail with a
// "Cannot find module" error until
// src/features/teams/metrics/components/ActivitySummary.tsx is implemented (T014).

describe('ActivitySummary', () => {
    it('renders the retrospective count and average participants', () => {
        render(<ActivitySummary retrospectiveCount={12} averageParticipants={4.3} />);

        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.getByText('4.3')).toBeInTheDocument();
    });

    it('renders a zero count with a clear empty-state message, without crashing, when retrospectiveCount is 0 (FR-010)', () => {
        render(<ActivitySummary retrospectiveCount={0} averageParticipants={0} />);

        // The zero count itself is still rendered, not hidden/replaced.
        expect(screen.getAllByText('0').length).toBeGreaterThan(0);

        // Some additional messaging marks this as an empty state, distinct from just
        // displaying "0" — exact copy/i18n key is up to the component.
        expect(screen.getByText(/no retrospectives|empty/i)).toBeInTheDocument();
    });
});
