import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import ParticipantList from '@/features/boards/participants/components/ParticipantList';
import { Participant } from '@/features/boards/types/participant';

// Mock language hook
const mockT = vi.fn((key: string) => {
    const translations: Record<string, string> = {
        'participants.title': 'Participantes',
                'participants.emptyTitle': 'No hay participantes',
                'participants.emptySubtitle': 'La sesión está esperando participantes'
    };
    return translations[key] || key;
});

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: mockT })
}));

// Mock UserAvatar component
vi.mock('@/features/boards/participants/components/UserAvatar', () => ({
    default: ({ user, size, className }: any) => (
        <div
            className={`user-avatar ${className}`}
            title={user.name}
            data-size={size}
        >
            <span className="text-xs">
                {user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
            </span>
        </div>
    ),
}));

describe('ParticipantList', () => {
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
    });

    describe('Empty State', () => {
        it('should show empty state when no participants', () => {
            render(<ParticipantList participants={[]} />);

            expect(screen.getByText('No hay participantes')).toBeInTheDocument();
            expect(screen.getByText('La sesión está esperando participantes')).toBeInTheDocument();
        });

        it('should not show header when no participants', () => {
            render(<ParticipantList participants={[]} />);

            expect(screen.queryByText('Participantes')).not.toBeInTheDocument();
        });
    });

    describe('Participant Display', () => {
        it('should display participant information correctly', () => {
            const participant = createMockParticipant({
                name: 'Alice Johnson'
            });

            render(<ParticipantList participants={[participant]} />);

            expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        });

        it('should display participants alphabetically sorted', () => {
            const participants = [
                createMockParticipant({
                    id: '2',
                    name: 'Bob'
                }),
                createMockParticipant({
                    id: '1',
                    name: 'Alice'
                }),
                createMockParticipant({
                    id: '3',
                    name: 'Charlie'
                })
            ];

            render(<ParticipantList participants={participants} />);

            const participantNames = screen.getAllByRole('heading', { level: 4 });
            expect(participantNames[0]).toHaveTextContent('Alice'); // Alphabetically first
            expect(participantNames[1]).toHaveTextContent('Bob');
            expect(participantNames[2]).toHaveTextContent('Charlie');
        });

        it('should show participant count in header', () => {
            const participants = [
                createMockParticipant({
                    name: 'Alice'
                }),
                createMockParticipant({
                    name: 'Bob'
                })
            ];

            render(<ParticipantList participants={participants} />);

            expect(screen.getByText('2')).toBeInTheDocument();
        });
    });

    describe('Header and Summary', () => {
        it('should display header with title when showCount is true', () => {
            const participants = [
                createMockParticipant({ name: 'Alice' }),
                createMockParticipant({ name: 'Bob' })
            ];

            render(<ParticipantList participants={participants} showCount={true} />);

            expect(screen.getByText('Participantes')).toBeInTheDocument();
            expect(screen.getByText('2')).toBeInTheDocument();
        });

        it('should hide header when showCount is false', () => {
            const participants = [
                createMockParticipant({ name: 'Alice' })
            ];

            render(<ParticipantList participants={participants} showCount={false} />);

            expect(screen.queryByText('Participantes')).not.toBeInTheDocument();
        });
    });

    describe('Props Configuration', () => {
        it('should apply custom className', () => {
            const participant = createMockParticipant();
            const customClass = 'custom-participant-list';

            const { container } = render(
                <ParticipantList participants={[participant]} className={customClass} />
            );

            expect(container.firstChild).toHaveClass(customClass);
        });

        it('should handle compact mode', () => {
            const participant = createMockParticipant();

            render(<ParticipantList participants={[participant]} compact={true} />);

            // In compact mode, UserAvatar should receive 'sm' size
            const avatar = screen.getByTitle(participant.name);
            expect(avatar).toHaveAttribute('data-size', 'sm');
        });

        it('should handle custom maxHeight', () => {
            const participant = createMockParticipant();
            const customMaxHeight = 'max-h-96';

            const { container } = render(
                <ParticipantList participants={[participant]} maxHeight={customMaxHeight} />
            );

            const scrollContainer = container.querySelector('.overflow-y-auto');
            expect(scrollContainer).toHaveClass(customMaxHeight);
        });
    });

    describe('Background Scroll Prevention', () => {
        beforeEach(() => {
            // Reset body style before each test
            document.body.style.overflow = '';
        });

        it('should prevent background scroll when enabled', () => {
            const participant = createMockParticipant();

            render(<ParticipantList participants={[participant]} preventBackgroundScroll={true} />);

            expect(document.body.style.overflow).toBe('hidden');
        });

        it('should not affect background scroll when disabled', () => {
            const participant = createMockParticipant();

            render(<ParticipantList participants={[participant]} preventBackgroundScroll={false} />);

            // Should remain empty/auto
            expect(document.body.style.overflow).toBe('');
        });
    });

    describe('UserAvatar Integration', () => {
        it('should render UserAvatar for each participant', () => {
            const participants = [
                createMockParticipant({ name: 'Alice Johnson' }),
                createMockParticipant({ name: 'Bob Smith' })
            ];

            render(<ParticipantList participants={participants} />);

            expect(screen.getByTitle('Alice Johnson')).toBeInTheDocument();
            expect(screen.getByTitle('Bob Smith')).toBeInTheDocument();
        });

        it('should pass correct size to UserAvatar based on compact prop', () => {
            const participant = createMockParticipant({ name: 'Test User' });

            const { rerender } = render(<ParticipantList participants={[participant]} compact={false} />);

            expect(screen.getByTitle('Test User')).toHaveAttribute('data-size', 'md');

            rerender(<ParticipantList participants={[participant]} compact={true} />);

            expect(screen.getByTitle('Test User')).toHaveAttribute('data-size', 'sm');
        });
    });

    describe('Edge Cases', () => {
        it('should handle participants with long names', () => {
            const participant = createMockParticipant({
                name: 'Very Long Name That Could Potentially Overflow'
            });

            render(<ParticipantList participants={[participant]} />);

            const nameElement = screen.getByText('Very Long Name That Could Potentially Overflow');
            expect(nameElement).toHaveClass('truncate');
        });

        it('should handle large numbers of participants', () => {
            const participants = Array.from({ length: 100 }, (_, i) =>
                createMockParticipant({
                    id: `participant-${i}`,
                    name: `User ${i}`
                })
            );

            render(<ParticipantList participants={participants} />);

            expect(screen.getByText('100')).toBeInTheDocument();
            expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(100);
        });
    });
});
