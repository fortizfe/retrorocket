import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TeamMoodDashboard from '@/features/boards/sentiment/components/TeamMoodDashboard';
import { TeamMoodReport } from '@/features/boards/types/teamMood';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts?.count !== undefined ? `${key} (${opts.count})` : key) }),
}));

const baseReport: TeamMoodReport = {
    metrics: {
        totalCards: 10,
        analyzedCards: 8,
        analysisCompleteness: 80,
        overallSentiment: 'positive',
        overallConfidence: 0.85,
        totalPositive: 5,
        totalNegative: 1,
        totalNeutral: 2,
        positivePercentage: 62,
        negativePercentage: 13,
        neutralPercentage: 25,
        columnMetrics: [
            {
                column: 'helped',
                columnTitle: 'Helped',
                total: 4,
                positive: 3,
                negative: 0,
                neutral: 1,
                positivePercentage: 75,
                negativePercentage: 0,
                neutralPercentage: 25,
                averageConfidence: 0.8,
            },
        ],
    },
    insights: [
        {
            type: 'success',
            title: 'Great sentiment',
            description: 'The team feels good',
            icon: '🎉',
            severity: 1,
            actionable: false,
        },
    ],
    timestamp: new Date('2026-01-01T10:00:00Z'),
    moodScore: 7.8,
    moodTrend: 'stable',
};

describe('TeamMoodDashboard', () => {
    it('shows an analyzing state while isAnalyzing is true', () => {
        render(<TeamMoodDashboard report={baseReport} hasEnoughData={false} isAnalyzing />);
        expect(screen.getByText('retrospective.facilitator.teamMood.analyzing')).toBeInTheDocument();
    });

    it('shows an insufficient-data state when there are not enough analyzed cards', () => {
        render(<TeamMoodDashboard report={baseReport} hasEnoughData={false} isAnalyzing={false} />);
        expect(screen.getByText('retrospective.facilitator.teamMood.insufficientData.title')).toBeInTheDocument();
    });

    it('renders the mood score, sentiment breakdown, and insights once data is ready', () => {
        render(<TeamMoodDashboard report={baseReport} hasEnoughData isAnalyzing={false} />);

        expect(screen.getByText('7.8/10')).toBeInTheDocument();
        expect(screen.getByText('62%')).toBeInTheDocument();
        expect(screen.getByText('Great sentiment')).toBeInTheDocument();
        expect(screen.getByText('The team feels good')).toBeInTheDocument();
    });

    it('labels a low-but-not-critical mood score as concerning, not positive (moodScore.ts neutral-board anchor)', () => {
        const report = { ...baseReport, moodScore: 4.6 };
        render(<TeamMoodDashboard report={report} hasEnoughData isAnalyzing={false} />);
        expect(screen.getByText('retrospective.facilitator.teamMood.moodLabels.concerning')).toBeInTheDocument();
    });
});
