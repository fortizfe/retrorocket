import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ParticipantList from '@/features/boards/participants/components/ParticipantList';
import { Participant } from '@/features/boards/types/participant';

// Mock UserAvatar component
vi.mock('@/features/boards/participants/components/UserAvatar', () => ({
    default: ({ user, size }: { user: { name: string; photoURL?: string | null }; size: string }) => (
        <div data-testid="user-avatar" data-user-name={user.name} data-size={size}>
            {user.name.charAt(0)}
        </div>
    ),
}));

// Mock useLanguage hook
vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'participants.title': 'Participantes',
                'participants.emptyTitle': 'No hay participantes',
                'participants.emptySubtitle': 'La sesión está esperando participantes'
            };
            return translations[key] || key;
        },
    }),
}));

describe('ParticipantList - Optimized UX', () => {
    const createMockParticipant = (overrides: Partial<Participant> = {}): Participant => ({
        id: 'participant-1',
        name: 'John Doe',
        userId: 'user-1',
        retrospectiveId: 'retro-1',
        joinedAt: new Date('2024-01-01T11:30:00Z'),
        photoURL: 'https://example.com/avatar.jpg',
        ...overrides,
    });

    describe('Empty State', () => {
        it('should show clean empty state when no participants', () => {
            render(<ParticipantList participants={[]} />);

            expect(screen.getByText('No hay participantes')).toBeInTheDocument();
            expect(screen.getByText('La sesión está esperando participantes')).toBeInTheDocument();
        });

        it('should render smaller icon in empty state for better proportion', () => {
            const { container } = render(<ParticipantList participants={[]} />);
            const icon = container.querySelector('.w-8.h-8');
            expect(icon).toBeInTheDocument();
        });
    });

    describe('Basic Rendering - Clean Interface', () => {
        it('should render participant name without extra information', () => {
            const participant = createMockParticipant({ name: 'Alice Johnson' });
            render(<ParticipantList participants={[participant]} />);

            expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
            // Should NOT show time information
            expect(screen.queryByText(/Se unió/)).not.toBeInTheDocument();
        });

        it('should show header with participant count by default', () => {
            const participants = [
                createMockParticipant({ id: '1', name: 'Alice' }),
                createMockParticipant({ id: '2', name: 'Bob' })
            ];
            render(<ParticipantList participants={participants} />);

            expect(screen.getByText('Participantes')).toBeInTheDocument();
            expect(screen.getByText('2')).toBeInTheDocument();
        });

        it('should hide header when showCount is false', () => {
            const participant = createMockParticipant({ name: 'Alice' });
            render(<ParticipantList participants={[participant]} showCount={false} />);

            expect(screen.queryByText('Participantes')).not.toBeInTheDocument();
            expect(screen.getByText('Alice')).toBeInTheDocument();
        });
    });

    describe('Alphabetical Sorting', () => {
        it('should sort participants alphabetically for predictability', () => {
            const participants = [
                createMockParticipant({ id: '1', name: 'Charlie', joinedAt: new Date('2024-01-01T10:00:00Z') }),
                createMockParticipant({ id: '2', name: 'Alice', joinedAt: new Date('2024-01-01T12:00:00Z') }),
                createMockParticipant({ id: '3', name: 'Bob', joinedAt: new Date('2024-01-01T11:00:00Z') })
            ];
            render(<ParticipantList participants={participants} />);

            const participantNames = screen.getAllByRole('heading', { level: 4 });
            expect(participantNames[0]).toHaveTextContent('Alice'); // Alphabetically first
            expect(participantNames[1]).toHaveTextContent('Bob');
            expect(participantNames[2]).toHaveTextContent('Charlie'); // Alphabetically last
        });

        it('should handle case-insensitive sorting', () => {
            const participants = [
                createMockParticipant({ id: '1', name: 'alice' }),
                createMockParticipant({ id: '2', name: 'Bob' }),
                createMockParticipant({ id: '3', name: 'CHARLIE' })
            ];
            render(<ParticipantList participants={participants} />);

            const participantNames = screen.getAllByRole('heading', { level: 4 });
            expect(participantNames[0]).toHaveTextContent('alice');
            expect(participantNames[1]).toHaveTextContent('Bob');
            expect(participantNames[2]).toHaveTextContent('CHARLIE');
        });
    });

    describe('Compact Mode', () => {
        it('should use smaller spacing in compact mode', () => {
            const participant = createMockParticipant();
            const { container } = render(<ParticipantList participants={[participant]} compact={true} />);

            const participantsContainer = container.querySelector('.space-y-1');
            expect(participantsContainer).toBeInTheDocument();
        });

        it('should use smaller padding in compact mode', () => {
            const participant = createMockParticipant();
            const { container } = render(<ParticipantList participants={[participant]} compact={true} />);

            const participantItem = container.querySelector('.p-2');
            expect(participantItem).toBeInTheDocument();
        });

        it('should use smaller avatars in compact mode', () => {
            const participant = createMockParticipant({ name: 'Alice' });
            render(<ParticipantList participants={[participant]} compact={true} />);

            expect(screen.getByTestId('user-avatar')).toHaveAttribute('data-size', 'sm');
        });
    });

    describe('Clean Styling', () => {
        it('should use subtle colors instead of bright blues', () => {
            const participants = [createMockParticipant()];
            const { container } = render(<ParticipantList participants={participants} />);

            // Should use subtle slate colors instead of bright blue
            const countBadge = container.querySelector('.bg-surface');
            expect(countBadge).toBeInTheDocument();
        });

        it('should use rounded-lg instead of rounded-xl for less distraction', () => {
            const participant = createMockParticipant();
            const { container } = render(<ParticipantList participants={[participant]} />);

            const participantItem = container.querySelector('.rounded-lg');
            expect(participantItem).toBeInTheDocument();
        });

        it('should have subtle hover effects', () => {
            const participant = createMockParticipant();
            const { container } = render(<ParticipantList participants={[participant]} />);

            const participantItem = container.querySelector('.hover\\:bg-surface-raised');
            expect(participantItem).toBeInTheDocument();
        });
    });

    describe('Information Density', () => {
        it('should not show time information', () => {
            const participant = createMockParticipant({
                joinedAt: new Date('2024-01-01T11:30:00Z')
            });
            render(<ParticipantList participants={[participant]} />);

            expect(screen.queryByText(/Se unió/)).not.toBeInTheDocument();
            expect(screen.queryByText(/Ahora mismo/)).not.toBeInTheDocument();
            expect(screen.queryByText(/Hace/)).not.toBeInTheDocument();
        });

        it('should not show "Último" badge', () => {
            const participants = [
                createMockParticipant({ id: '1', name: 'Alice' }),
                createMockParticipant({ id: '2', name: 'Bob' })
            ];
            render(<ParticipantList participants={participants} />);

            expect(screen.queryByText('Último')).not.toBeInTheDocument();
        });

        it('should not show recent participant indicators', () => {
            const participant = createMockParticipant({
                joinedAt: new Date() // Very recent
            });
            render(<ParticipantList participants={[participant]} />);

            expect(screen.queryByTitle('Recién llegado')).not.toBeInTheDocument();
        });

        it('should not show summary footer', () => {
            const participants = [createMockParticipant(), createMockParticipant()];
            const { container } = render(<ParticipantList participants={participants} />);

            // Should show count in header
            expect(screen.getByText('2')).toBeInTheDocument();

            // Should NOT have redundant footer with repeated statistics
            const footerSection = container.querySelector('.mt-4.pt-4');
            expect(footerSection).not.toBeInTheDocument();
        });
    });

    describe('Layout and Responsiveness', () => {
        it('should handle long names with proper text truncation', () => {
            const participant = createMockParticipant({
                name: 'Very Very Very Long Participant Name That Should Be Truncated'
            });
            render(<ParticipantList participants={[participant]} />);

            const nameElement = screen.getByText(/Very Very Very Long/);
            expect(nameElement).toHaveClass('truncate');
        });

        it('should handle custom className', () => {
            const participant = createMockParticipant();
            const { container } = render(
                <ParticipantList participants={[participant]} className="custom-class" />
            );

            expect(container.firstChild).toHaveClass('custom-class');
        });

        it('should handle custom maxHeight', () => {
            const participant = createMockParticipant();
            const { container } = render(
                <ParticipantList participants={[participant]} maxHeight="max-h-32" />
            );

            const scrollContainer = container.querySelector('.max-h-32');
            expect(scrollContainer).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('should have proper heading structure', () => {
            const participants = [
                createMockParticipant({ name: 'Alice' }),
                createMockParticipant({ name: 'Bob' })
            ];
            render(<ParticipantList participants={participants} />);

            const headings = screen.getAllByRole('heading', { level: 4 });
            expect(headings).toHaveLength(2);
        });

        it('should have clear empty state messaging', () => {
            render(<ParticipantList participants={[]} />);

            // Should have clear, actionable empty state text
            expect(screen.getByText('No hay participantes')).toBeInTheDocument();
            expect(screen.getByText('La sesión está esperando participantes')).toBeInTheDocument();
        });
    });

    describe('Performance and Efficiency', () => {
        it('should handle large participant lists efficiently', () => {
            const manyParticipants = Array.from({ length: 50 }, (_, i) =>
                createMockParticipant({
                    id: `participant-${i}`,
                    name: `Participant ${i.toString().padStart(2, '0')}`
                })
            );

            render(<ParticipantList participants={manyParticipants} />);

            // Should render all participants
            expect(screen.getAllByTestId('user-avatar')).toHaveLength(50);
            // Should maintain alphabetical order
            const firstParticipant = screen.getAllByRole('heading', { level: 4 })[0];
            expect(firstParticipant).toHaveTextContent('Participant 00');
        });

        it('should not perform unnecessary calculations or formatting', () => {
            const participant = createMockParticipant();

            // Mock console.time to check that no time calculations are performed
            const consoleSpy = vi.spyOn(console, 'time').mockImplementation(() => { });

            render(<ParticipantList participants={[participant]} />);

            // Should not call time-related functions
            expect(consoleSpy).not.toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });

    describe('Background Scroll Prevention', () => {
        it('should prevent background scroll when preventBackgroundScroll is enabled', () => {
            const participants = [createMockParticipant({ name: 'Test User' })];

            // Mock document.body.style
            const originalOverflow = document.body.style.overflow;

            render(<ParticipantList participants={participants} preventBackgroundScroll={true} />);

            // Should set body overflow to hidden
            expect(document.body.style.overflow).toBe('hidden');

            // Restore original value for cleanup
            document.body.style.overflow = originalOverflow;
        });

        it('should not prevent background scroll by default', () => {
            const participants = [createMockParticipant({ name: 'Test User' })];
            const originalOverflow = document.body.style.overflow;

            render(<ParticipantList participants={participants} />);

            // Should not change body overflow
            expect(document.body.style.overflow).toBe(originalOverflow);
        });

        it('should prevent background scroll even when no participants if enabled', () => {
            render(<ParticipantList participants={[]} preventBackgroundScroll={true} />);

            // Should prevent scroll even for empty list when preventBackgroundScroll is enabled
            // This is correct behavior - the modal/portal is open regardless of content
            expect(document.body.style.overflow).toBe('hidden');
        });

        it('should restore original overflow when component unmounts', () => {
            const participants = [createMockParticipant({ name: 'Test User' })];
            const originalOverflow = 'visible';
            document.body.style.overflow = originalOverflow;

            const { unmount } = render(<ParticipantList participants={participants} preventBackgroundScroll={true} />);

            // Should be hidden while mounted
            expect(document.body.style.overflow).toBe('hidden');

            // Unmount component
            unmount();

            // Should restore original overflow
            expect(document.body.style.overflow).toBe(originalOverflow);
        });
    });
});
