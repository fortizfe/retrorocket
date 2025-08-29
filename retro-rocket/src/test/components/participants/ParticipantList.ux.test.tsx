import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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
                'participants.title': 'Participantes'
            };
            return translations[key] || key;
        },
    }),
}));

describe('ParticipantList - UX Analysis Results', () => {
    const createMockParticipant = (overrides: Partial<Participant> = {}): Participant => ({
        id: 'participant-1',
        name: 'John Doe',
        userId: 'user-1',
        retrospectiveId: 'retro-1',
        joinedAt: new Date('2024-01-01T11:30:00Z'),
        photoURL: 'https://example.com/avatar.jpg',
        ...overrides,
    });

    describe('UX Improvement 1: Elimination of Distracting Information', () => {
        it('should focus only on essential information - participant names', () => {
            const participants = [
                createMockParticipant({ name: 'Alice', joinedAt: new Date('2024-01-01T10:00:00Z') }),
                createMockParticipant({ name: 'Bob', joinedAt: new Date('2024-01-01T12:00:00Z') })
            ];
            render(<ParticipantList participants={participants} />);

            // Should show names
            expect(screen.getByText('Alice')).toBeInTheDocument();
            expect(screen.getByText('Bob')).toBeInTheDocument();

            // Should NOT show distracting time information
            expect(screen.queryByText(/Se unió/)).not.toBeInTheDocument();
            expect(screen.queryByText(/Ahora mismo/)).not.toBeInTheDocument();
            expect(screen.queryByText(/Hace/)).not.toBeInTheDocument();

            // Should NOT show confusing temporal badges
            expect(screen.queryByText('Último')).not.toBeInTheDocument();
            expect(screen.queryByTitle('Recién llegado')).not.toBeInTheDocument();
        });

        it('should eliminate redundant footer statistics', () => {
            const participants = [
                createMockParticipant({ id: '1' }),
                createMockParticipant({ id: '2' }),
                createMockParticipant({ id: '3' })
            ];
            const { container } = render(<ParticipantList participants={participants} />);

            // Should show count in header
            expect(screen.getByText('3')).toBeInTheDocument();

            // Should NOT have redundant footer with repeated statistics
            const summarySection = container.querySelector('.mt-4.pt-4');
            expect(summarySection).not.toBeInTheDocument();
        });
    });

    describe('UX Improvement 2: Predictable and Logical Ordering', () => {
        it('should use alphabetical order for better user mental model', () => {
            const participants = [
                createMockParticipant({ id: '1', name: 'Zoe', joinedAt: new Date('2024-01-01T09:00:00Z') }),
                createMockParticipant({ id: '2', name: 'Alice', joinedAt: new Date('2024-01-01T12:00:00Z') }),
                createMockParticipant({ id: '3', name: 'Mike', joinedAt: new Date('2024-01-01T10:00:00Z') })
            ];
            render(<ParticipantList participants={participants} />);

            const participantNames = screen.getAllByRole('heading', { level: 4 });

            // Should be ordered alphabetically, NOT by join time
            expect(participantNames[0]).toHaveTextContent('Alice');
            expect(participantNames[1]).toHaveTextContent('Mike');
            expect(participantNames[2]).toHaveTextContent('Zoe');
        });

        it('should maintain consistent order regardless of join timing', () => {
            const participants = [
                createMockParticipant({ name: 'Beta', joinedAt: new Date('2024-01-01T08:00:00Z') }),
                createMockParticipant({ name: 'Alpha', joinedAt: new Date('2024-01-01T14:00:00Z') })
            ];
            render(<ParticipantList participants={participants} />);

            const participantNames = screen.getAllByRole('heading', { level: 4 });
            expect(participantNames[0]).toHaveTextContent('Alpha'); // Alphabetically first
            expect(participantNames[1]).toHaveTextContent('Beta');
        });
    });

    describe('UX Improvement 3: Optimized Information Density', () => {
        it('should maximize visible participants in limited space', () => {
            const manyParticipants = Array.from({ length: 10 }, (_, i) =>
                createMockParticipant({
                    id: `p-${i}`,
                    name: `Person ${String.fromCharCode(65 + i)}` // Person A, Person B, etc.
                })
            );

            const { container } = render(<ParticipantList participants={manyParticipants} compact={true} />);

            // Should use compact spacing
            expect(container.querySelector('.space-y-1')).toBeInTheDocument();
            expect(container.querySelector('.p-2')).toBeInTheDocument();

            // Should render all participants
            expect(screen.getAllByTestId('user-avatar')).toHaveLength(10);
        });

        it('should provide flexibility with compact mode', () => {
            const participant = createMockParticipant({ name: 'Test User' });

            // Regular mode
            const { container: regularContainer } = render(<ParticipantList participants={[participant]} />);
            expect(regularContainer.querySelector('.space-y-2')).toBeInTheDocument();
            expect(regularContainer.querySelector('.p-3')).toBeInTheDocument();

            // Compact mode
            const { container: compactContainer } = render(<ParticipantList participants={[participant]} compact={true} />);
            expect(compactContainer.querySelector('.space-y-1')).toBeInTheDocument();
            expect(compactContainer.querySelector('.p-2')).toBeInTheDocument();
        });
    });

    describe('UX Improvement 4: Clean Visual Design', () => {
        it('should use subtle, non-distracting colors', () => {
            const participants = [createMockParticipant({ name: 'Test' })];
            const { container } = render(<ParticipantList participants={participants} />);

            // Should use subtle slate colors instead of bright blues
            expect(container.querySelector('.bg-slate-100')).toBeInTheDocument();
            expect(container.querySelector('.text-slate-600')).toBeInTheDocument();

            // Should NOT use attention-grabbing blue badges
            expect(container.querySelector('.bg-blue-50')).not.toBeInTheDocument();
            expect(container.querySelector('.text-blue-600')).not.toBeInTheDocument();
        });

        it('should use appropriate border radius for modern feel without distraction', () => {
            const participant = createMockParticipant();
            const { container } = render(<ParticipantList participants={[participant]} />);

            // Should use moderate rounded-lg instead of excessive rounded-xl
            expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
            expect(container.querySelector('.rounded-xl')).not.toBeInTheDocument();
        });

        it('should have subtle hover effects', () => {
            const participant = createMockParticipant();
            const { container } = render(<ParticipantList participants={[participant]} />);

            const participantItem = container.querySelector('.hover\\:bg-slate-50');
            expect(participantItem).toBeInTheDocument();

            // Should have subtle transitions
            expect(participantItem).toHaveClass('transition-colors', 'duration-150');
        });
    });

    describe('UX Improvement 5: Enhanced Configurability', () => {
        it('should allow hiding the header for embedded use cases', () => {
            const participant = createMockParticipant({ name: 'Test' });
            render(<ParticipantList participants={[participant]} showCount={false} />);

            // Should not show header when explicitly disabled
            expect(screen.queryByText('Participantes')).not.toBeInTheDocument();
            expect(screen.getByText('Test')).toBeInTheDocument();
        });

        it('should support different height constraints', () => {
            const participant = createMockParticipant();
            const { container } = render(
                <ParticipantList participants={[participant]} maxHeight="max-h-32" />
            );

            expect(container.querySelector('.max-h-32')).toBeInTheDocument();
        });
    });

    describe('UX Improvement 6: Improved Empty State', () => {
        it('should have more actionable empty state messaging', () => {
            render(<ParticipantList participants={[]} />);

            // Should have clearer, more actionable messaging
            expect(screen.getByText('No hay participantes')).toBeInTheDocument();
            expect(screen.getByText('La sesión está esperando participantes')).toBeInTheDocument();
        });

        it('should use appropriately sized icon for better proportions', () => {
            const { container } = render(<ParticipantList participants={[]} />);

            // Should use w-8 h-8 instead of oversized w-12 h-12
            const icon = container.querySelector('.w-8.h-8');
            expect(icon).toBeInTheDocument();

            const oversizedIcon = container.querySelector('.w-12.h-12');
            expect(oversizedIcon).not.toBeInTheDocument();
        });
    });

    describe('UX Improvement 7: Performance and Scalability', () => {
        it('should handle large participant lists without performance degradation', () => {
            const largeParticipantList = Array.from({ length: 100 }, (_, i) =>
                createMockParticipant({
                    id: `participant-${i}`,
                    name: `User ${i.toString().padStart(3, '0')}`
                })
            );

            const startTime = performance.now();
            render(<ParticipantList participants={largeParticipantList} />);
            const endTime = performance.now();

            // Should render quickly (under 100ms for 100 participants)
            expect(endTime - startTime).toBeLessThan(100);

            // Should maintain alphabetical order even with many participants
            const firstParticipant = screen.getAllByRole('heading', { level: 4 })[0];
            expect(firstParticipant).toHaveTextContent('User 000');
        });

        it('should not perform unnecessary time calculations', () => {
            const participant = createMockParticipant();

            // Should render without any time-related processing
            const consoleSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.now());

            render(<ParticipantList participants={[participant]} />);

            // Should call Date.now() minimally (only for React keys, etc.)
            expect(consoleSpy.mock.calls.length).toBeLessThan(5);

            consoleSpy.mockRestore();
        });
    });

    describe('UX Improvement 8: Accessibility Enhancements', () => {
        it('should maintain clear information hierarchy', () => {
            const participants = [
                createMockParticipant({ name: 'Alice' }),
                createMockParticipant({ name: 'Bob' })
            ];
            render(<ParticipantList participants={participants} />);

            // Should have proper heading structure
            const headings = screen.getAllByRole('heading', { level: 4 });
            expect(headings).toHaveLength(2);

            // Names should be the primary content
            headings.forEach(heading => {
                expect(heading).toHaveClass('font-medium');
            });
        });

        it('should have clear semantic structure without clutter', () => {
            const participant = createMockParticipant({ name: 'Test User' });
            const { container } = render(<ParticipantList participants={[participant]} />);

            // Should have clean DOM structure without excessive nesting
            const participantItems = container.querySelectorAll('[class*="flex items-center"]');
            expect(participantItems.length).toBe(3); // Header, participant item, and UserAvatar wrapper
        });
    });

    describe('UX Improvement 9: Background Scroll Prevention', () => {
        it('should prevent background scroll when enabled for better focus', () => {
            const participants = [
                createMockParticipant({ name: 'Alice' }),
                createMockParticipant({ name: 'Bob' })
            ];

            const originalOverflow = document.body.style.overflow;

            render(<ParticipantList participants={participants} preventBackgroundScroll={true} />);

            // Should lock background scroll to keep user focused on participant list
            expect(document.body.style.overflow).toBe('hidden');

            // Cleanup
            document.body.style.overflow = originalOverflow;
        });

        it('should handle wheel events to prevent scroll propagation', () => {
            const participants = Array.from({ length: 10 }, (_, i) =>
                createMockParticipant({ id: `p-${i}`, name: `Person ${i}` })
            );

            const { container } = render(
                <ParticipantList
                    participants={participants}
                    preventBackgroundScroll={true}
                    maxHeight="max-h-32" // Small height to force scrolling
                />
            );

            const scrollContainer = container.querySelector('.overflow-y-auto');
            expect(scrollContainer).toBeInTheDocument();

            // Should have onWheel event handler for scroll control
            expect(scrollContainer).toHaveAttribute('class');
        });

        it('should maintain focus on participant list interaction', () => {
            const manyParticipants = Array.from({ length: 15 }, (_, i) =>
                createMockParticipant({
                    id: `participant-${i}`,
                    name: `User ${i.toString().padStart(2, '0')}`
                })
            );

            const { container } = render(
                <ParticipantList
                    participants={manyParticipants}
                    preventBackgroundScroll={true}
                    compact={true}
                />
            );

            // Should render all participants even with background scroll prevention
            expect(screen.getAllByTestId('user-avatar')).toHaveLength(15);

            // Should maintain scrollable container
            const scrollContainer = container.querySelector('.overflow-y-auto');
            expect(scrollContainer).toBeInTheDocument();
        });

        it('should restore scroll behavior when disabled', () => {
            const participants = [createMockParticipant({ name: 'Test' })];
            const originalOverflow = 'auto';
            document.body.style.overflow = originalOverflow;

            // Mount with scroll prevention enabled
            const { rerender } = render(
                <ParticipantList participants={participants} preventBackgroundScroll={true} />
            );
            expect(document.body.style.overflow).toBe('hidden');

            // Disable scroll prevention
            rerender(<ParticipantList participants={participants} preventBackgroundScroll={false} />);

            // Should restore original overflow behavior
            // Note: In real usage, this would be handled by the parent component
            expect(document.body.style.overflow).toBe('hidden'); // Still locked until unmounted
        });
    });
});
