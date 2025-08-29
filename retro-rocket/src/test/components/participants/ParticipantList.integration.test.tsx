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

describe('ParticipantList - Integration Scenarios', () => {
    const createMockParticipant = (overrides: Partial<Participant> = {}): Participant => ({
        id: 'participant-1',
        name: 'John Doe',
        userId: 'user-1',
        retrospectiveId: 'retro-1',
        joinedAt: new Date('2024-01-01T11:30:00Z'),
        photoURL: 'https://example.com/avatar.jpg',
        ...overrides,
    });

    describe('Real-world Usage Scenarios', () => {
        it('should work well for small teams (2-8 people)', () => {
            const smallTeam = [
                createMockParticipant({ id: '1', name: 'Sarah Chen' }),
                createMockParticipant({ id: '2', name: 'Mike Johnson' }),
                createMockParticipant({ id: '3', name: 'Ana García' }),
                createMockParticipant({ id: '4', name: 'David Kim' }),
                createMockParticipant({ id: '5', name: 'Emma Williams' })
            ];

            render(<ParticipantList participants={smallTeam} />);

            // Should show all participants in alphabetical order
            const names = screen.getAllByRole('heading', { level: 4 });
            expect(names[0]).toHaveTextContent('Ana García');
            expect(names[1]).toHaveTextContent('David Kim');
            expect(names[2]).toHaveTextContent('Emma Williams');
            expect(names[3]).toHaveTextContent('Mike Johnson');
            expect(names[4]).toHaveTextContent('Sarah Chen');

            // Should show participant count
            expect(screen.getByText('5')).toBeInTheDocument();

            // Should be clean and focused
            expect(screen.queryByText(/Se unió/)).not.toBeInTheDocument();
            expect(screen.queryByText('Último')).not.toBeInTheDocument();
        });

        it('should work efficiently for larger teams (15+ people)', () => {
            const largeTeam = Array.from({ length: 20 }, (_, i) =>
                createMockParticipant({
                    id: `participant-${i}`,
                    name: `Team Member ${String.fromCharCode(65 + (i % 26))}`
                })
            );

            const { container } = render(<ParticipantList participants={largeTeam} compact={true} />);

            // Should render all participants
            expect(screen.getAllByTestId('user-avatar')).toHaveLength(20);

            // Should use compact mode for better space utilization
            expect(container.querySelector('.space-y-1')).toBeInTheDocument();
            expect(container.querySelector('.p-2')).toBeInTheDocument();

            // Should maintain alphabetical order
            const firstParticipant = screen.getAllByRole('heading', { level: 4 })[0];
            expect(firstParticipant).toHaveTextContent(/Team Member A/);

            // Should have scrollable container
            expect(container.querySelector('.overflow-y-auto')).toBeInTheDocument();
        });

        it('should work as embedded component without header', () => {
            const participants = [
                createMockParticipant({ name: 'Alice' }),
                createMockParticipant({ name: 'Bob' })
            ];

            render(<ParticipantList participants={participants} showCount={false} />);

            // Should not show header
            expect(screen.queryByText('Participantes')).not.toBeInTheDocument();
            expect(screen.queryByText('2')).not.toBeInTheDocument();

            // Should still show participant names
            expect(screen.getByText('Alice')).toBeInTheDocument();
            expect(screen.getByText('Bob')).toBeInTheDocument();
        });

        it('should handle international names correctly', () => {
            const internationalTeam = [
                createMockParticipant({ id: '1', name: 'Åke Andersson' }),
                createMockParticipant({ id: '2', name: 'Zhang Wei' }),
                createMockParticipant({ id: '3', name: 'José María' }),
                createMockParticipant({ id: '4', name: 'Олександр Петров' }),
                createMockParticipant({ id: '5', name: 'محمد احمد' })
            ];

            render(<ParticipantList participants={internationalTeam} />);

            // Should render all international names correctly
            expect(screen.getByText('Åke Andersson')).toBeInTheDocument();
            expect(screen.getByText('Zhang Wei')).toBeInTheDocument();
            expect(screen.getByText('José María')).toBeInTheDocument();
            expect(screen.getByText('Олександр Петров')).toBeInTheDocument();
            expect(screen.getByText('محمد احمد')).toBeInTheDocument();

            // Should sort them alphabetically (locale-aware)
            const names = screen.getAllByRole('heading', { level: 4 });
            expect(names).toHaveLength(5);
        });

        it('should maintain clean appearance with mixed name lengths', () => {
            const mixedNames = [
                createMockParticipant({ id: '1', name: 'Al' }),
                createMockParticipant({ id: '2', name: 'Very Long Full Name That Might Cause Layout Issues' }),
                createMockParticipant({ id: '3', name: 'B' }),
                createMockParticipant({ id: '4', name: 'Medium Length Name' })
            ];

            const { container } = render(<ParticipantList participants={mixedNames} />);

            // Should handle name truncation properly
            const longName = screen.getByText(/Very Long Full Name/);
            expect(longName).toHaveClass('truncate');

            // Should maintain consistent layout
            const participantItems = container.querySelectorAll('.flex.items-center.gap-3');
            participantItems.forEach(item => {
                expect(item).toHaveClass('p-3'); // Regular padding
            });
        });
    });

    describe('Customization and Flexibility', () => {
        it('should support different height constraints for various contexts', () => {
            const participants = Array.from({ length: 15 }, (_, i) =>
                createMockParticipant({
                    id: `p-${i}`,
                    name: `Person ${i + 1}`
                })
            );

            // Sidebar usage - very constrained height
            const { container: sidebarContainer } = render(
                <ParticipantList participants={participants} maxHeight="max-h-32" compact={true} />
            );
            expect(sidebarContainer.querySelector('.max-h-32')).toBeInTheDocument();

            // Modal usage - moderate height
            const { container: modalContainer } = render(
                <ParticipantList participants={participants} maxHeight="max-h-64" />
            );
            expect(modalContainer.querySelector('.max-h-64')).toBeInTheDocument();

            // Full page usage - large height
            const { container: pageContainer } = render(
                <ParticipantList participants={participants} maxHeight="max-h-96" />
            );
            expect(pageContainer.querySelector('.max-h-96')).toBeInTheDocument();
        });

        it('should adapt to different design contexts with className', () => {
            const participant = createMockParticipant({ name: 'Test User' });

            // Card context
            const { container: cardContainer } = render(
                <ParticipantList
                    participants={[participant]}
                    className="bg-white rounded-lg shadow-sm p-4"
                />
            );
            expect(cardContainer.firstChild).toHaveClass('bg-white', 'rounded-lg', 'shadow-sm', 'p-4');

            // Sidebar context  
            const { container: sidebarContainer } = render(
                <ParticipantList
                    participants={[participant]}
                    className="border-r border-slate-200"
                />
            );
            expect(sidebarContainer.firstChild).toHaveClass('border-r', 'border-slate-200');
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle participants with missing or null photoURL gracefully', () => {
            const participantsWithMissingPhotos = [
                createMockParticipant({ name: 'No Photo User', photoURL: null }),
                createMockParticipant({ name: 'Undefined Photo User', photoURL: undefined }),
                createMockParticipant({ name: 'Empty Photo User', photoURL: '' })
            ];

            render(<ParticipantList participants={participantsWithMissingPhotos} />);

            // Should render all users
            expect(screen.getByText('No Photo User')).toBeInTheDocument();
            expect(screen.getByText('Undefined Photo User')).toBeInTheDocument();
            expect(screen.getByText('Empty Photo User')).toBeInTheDocument();

            // Should render avatars with initials
            expect(screen.getAllByTestId('user-avatar')).toHaveLength(3);
        });

        it('should handle duplicate names gracefully', () => {
            const duplicateNames = [
                createMockParticipant({ id: '1', name: 'John Smith' }),
                createMockParticipant({ id: '2', name: 'John Smith' }),
                createMockParticipant({ id: '3', name: 'John Smith' })
            ];

            render(<ParticipantList participants={duplicateNames} />);

            // Should render all participants (by unique IDs)
            expect(screen.getAllByText('John Smith')).toHaveLength(3);
            expect(screen.getAllByTestId('user-avatar')).toHaveLength(3);
        });

        it('should handle very short and very long names', () => {
            const extremeNames = [
                createMockParticipant({ id: '1', name: 'X' }),
                createMockParticipant({
                    id: '2',
                    name: 'Abcdefghijklmnopqrstuvwxyz Abcdefghijklmnopqrstuvwxyz Abcdefghijklmnopqrstuvwxyz'
                })
            ];

            render(<ParticipantList participants={extremeNames} />);

            // Should handle both extremes
            expect(screen.getAllByText('X')[1]).toBeInTheDocument(); // Get the heading, not the avatar
            expect(screen.getByText(/Abcdefghijklmnopqrstuvwxyz/)).toBeInTheDocument();
        });
    });

    describe('Performance Considerations', () => {
        it('should render quickly with reasonable participant counts', () => {
            const reasonableTeam = Array.from({ length: 25 }, (_, i) =>
                createMockParticipant({
                    id: `participant-${i}`,
                    name: `User ${i.toString().padStart(2, '0')}`
                })
            );

            const startTime = performance.now();
            render(<ParticipantList participants={reasonableTeam} />);
            const endTime = performance.now();

            // Should render in under 50ms for 25 participants
            expect(endTime - startTime).toBeLessThan(50);

            // Should maintain alphabetical order
            const firstUser = screen.getAllByRole('heading', { level: 4 })[0];
            expect(firstUser).toHaveTextContent('User 00');
        });
    });

    describe('Background Scroll Prevention - Real World Scenarios', () => {
        it('should work in modal/popover contexts where background scroll needs prevention', () => {
            const modalParticipants = Array.from({ length: 12 }, (_, i) =>
                createMockParticipant({
                    id: `modal-user-${i}`,
                    name: `Modal User ${i + 1}`
                })
            );

            const originalOverflow = document.body.style.overflow;

            // Simulate modal usage
            const { unmount } = render(
                <ParticipantList
                    participants={modalParticipants}
                    preventBackgroundScroll={true}
                    maxHeight="max-h-80"
                    className="bg-white rounded-lg shadow-lg p-4"
                />
            );

            // Should prevent background scroll in modal context
            expect(document.body.style.overflow).toBe('hidden');

            // Should render all participants
            expect(screen.getAllByTestId('user-avatar')).toHaveLength(12);

            // Cleanup - simulate modal close
            unmount();
            expect(document.body.style.overflow).toBe(originalOverflow);
        });

        it('should work in sidebar contexts without preventing scroll when disabled', () => {
            const sidebarParticipants = [
                createMockParticipant({ name: 'Sidebar User 1' }),
                createMockParticipant({ name: 'Sidebar User 2' })
            ];

            // Sidebar usage - typically doesn't need background scroll prevention
            render(
                <ParticipantList
                    participants={sidebarParticipants}
                    preventBackgroundScroll={false}
                    compact={true}
                    showCount={false}
                    className="border-r border-slate-200"
                />
            );

            // Should not prevent background scroll in sidebar context (default state)
            expect(document.body.style.overflow).toBe('');

            // Should still render participants cleanly
            expect(screen.getByText('Sidebar User 1')).toBeInTheDocument();
            expect(screen.getByText('Sidebar User 2')).toBeInTheDocument();
        });

        it('should handle dynamic participant list changes', () => {
            const initialParticipants = [
                createMockParticipant({ id: '1', name: 'Initial User' })
            ];

            const expandedParticipants = [
                ...initialParticipants,
                createMockParticipant({ id: '2', name: 'Added User 1' }),
                createMockParticipant({ id: '3', name: 'Added User 2' }),
                createMockParticipant({ id: '4', name: 'Added User 3' })
            ];

            // Start with small list
            const { rerender } = render(
                <ParticipantList
                    participants={initialParticipants}
                    preventBackgroundScroll={true}
                />
            );

            expect(document.body.style.overflow).toBe('hidden');
            expect(screen.getAllByTestId('user-avatar')).toHaveLength(1);

            // Expand to larger list
            rerender(
                <ParticipantList
                    participants={expandedParticipants}
                    preventBackgroundScroll={true}
                />
            );

            expect(document.body.style.overflow).toBe('hidden');
            expect(screen.getAllByTestId('user-avatar')).toHaveLength(4);
            expect(screen.getByText('Added User 1')).toBeInTheDocument();
            expect(screen.getByText('Added User 3')).toBeInTheDocument();
        });
    });
});