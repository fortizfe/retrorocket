import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ResponsiveParticipantDisplay from '@/features/boards/participants/components/ResponsiveParticipantDisplay';
import { Participant } from '@/features/boards/types/participant';

// Mock dependencies
vi.mock('@/features/boards/participants/components/index', () => ({
    CompactAvatarGroup: vi.fn(({ participants, maxVisible, onShowAll, className, size, showCount }: any) => (
        <button
            data-testid="compact-avatar-group"
            data-max-visible={maxVisible}
            data-size={size}
            data-show-count={showCount}
            className={className}
            onClick={onShowAll}
            type="button"
        >
            <span data-testid="participant-count">{participants.length}</span>
            {participants.slice(0, maxVisible).map((p: Participant) => (
                <div key={p.id} data-testid={`avatar-${p.id}`}>
                    {p.name}
                </div>
            ))}
        </button>
    )),
    ParticipantPopover: vi.fn(({ children, participants, isOpen, onClose, position }: any) => (
        <div data-testid="participant-popover" data-is-open={isOpen} data-position={position}>
            {children}
            {isOpen && (
                <div data-testid="popover-content">
                    <button onClick={onClose} data-testid="close-popover">Close</button>
                    <div data-testid="popover-participants">
                        {participants.map((p: Participant) => (
                            <div key={p.id} data-testid={`popover-participant-${p.id}`}>
                                {p.name}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    ))
}));

vi.mock('@/features/boards/participants/hooks/useEnrichedParticipants', () => ({
    useEnrichedParticipants: vi.fn((participants: Participant[]) => ({
        enrichedParticipants: participants.map(p => ({ ...p, photoURL: `https://example.com/${p.id}.jpg` })),
        loading: false
    }))
}));

describe('ResponsiveParticipantDisplay', () => {
    const mockParticipants: Participant[] = [
        {
            id: '1',
            name: 'Alice Johnson',
            userId: 'user1',
            retrospectiveId: 'retro1',
            joinedAt: new Date('2024-01-01'),
            isActive: true,
            photoURL: 'https://example.com/alice.jpg'
        },
        {
            id: '2',
            name: 'Bob Smith',
            userId: 'user2',
            retrospectiveId: 'retro1',
            joinedAt: new Date('2024-01-02'),
            isActive: true
        },
        {
            id: '3',
            name: 'Charlie Brown',
            userId: 'user3',
            retrospectiveId: 'retro1',
            joinedAt: new Date('2024-01-03'),
            isActive: false,
            photoURL: null
        },
        {
            id: '4',
            name: 'Diana Prince',
            userId: 'user4',
            retrospectiveId: 'retro1',
            joinedAt: new Date('2024-01-04'),
            isActive: true,
            photoURL: 'https://example.com/diana.jpg'
        },
        {
            id: '5',
            name: 'Eric Wilson',
            userId: 'user5',
            retrospectiveId: 'retro1',
            joinedAt: new Date('2024-01-05'),
            isActive: true
        },
        {
            id: '6',
            name: 'Fiona Davis',
            userId: 'user6',
            retrospectiveId: 'retro1',
            joinedAt: new Date('2024-01-06'),
            isActive: true
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock window dimensions and event listeners
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1024
        });

        window.addEventListener = vi.fn();
        window.removeEventListener = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('renders component with participants', () => {
            render(<ResponsiveParticipantDisplay participants={mockParticipants} />);

            expect(screen.getByTestId('participant-popover')).toBeInTheDocument();
            expect(screen.getByTestId('compact-avatar-group')).toBeInTheDocument();
        });

        it('does not render when participants list is empty', () => {
            const { container } = render(<ResponsiveParticipantDisplay participants={[]} />);

            expect(container.firstChild).toBeNull();
        });

        it('applies custom className', () => {
            const { container } = render(
                <ResponsiveParticipantDisplay
                    participants={mockParticipants}
                    className="custom-class"
                />
            );

            expect(container.firstChild).toHaveClass('custom-class');
        });

        it('renders ParticipantPopover with correct props', () => {
            render(<ResponsiveParticipantDisplay participants={mockParticipants} />);

            const popover = screen.getByTestId('participant-popover');
            expect(popover).toHaveAttribute('data-is-open', 'false');
            expect(popover).toHaveAttribute('data-position', 'bottom');
        });

        it('renders CompactAvatarGroup with correct props', () => {
            render(<ResponsiveParticipantDisplay participants={mockParticipants} />);

            const avatarGroup = screen.getByTestId('compact-avatar-group');
            expect(avatarGroup).toHaveAttribute('data-size', 'md');
            expect(avatarGroup).toHaveAttribute('data-show-count', 'true');
            expect(avatarGroup).toHaveClass('cursor-pointer');
        });
    });

    describe('Responsive Behavior', () => {
        it('sets maxVisible to 2 for small screens (< 640px)', async () => {
            Object.defineProperty(window, 'innerWidth', {
                value: 480,
                writable: true
            });

            render(<ResponsiveParticipantDisplay participants={mockParticipants} />);

            await waitFor(() => {
                const avatarGroup = screen.getByTestId('compact-avatar-group');
                expect(avatarGroup).toHaveAttribute('data-max-visible', '2');
            });
        });

        it('sets maxVisible to 3 for medium screens (640px - 767px)', async () => {
            Object.defineProperty(window, 'innerWidth', {
                value: 700,
                writable: true
            });

            render(<ResponsiveParticipantDisplay participants={mockParticipants} />);

            await waitFor(() => {
                const avatarGroup = screen.getByTestId('compact-avatar-group');
                expect(avatarGroup).toHaveAttribute('data-max-visible', '3');
            });
        });

        it('sets maxVisible to 4 for large screens (768px - 1023px)', async () => {
            Object.defineProperty(window, 'innerWidth', {
                value: 900,
                writable: true
            });

            render(<ResponsiveParticipantDisplay participants={mockParticipants} />);

            await waitFor(() => {
                const avatarGroup = screen.getByTestId('compact-avatar-group');
                expect(avatarGroup).toHaveAttribute('data-max-visible', '4');
            });
        });

        it('sets maxVisible to 5 for extra large screens (>= 1024px)', async () => {
            Object.defineProperty(window, 'innerWidth', {
                value: 1200,
                writable: true
            });

            render(<ResponsiveParticipantDisplay participants={mockParticipants} />);

            await waitFor(() => {
                const avatarGroup = screen.getByTestId('compact-avatar-group');
                expect(avatarGroup).toHaveAttribute('data-max-visible', '5');
            });
        });

        it('responds to window resize events', async () => {
            const { rerender } = render(<ResponsiveParticipantDisplay participants={mockParticipants} />);

            // Initially large screen (1024px default)
            expect(screen.getByTestId('compact-avatar-group')).toHaveAttribute('data-max-visible', '5');

            // Simulate resize to small screen
            Object.defineProperty(window, 'innerWidth', {
                value: 480,
                writable: true
            });

            // Trigger resize event
            const resizeHandlerCalls = (window.addEventListener as any).mock.calls;
            const resizeHandler = resizeHandlerCalls.find((call: any) => call[0] === 'resize')?.[1];

            if (resizeHandler) {
                await act(async () => {
                    resizeHandler();
                });

                rerender(<ResponsiveParticipantDisplay participants={mockParticipants} />);

                await waitFor(() => {
                    const avatarGroup = screen.getByTestId('compact-avatar-group');
                    expect(avatarGroup).toHaveAttribute('data-max-visible', '2');
                });
            }
        });

        it('sets up and removes resize event listener', () => {
            const { unmount } = render(<ResponsiveParticipantDisplay participants={mockParticipants} />);

            expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));

            unmount();

            expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
        });
    });

    describe('Popover Interaction', () => {
        it('opens popover when onShowAll is triggered', async () => {
            render(<ResponsiveParticipantDisplay participants={mockParticipants} />);

            // Initially popover is closed
            expect(screen.getByTestId('participant-popover')).toHaveAttribute('data-is-open', 'false');

            // Click on avatar group to show all participants
            const avatarGroup = screen.getByTestId('compact-avatar-group');
            fireEvent.click(avatarGroup);

            await waitFor(() => {
                expect(screen.getByTestId('participant-popover')).toHaveAttribute('data-is-open', 'true');
            });
        });

        it('closes popover when onClose is triggered', async () => {
            render(<ResponsiveParticipantDisplay participants={mockParticipants} />);

            // Open popover first
            const avatarGroup = screen.getByTestId('compact-avatar-group');
            fireEvent.click(avatarGroup);

            await waitFor(() => {
                expect(screen.getByTestId('participant-popover')).toHaveAttribute('data-is-open', 'true');
            });

            // Close popover
            const closeButton = screen.getByTestId('close-popover');
            fireEvent.click(closeButton);

            await waitFor(() => {
                expect(screen.getByTestId('participant-popover')).toHaveAttribute('data-is-open', 'false');
            });
        });

        it('shows all participants in popover when opened', async () => {
            render(<ResponsiveParticipantDisplay participants={mockParticipants} />);

            // Open popover
            const avatarGroup = screen.getByTestId('compact-avatar-group');
            fireEvent.click(avatarGroup);

            await waitFor(() => {
                // Check that popover is open
                expect(screen.getByTestId('participant-popover')).toHaveAttribute('data-is-open', 'true');
            });

            // Verify all participants are visible in popover
            const verifyParticipantVisibility = (participant: Participant) => {
                expect(screen.getByTestId(`popover-participant-${participant.id}`)).toBeInTheDocument();
            };

            mockParticipants.forEach(verifyParticipantVisibility);
        });
    });

    describe('Enriched Participants Integration', () => {
        it('renders component when hook returns enriched participants', () => {
            render(<ResponsiveParticipantDisplay participants={mockParticipants} />);

            // Component should render successfully with enriched participants from mock
            expect(screen.getByTestId('compact-avatar-group')).toBeInTheDocument();
            expect(screen.getByTestId('participant-count')).toHaveTextContent(mockParticipants.length.toString());
        });
    });

    describe('Edge Cases', () => {
        it('handles single participant', () => {
            const singleParticipant = [mockParticipants[0]];

            render(<ResponsiveParticipantDisplay participants={singleParticipant} />);

            expect(screen.getByTestId('compact-avatar-group')).toBeInTheDocument();
            expect(screen.getByTestId('participant-count')).toHaveTextContent('1');
        });

        it('handles many participants', () => {
            const manyParticipants = Array.from({ length: 20 }, (_, i) => ({
                id: `participant-${i}`,
                name: `Participant ${i}`,
                userId: `user-${i}`,
                retrospectiveId: 'retro1',
                joinedAt: new Date(),
                isActive: true
            }));

            render(<ResponsiveParticipantDisplay participants={manyParticipants} />);

            expect(screen.getByTestId('compact-avatar-group')).toBeInTheDocument();
            expect(screen.getByTestId('participant-count')).toHaveTextContent('20');
        });

        it('handles participants with mixed properties', () => {
            const mixedParticipants: Participant[] = [
                {
                    id: '1',
                    name: 'Active User',
                    userId: 'user1',
                    retrospectiveId: 'retro1',
                    joinedAt: new Date(),
                    isActive: true,
                    photoURL: 'https://example.com/photo.jpg'
                },
                {
                    id: '2',
                    name: 'Inactive User',
                    userId: 'user2',
                    retrospectiveId: 'retro1',
                    joinedAt: new Date(),
                    isActive: false
                },
                {
                    id: '3',
                    name: 'No Photo User',
                    userId: 'user3',
                    retrospectiveId: 'retro1',
                    joinedAt: new Date(),
                    isActive: true,
                    photoURL: null
                }
            ];

            render(<ResponsiveParticipantDisplay participants={mixedParticipants} />);

            expect(screen.getByTestId('compact-avatar-group')).toBeInTheDocument();
        });

        it('handles component remount with different participants', () => {
            const { rerender } = render(<ResponsiveParticipantDisplay participants={mockParticipants.slice(0, 2)} />);

            expect(screen.getByTestId('participant-count')).toHaveTextContent('2');

            rerender(<ResponsiveParticipantDisplay participants={mockParticipants} />);

            expect(screen.getByTestId('participant-count')).toHaveTextContent('6');
        });
    });

    describe('State Management', () => {
        it('maintains popover state correctly', async () => {
            render(<ResponsiveParticipantDisplay participants={mockParticipants} />);

            // Initially closed
            expect(screen.getByTestId('participant-popover')).toHaveAttribute('data-is-open', 'false');
            expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument();

            // Open popover
            fireEvent.click(screen.getByTestId('compact-avatar-group'));

            await waitFor(() => {
                expect(screen.getByTestId('participant-popover')).toHaveAttribute('data-is-open', 'true');
                expect(screen.getByTestId('popover-content')).toBeInTheDocument();
            });

            // Close popover
            fireEvent.click(screen.getByTestId('close-popover'));

            await waitFor(() => {
                expect(screen.getByTestId('participant-popover')).toHaveAttribute('data-is-open', 'false');
                expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument();
            });
        });

        it('maintains maxVisible state across re-renders', () => {
            const { rerender } = render(<ResponsiveParticipantDisplay participants={mockParticipants.slice(0, 3)} />);

            const initialMaxVisible = screen.getByTestId('compact-avatar-group').getAttribute('data-max-visible');

            rerender(<ResponsiveParticipantDisplay participants={mockParticipants} />);

            expect(screen.getByTestId('compact-avatar-group')).toHaveAttribute('data-max-visible', initialMaxVisible);
        });
    });

    describe('Performance', () => {
        it('does not cause unnecessary re-renders when participants remain the same', () => {
            const { rerender } = render(<ResponsiveParticipantDisplay participants={mockParticipants} />);

            const initialContent = screen.getByTestId('compact-avatar-group').innerHTML;

            rerender(<ResponsiveParticipantDisplay participants={mockParticipants} />);

            expect(screen.getByTestId('compact-avatar-group').innerHTML).toBe(initialContent);
        });

        it('updates when participants change', () => {
            const { rerender } = render(<ResponsiveParticipantDisplay participants={mockParticipants.slice(0, 2)} />);

            expect(screen.getByTestId('participant-count')).toHaveTextContent('2');

            const newParticipants = [...mockParticipants.slice(0, 2), mockParticipants[2]];
            rerender(<ResponsiveParticipantDisplay participants={newParticipants} />);

            expect(screen.getByTestId('participant-count')).toHaveTextContent('3');
        });
    });
});
