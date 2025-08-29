import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import ParticipantList from '../../../components/participants/ParticipantList';
import { Participant } from '../../../types/participant';

// Mock language hook
const mockT = vi.fn((key: string) => {
    const translations: Record<string, string> = {
        'participants.title': 'Participantes',
        'participants.totalParticipants': 'Total de participantes'
    };
    return translations[key] || key;
});

vi.mock('../../../hooks/useLanguage', () => ({
    useLanguage: () => ({ t: mockT })
}));

describe('ImprovedParticipantList', () => {
    const createMockParticipant = (overrides: Partial<Participant> = {}): Participant => ({
        id: `participant-${Date.now()}-${Math.random()}`,
        name: 'Test User',
        userId: 'user123',
        retrospectiveId: 'retro1',
        joinedAt: new Date('2024-01-01T12:00:00Z'),
        photoURL: null,
        ...overrides
    });

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock current time for consistent time formatting
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Empty State', () => {
        it('should show empty state when no participants', () => {
            render(<ParticipantList participants={[]} />);

            expect(screen.getByText('No hay participantes aún')).toBeInTheDocument();
            expect(screen.getByText('Los participantes aparecerán aquí cuando se unan')).toBeInTheDocument();
        });

        it('should display Users icon in empty state', () => {
            render(<ParticipantList participants={[]} />);

            const usersIcon = screen.getByRole('img', { hidden: true });
            expect(usersIcon).toBeInTheDocument();
        });
    });

    describe('Participant Display', () => {
        it('should display participant information correctly', () => {
            const participant = createMockParticipant({
                name: 'Alice Johnson',
                joinedAt: new Date('2024-01-01T11:30:00Z') // 30 minutes ago
            });

            render(<ParticipantList participants={[participant]} />);

            expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
            expect(screen.getByText('Se unió Hace 30 min')).toBeInTheDocument();
        });

        it('should show "Último" badge for the most recent participant', () => {
            const participants = [
                createMockParticipant({
                    id: '1',
                    name: 'Alice',
                    joinedAt: new Date('2024-01-01T10:00:00Z')
                }),
                createMockParticipant({
                    id: '2',
                    name: 'Bob',
                    joinedAt: new Date('2024-01-01T11:00:00Z') // Most recent
                })
            ];

            render(<ParticipantList participants={participants} />);

            // Should show "Último" badge next to Bob (most recent)
            expect(screen.getByText('Último')).toBeInTheDocument();
        });

        it('should show new participant indicator for recent joiners', () => {
            const participant = createMockParticipant({
                name: 'New User',
                joinedAt: new Date('2024-01-01T11:58:00Z') // 2 minutes ago (within 5 min threshold)
            });

            render(<ParticipantList participants={[participant]} />);

            const indicator = screen.getByTitle('Recién llegado');
            expect(indicator).toBeInTheDocument();
            expect(indicator).toHaveClass('bg-green-500', 'animate-pulse');
        });

        it('should not show new participant indicator for older participants', () => {
            const participant = createMockParticipant({
                name: 'Old User',
                joinedAt: new Date('2024-01-01T11:00:00Z') // 1 hour ago
            });

            render(<ParticipantList participants={[participant]} />);

            expect(screen.queryByTitle('Recién llegado')).not.toBeInTheDocument();
        });
    });

    describe('Participant Sorting', () => {
        it('should sort participants by join date (newest first)', () => {
            const participants = [
                createMockParticipant({
                    id: '1',
                    name: 'Alice',
                    joinedAt: new Date('2024-01-01T09:00:00Z')
                }),
                createMockParticipant({
                    id: '2',
                    name: 'Bob',
                    joinedAt: new Date('2024-01-01T11:00:00Z')
                }),
                createMockParticipant({
                    id: '3',
                    name: 'Charlie',
                    joinedAt: new Date('2024-01-01T10:00:00Z')
                })
            ];

            render(<ParticipantList participants={participants} />);

            const participantNames = screen.getAllByRole('heading', { level: 4 });
            expect(participantNames[0]).toHaveTextContent('Bob'); // Most recent
            expect(participantNames[1]).toHaveTextContent('Charlie');
            expect(participantNames[2]).toHaveTextContent('Alice'); // Oldest
        });
    });

    describe('Time Formatting', () => {
        it('should format recent times correctly', () => {
            const testCases = [
                { joinedAt: new Date('2024-01-01T11:59:30Z'), expected: 'Ahora mismo' }, // 30 seconds ago
                { joinedAt: new Date('2024-01-01T11:45:00Z'), expected: 'Hace 15 min' }, // 15 minutes ago
                { joinedAt: new Date('2024-01-01T09:00:00Z'), expected: 'Hace 3h' }, // 3 hours ago
                { joinedAt: new Date('2023-12-31T12:00:00Z'), expected: 'Hace 1d' }  // 1 day ago
            ];

            testCases.forEach(({ joinedAt, expected }) => {
                const participant = createMockParticipant({ joinedAt });
                const { unmount } = render(<ParticipantList participants={[participant]} />);

                expect(screen.getByText(`Se unió ${expected}`)).toBeInTheDocument();
                unmount();
            });
        });
    });

    describe('Header and Summary', () => {
        it('should display header with title and participant count', () => {
            const participants = [
                createMockParticipant({ id: '1', name: 'Alice' }),
                createMockParticipant({ id: '2', name: 'Bob' }),
                createMockParticipant({ id: '3', name: 'Charlie' })
            ];

            render(<ParticipantList participants={participants} />);

            expect(screen.getByText('Participantes')).toBeInTheDocument();
            expect(screen.getByText('3')).toBeInTheDocument(); // Count in header
        });

        it('should display correct total in summary section', () => {
            const participants = [
                createMockParticipant({ id: '1', name: 'Alice' }),
                createMockParticipant({ id: '2', name: 'Bob' })
            ];

            render(<ParticipantList participants={participants} />);

            expect(screen.getByText('Total de participantes')).toBeInTheDocument();
            expect(screen.getAllByText('2')).toHaveLength(2); // One in header, one in summary
        });
    });

    describe('Styling and Interactions', () => {
        it('should apply correct CSS classes', () => {
            const participant = createMockParticipant();
            const { container } = render(<ParticipantList participants={[participant]} />);

            // Check for hover effects and transitions
            const participantItem = container.querySelector('[class*="hover:bg-slate-50"]');
            expect(participantItem).toBeInTheDocument();
        });

        it('should apply custom className', () => {
            const participant = createMockParticipant();
            const { container } = render(
                <ParticipantList participants={[participant]} className="custom-class" />
            );

            expect(container.firstChild).toHaveClass('custom-class');
        });

        it('should apply custom maxHeight', () => {
            const participant = createMockParticipant();
            const { container } = render(
                <ParticipantList participants={[participant]} maxHeight="max-h-96" />
            );

            const scrollableArea = container.querySelector('.max-h-96');
            expect(scrollableArea).toBeInTheDocument();
        });
    });

    describe('Avatar Integration', () => {
        it('should handle participants with photos', () => {
            const participant = createMockParticipant({
                name: 'User With Photo',
                photoURL: 'https://example.com/photo.jpg'
            });

            render(<ParticipantList participants={[participant]} />);

            expect(screen.getByText('User With Photo')).toBeInTheDocument();
            // UserAvatar component should be rendered (tested separately)
        });

        it('should handle participants without photos', () => {
            const participant = createMockParticipant({
                name: 'User Without Photo',
                photoURL: null
            });

            render(<ParticipantList participants={[participant]} />);

            expect(screen.getByText('User Without Photo')).toBeInTheDocument();
        });
    });

    describe('Long Names and Text Truncation', () => {
        it('should handle long participant names', () => {
            const participant = createMockParticipant({
                name: 'Very Long Participant Name That Should Be Truncated Properly'
            });

            render(<ParticipantList participants={[participant]} />);

            const nameElement = screen.getByText('Very Long Participant Name That Should Be Truncated Properly');
            expect(nameElement).toHaveClass('truncate');
        });
    });

    describe('Accessibility', () => {
        it('should have proper heading structure', () => {
            const participants = [
                createMockParticipant({ name: 'Alice' }),
                createMockParticipant({ name: 'Bob' })
            ];

            render(<ParticipantList participants={participants} />);

            const headings = screen.getAllByRole('heading');
            expect(headings).toHaveLength(2); // One for each participant
        });

        it('should have proper title attributes for indicators', () => {
            const participant = createMockParticipant({
                joinedAt: new Date('2024-01-01T11:58:00Z') // Recent enough for indicator
            });

            render(<ParticipantList participants={[participant]} />);

            expect(screen.getByTitle('Recién llegado')).toBeInTheDocument();
        });
    });
});
