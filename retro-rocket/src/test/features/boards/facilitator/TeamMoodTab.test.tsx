import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TeamMoodTab from '@/features/boards/facilitator/components/TeamMoodTab';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

const mockUseTeamMood = vi.fn();
vi.mock('@/features/boards/sentiment', () => ({
    useTeamMood: (...args: unknown[]) => mockUseTeamMood(...args),
    TeamMoodDashboard: ({ hasEnoughData, isAnalyzing }: any) => (
        <div data-testid="team-mood-dashboard">
            {hasEnoughData ? 'has-data' : 'no-data'}
            {isAnalyzing ? '-analyzing' : ''}
        </div>
    ),
}));

describe('TeamMoodTab', () => {
    const baseProps = {
        cards: [],
        sentimentResults: new Map(),
        columnConfigs: {},
    };

    it('shows the disabled explanation when sentiment analysis is off', () => {
        mockUseTeamMood.mockReturnValue({ report: {}, hasEnoughData: false, isAnalyzing: false });
        render(<TeamMoodTab {...baseProps} sentimentEnabled={false} sentimentReady={false} />);

        expect(screen.getByText('retrospective.facilitator.teamMood.disabled.title')).toBeInTheDocument();
        expect(screen.queryByTestId('team-mood-dashboard')).not.toBeInTheDocument();
    });

    it('shows the initializing state when enabled but not yet ready', () => {
        mockUseTeamMood.mockReturnValue({ report: {}, hasEnoughData: false, isAnalyzing: true });
        render(<TeamMoodTab {...baseProps} sentimentEnabled={true} sentimentReady={false} />);

        expect(screen.getByText('retrospective.facilitator.teamMood.initializing.title')).toBeInTheDocument();
        expect(screen.queryByTestId('team-mood-dashboard')).not.toBeInTheDocument();
    });

    it('renders the TeamMoodDashboard once enabled and ready', () => {
        mockUseTeamMood.mockReturnValue({ report: { some: 'report' }, hasEnoughData: true, isAnalyzing: false });
        render(<TeamMoodTab {...baseProps} sentimentEnabled={true} sentimentReady={true} />);

        expect(screen.getByTestId('team-mood-dashboard')).toHaveTextContent('has-data');
    });
});
