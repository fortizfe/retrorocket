import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ParticipantList from '../../../components/participants/ParticipantList';
import { Participant } from '../../../types/participant';

// Mock UserAvatar component
vi.mock('../../../components/participants/UserAvatar', () => ({
    default: ({ user, size }: { user: { name: string; photoURL?: string | null }; size: string }) => (
        <div data-testid="user-avatar" data-user-name={user.name} data-size={size}>
            {user.name.charAt(0)}
        </div>
    ),
}));

// Mock useLanguage hook
vi.mock('../../../hooks/useLanguage', () => ({
    useLanguage: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'participants.totalParticipants': 'Participantes totales',
                'participants.connectedNow': 'Conectados ahora',
            };
            return translations[key] || key;
        },
    }),
}));

describe('ParticipantList', () => {
    let mockDate: Date;

    beforeEach(() => {
        // Mock current time to a fixed date for consistent time formatting tests
        mockDate = new Date('2024-01-01T12:00:00Z');
        vi.setSystemTime(mockDate);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const createMockParticipant = (overrides: Partial<Participant> = {}): Participant => ({
        id: 'participant-1',
        name: 'John Doe',
        userId: 'user-1',
        retrospectiveId: 'retro-1',
        joinedAt: new Date('2024-01-01T11:30:00Z'), // 30 minutes ago
        isActive: true,
        photoURL: 'https://example.com/avatar.jpg',
        ...overrides,
    });

    describe('Empty State', () => {
        it('should render empty state when no participants', () => {
            render(<ParticipantList participants={[]} />);

            expect(screen.getByText('No hay participantes conectados')).toBeInTheDocument();
            // UserCheck icon should be present (SVG element)
            const svgIcon = document.querySelector('svg');
            expect(svgIcon).toBeInTheDocument();
            expect(svgIcon).toHaveClass('w-8', 'h-8');
        });

        it('should apply custom className to empty state', () => {
            const { container } = render(
                <ParticipantList participants={[]} className="custom-class" />
            );

            expect(container.firstChild).toHaveClass('custom-class');
        });
    });

    describe('Participant Rendering', () => {
        it('should render single participant with all information', () => {
            const participant = createMockParticipant();
            render(<ParticipantList participants={[participant]} />);

            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Hace 30 min')).toBeInTheDocument();
            expect(screen.getByTestId('user-avatar')).toHaveAttribute('data-user-name', 'John Doe');
            expect(screen.getByTestId('user-avatar')).toHaveAttribute('data-size', 'md');
        });

        it('should render multiple participants', () => {
            const participants = [
                createMockParticipant({ id: '1', name: 'John Doe' }),
                createMockParticipant({ id: '2', name: 'Jane Smith', isActive: false }),
                createMockParticipant({ id: '3', name: 'Bob Johnson' }),
            ];

            render(<ParticipantList participants={participants} />);

            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
            expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
        });

        it('should render participant without photoURL', () => {
            const participant = createMockParticipant({ photoURL: null });
            render(<ParticipantList participants={[participant]} />);

            expect(screen.getByTestId('user-avatar')).toBeInTheDocument();
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        it('should truncate long participant names', () => {
            const participant = createMockParticipant({
                name: 'Very Long Participant Name That Should Be Truncated'
            });
            render(<ParticipantList participants={[participant]} />);

            const nameElement = screen.getByText('Very Long Participant Name That Should Be Truncated');
            expect(nameElement).toHaveClass('truncate');
        });
    });

    describe('Connection Status', () => {
        it('should show active status indicator for connected participant', () => {
            const participant = createMockParticipant({ isActive: true });
            render(<ParticipantList participants={[participant]} />);

            const statusIndicator = screen.getByTitle('Conectado');
            expect(statusIndicator).toBeInTheDocument();
            expect(statusIndicator).toHaveClass('bg-green-500');
        });

        it('should show inactive status indicator for disconnected participant', () => {
            const participant = createMockParticipant({ isActive: false });
            render(<ParticipantList participants={[participant]} />);

            const statusIndicator = screen.getByTitle('Desconectado');
            expect(statusIndicator).toBeInTheDocument();
            expect(statusIndicator).toHaveClass('bg-slate-300', 'dark:bg-slate-600');
        });
    });

    describe('Time Formatting', () => {
        it('should show "Ahora mismo" for very recent join time', () => {
            const participant = createMockParticipant({
                joinedAt: new Date('2024-01-01T11:59:30Z') // 30 seconds ago
            });
            render(<ParticipantList participants={[participant]} />);

            expect(screen.getByText('Ahora mismo')).toBeInTheDocument();
        });

        it('should show minutes for recent join time', () => {
            const participant = createMockParticipant({
                joinedAt: new Date('2024-01-01T11:45:00Z') // 15 minutes ago
            });
            render(<ParticipantList participants={[participant]} />);

            expect(screen.getByText('Hace 15 min')).toBeInTheDocument();
        });

        it('should show hours for older join time', () => {
            const participant = createMockParticipant({
                joinedAt: new Date('2024-01-01T09:00:00Z') // 3 hours ago
            });
            render(<ParticipantList participants={[participant]} />);

            expect(screen.getByText('Hace 3h')).toBeInTheDocument();
        });

        it('should handle edge case of exactly 1 minute', () => {
            const participant = createMockParticipant({
                joinedAt: new Date('2024-01-01T11:59:00Z') // exactly 1 minute ago
            });
            render(<ParticipantList participants={[participant]} />);

            expect(screen.getByText('Hace 1 min')).toBeInTheDocument();
        });

        it('should handle edge case of exactly 1 hour', () => {
            const participant = createMockParticipant({
                joinedAt: new Date('2024-01-01T11:00:00Z') // exactly 1 hour ago
            });
            render(<ParticipantList participants={[participant]} />);

            expect(screen.getByText('Hace 1h')).toBeInTheDocument();
        });
    });

    describe('Summary Statistics', () => {
        it('should show correct total participant count', () => {
            const participants = [
                createMockParticipant({ id: '1', isActive: true }),
                createMockParticipant({ id: '2', isActive: false }),
                createMockParticipant({ id: '3', isActive: true }),
            ];
            render(<ParticipantList participants={participants} />);

            expect(screen.getByText('Participantes totales')).toBeInTheDocument();
            expect(screen.getByText('3')).toBeInTheDocument();
        });

        it('should show correct connected participant count', () => {
            const participants = [
                createMockParticipant({ id: '1', isActive: true }),
                createMockParticipant({ id: '2', isActive: false }),
                createMockParticipant({ id: '3', isActive: true }),
            ];
            render(<ParticipantList participants={participants} />);

            expect(screen.getByText('Conectados ahora')).toBeInTheDocument();
            const connectedElements = screen.getAllByText('2');
            expect(connectedElements[0]).toHaveClass('text-green-600', 'dark:text-green-400');
        });

        it('should handle all participants disconnected', () => {
            const participants = [
                createMockParticipant({ id: '1', isActive: false }),
                createMockParticipant({ id: '2', isActive: false }),
            ];
            render(<ParticipantList participants={participants} />);

            const connectedElements = screen.getAllByText('0');
            expect(connectedElements[0]).toHaveClass('text-green-600', 'dark:text-green-400');
        });

        it('should handle all participants connected', () => {
            const participants = [
                createMockParticipant({ id: '1', isActive: true }),
                createMockParticipant({ id: '2', isActive: true }),
            ];
            render(<ParticipantList participants={participants} />);

            const connectedElements = screen.getAllByText('2');
            // Get the connected count element (should be the second "2" in the summary section)
            expect(connectedElements[1]).toHaveClass('text-green-600', 'dark:text-green-400');
        });
    });

    describe('Styling and Layout', () => {
        it('should apply custom className', () => {
            const participant = createMockParticipant();
            const { container } = render(
                <ParticipantList participants={[participant]} className="custom-wrapper" />
            );

            expect(container.firstChild).toHaveClass('custom-wrapper');
        });

        it('should apply default maxHeight', () => {
            const participant = createMockParticipant();
            render(<ParticipantList participants={[participant]} />);

            const scrollContainer = document.querySelector('.overflow-y-auto');
            expect(scrollContainer).toHaveClass('max-h-64');
        });

        it('should apply custom maxHeight', () => {
            const participant = createMockParticipant();
            render(<ParticipantList participants={[participant]} maxHeight="max-h-96" />);

            const scrollContainer = document.querySelector('.overflow-y-auto');
            expect(scrollContainer).toHaveClass('max-h-96');
        });

        it('should have hover effects on participant items', () => {
            const participant = createMockParticipant();
            render(<ParticipantList participants={[participant]} />);

            // Find the main participant item container by looking for the element with hover classes
            const participantItem = document.querySelector('.hover\\:bg-slate-50');
            expect(participantItem).toHaveClass('hover:bg-slate-50', 'dark:hover:bg-slate-700/50');
        });

        it('should have scrollbar styling', () => {
            const participant = createMockParticipant();
            render(<ParticipantList participants={[participant]} />);

            const scrollContainer = document.querySelector('.overflow-y-auto');
            expect(scrollContainer).toHaveClass(
                'scrollbar-thin',
                'scrollbar-thumb-slate-300',
                'dark:scrollbar-thumb-slate-600'
            );
        });
    });

    describe('Clock Icon and Time Display', () => {
        it('should render clock icon next to join time', () => {
            const participant = createMockParticipant();
            render(<ParticipantList participants={[participant]} />);

            const timeContainer = screen.getByText('Hace 30 min').parentElement;
            expect(timeContainer).toHaveClass('flex', 'items-center', 'gap-1');

            // Clock icon should be present (Lucide icon)
            const clockIcon = timeContainer?.querySelector('svg');
            expect(clockIcon).toBeInTheDocument();
            expect(clockIcon).toHaveClass('w-3', 'h-3');
        });
    });

    describe('Layout and Responsiveness', () => {
        it('should have proper spacing between elements', () => {
            const participants = [
                createMockParticipant({ id: '1', name: 'John' }),
                createMockParticipant({ id: '2', name: 'Jane' }),
            ];
            render(<ParticipantList participants={participants} />);

            const participantsContainer = document.querySelector('.space-y-2');
            expect(participantsContainer).toBeInTheDocument();
        });

        it('should have proper flex layout for participant items', () => {
            const participant = createMockParticipant();
            render(<ParticipantList participants={[participant]} />);

            // Find the main participant item container with the correct classes
            const participantItem = document.querySelector('.flex.items-center.justify-between.p-3.rounded-lg');
            expect(participantItem).toHaveClass(
                'flex',
                'items-center',
                'justify-between',
                'p-3',
                'rounded-lg'
            );
        });

        it('should handle long names with proper text truncation', () => {
            const participant = createMockParticipant({
                name: 'Very Very Very Long Participant Name That Should Be Truncated Properly'
            });
            render(<ParticipantList participants={[participant]} />);

            const nameElement = screen.getByText(/Very Very Very Long/);
            expect(nameElement).toHaveClass('truncate');
            expect(nameElement.parentElement).toHaveClass('min-w-0', 'flex-1');
        });
    });

    describe('Border and Separation', () => {
        it('should have border separator before summary', () => {
            const participant = createMockParticipant();
            render(<ParticipantList participants={[participant]} />);

            const summaryContainer = screen.getByText('Participantes totales').closest('.mt-4');
            expect(summaryContainer).toHaveClass(
                'mt-4',
                'pt-4',
                'border-t',
                'border-slate-200',
                'dark:border-slate-700'
            );
        });
    });

    describe('Accessibility and Semantics', () => {
        it('should have proper title attributes for status indicators', () => {
            const participants = [
                createMockParticipant({ id: '1', isActive: true }),
                createMockParticipant({ id: '2', isActive: false }),
            ];
            render(<ParticipantList participants={participants} />);

            expect(screen.getByTitle('Conectado')).toBeInTheDocument();
            expect(screen.getByTitle('Desconectado')).toBeInTheDocument();
        });

        it('should maintain proper heading hierarchy', () => {
            const participant = createMockParticipant();
            render(<ParticipantList participants={[participant]} />);

            const nameHeading = screen.getByRole('heading', { level: 4 });
            expect(nameHeading).toHaveTextContent('John Doe');
            expect(nameHeading).toHaveClass('font-medium');
        });
    });
});
