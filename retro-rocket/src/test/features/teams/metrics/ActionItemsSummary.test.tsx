import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ActionItemsSummary from '@/features/teams/metrics/components/ActionItemsSummary';

// 056-team-metrics-dashboard, T019 (spec.md User Story 2 / data-model.md
// "TeamMetricsSummary.actionItemsCreated" / tasks.md T019):
//
//   "ActionItemsSummary (total action items created across the team's retrospectives)
//   ... Acceptance Scenario 2: a team with retrospectives that have no action items
//   shows the count as zero rather than omitted or erroring."
//
// Signature contract: ActionItemsSummary(props: { actionItemsCreated: number }) — a
// small presentational component, sibling of ActivitySummary with the same shape
// (a single numeric prop rendered as a labeled stat). Mirrors this directory's
// ActivitySummary.test.tsx render/screen conventions. react-i18next is mocked
// globally in src/test/setup.ts with `t: (key) => key`, so any i18n-driven label
// renders as its raw translation key rather than real prose — this test therefore
// only asserts on the numeric value, not on label copy/i18n keys (those are decided
// by the component, T021, and its i18n keys).
//
// Unlike ActivitySummary (User Story 1, FR-010), User Story 2's spec does not call
// for additional empty-state messaging on zero — Acceptance Scenario 2 only requires
// the count to be "shown as zero rather than omitted or erroring" — so the zero case
// here just asserts "0" renders without crashing, matching this task's description.
//
// ActionItemsSummary does not exist yet — this file is expected to fail with a
// "Cannot find module" error until
// src/features/teams/metrics/components/ActionItemsSummary.tsx is implemented (T021).

describe('ActionItemsSummary', () => {
    it('renders the actionItemsCreated count when positive', () => {
        render(<ActionItemsSummary actionItemsCreated={27} />);

        expect(screen.getByText('27')).toBeInTheDocument();
    });

    it('renders a clear zero-state without crashing when actionItemsCreated is 0', () => {
        render(<ActionItemsSummary actionItemsCreated={0} />);

        expect(screen.getByText('0')).toBeInTheDocument();
    });
});
