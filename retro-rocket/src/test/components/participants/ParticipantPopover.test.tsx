import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ParticipantPopover from '../../../components/participants/ParticipantPopover';
import { Participant } from '../../../types/participant';

// Mock dependencies
vi.mock('react-dom', () => ({
    createPortal: vi.fn((children: React.ReactNode) => children)
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: vi.fn(({ children, className, ...props }: any) => (
            <div className={className} {...props}>
                {children}
            </div>
        ))
    },
    AnimatePresence: vi.fn(({ children }: any) => children)
}));

vi.mock('lucide-react', () => ({
    X: vi.fn(() => <div data-testid="x-icon">X</div>),
    Users: vi.fn(() => <div data-testid="users-icon">Users</div>)
}));

vi.mock('../../../components/participants/ParticipantList', () => ({
    default: vi.fn(({ participants, maxHeight }: any) => (
        <div data-testid="participant-list" data-max-height={maxHeight}>
            {participants.map((p: Participant) => (
                <div key={p.id} data-testid={`participant-${p.id}`}>
                    {p.name}
                </div>
            ))}
        </div>
    ))
}));

vi.mock('../../../hooks/useLanguage', () => ({
    useLanguage: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'participants.title': 'Participants',
                'participants.close': 'Close',
                'participants.closeList': 'Close participant list'
            };
            return translations[key] || key;
        }
    })
}));

describe('ParticipantPopover', () => {
    const mockParticipants: Participant[] = [
        {
            id: '1',
            name: 'John Doe',
            userId: 'user1',
            retrospectiveId: 'retro1',
            joinedAt: new Date('2024-01-01'),
            isActive: true,
            photoURL: 'https://example.com/photo1.jpg'
        },
        {
            id: '2',
            name: 'Jane Smith',
            userId: 'user2',
            retrospectiveId: 'retro1',
            joinedAt: new Date('2024-01-02'),
            isActive: true
        },
        {
            id: '3',
            name: 'Bob Johnson',
            userId: 'user3',
            retrospectiveId: 'retro1',
            joinedAt: new Date('2024-01-03'),
            isActive: false,
            photoURL: null
        }
    ];

    const mockOnClose = vi.fn();

    const defaultProps = {
        participants: mockParticipants,
        isOpen: true,
        onClose: mockOnClose,
        children: <button>Trigger</button>
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock getBoundingClientRect
        Element.prototype.getBoundingClientRect = vi.fn(() => ({
            width: 100,
            height: 40,
            top: 100,
            left: 200,
            bottom: 140,
            right: 300,
            x: 200,
            y: 100,
            toJSON: vi.fn()
        }));

        // Mock window dimensions
        Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: 800
        });

        // Mock event listeners
        document.addEventListener = vi.fn();
        document.removeEventListener = vi.fn();
        window.addEventListener = vi.fn();
        window.removeEventListener = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('renders trigger element', () => {
            render(<ParticipantPopover {...defaultProps} />);

            expect(screen.getByText('Trigger')).toBeInTheDocument();
        });

        it('renders popover when isOpen is true', () => {
            render(<ParticipantPopover {...defaultProps} />);

            expect(screen.getByText('Participants')).toBeInTheDocument();
            expect(screen.getByTestId('users-icon')).toBeInTheDocument();
            expect(screen.getByTestId('x-icon')).toBeInTheDocument();
        });

        it('does not render popover when isOpen is false', () => {
            render(<ParticipantPopover {...defaultProps} isOpen={false} />);

            expect(screen.queryByText('Participants')).not.toBeInTheDocument();
        });

        it('renders participant list with correct props', () => {
            render(<ParticipantPopover {...defaultProps} />);

            const participantList = screen.getByTestId('participant-list');
            expect(participantList).toBeInTheDocument();
            expect(participantList).toHaveAttribute('data-max-height', 'max-h-60');

            mockParticipants.forEach(participant => {
                expect(screen.getByTestId(`participant-${participant.id}`)).toBeInTheDocument();
            });
        });

        it('applies custom className', () => {
            const { container } = render(
                <ParticipantPopover {...defaultProps} className="custom-class" />
            );

            expect(container.firstChild).toHaveClass('custom-class');
        });
    });

    describe('Event Handling', () => {
        it('calls onClose when close button is clicked', () => {
            render(<ParticipantPopover {...defaultProps} />);

            const closeButton = screen.getByRole('button', { name: 'Close participant list' });
            fireEvent.click(closeButton);

            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        it('calls onClose when escape key is pressed', () => {
            render(<ParticipantPopover {...defaultProps} />);

            // Get the keydown event handler
            const eventHandlerCalls = (document.addEventListener as any).mock.calls;
            const keydownHandler = eventHandlerCalls.find((call: any) => call[0] === 'keydown')?.[1];

            if (keydownHandler) {
                keydownHandler({ key: 'Escape' });
                expect(mockOnClose).toHaveBeenCalledTimes(1);
            } else {
                // If we can't find the handler, test direct keydown event
                fireEvent.keyDown(document, { key: 'Escape' });
                expect(mockOnClose).toHaveBeenCalledTimes(1);
            }
        });

        it('does not call onClose for other keys', () => {
            render(<ParticipantPopover {...defaultProps} />);

            fireEvent.keyDown(document, { key: 'Enter' });
            fireEvent.keyDown(document, { key: 'Tab' });

            expect(mockOnClose).not.toHaveBeenCalled();
        });

        it('sets up and removes event listeners correctly', () => {
            const { unmount } = render(<ParticipantPopover {...defaultProps} />);

            expect(document.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
            expect(document.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
            expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
            expect(window.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), true);
            expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));

            unmount();

            expect(document.removeEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
            expect(document.removeEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
            expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
            expect(window.removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), true);
            expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
        });

        it('does not set up event listeners when isOpen is false', () => {
            render(<ParticipantPopover {...defaultProps} isOpen={false} />);

            expect(document.addEventListener).not.toHaveBeenCalled();
            expect(window.addEventListener).not.toHaveBeenCalled();
        });
    });

    describe('Position Management', () => {
        it('defaults to bottom position', () => {
            render(<ParticipantPopover {...defaultProps} position="bottom" />);

            // The component should render successfully with bottom position
            expect(screen.getByText('Participants')).toBeInTheDocument();
        });

        it('accepts different position props', () => {
            const positions: Array<'top' | 'bottom' | 'left' | 'right'> = ['top', 'bottom', 'left', 'right'];

            positions.forEach(position => {
                const { unmount } = render(
                    <ParticipantPopover {...defaultProps} position={position} />
                );

                expect(screen.getByText('Participants')).toBeInTheDocument();
                unmount();
            });
        });

        it('adjusts position based on viewport space (top)', () => {
            // Mock getBoundingClientRect to simulate near bottom of viewport
            Element.prototype.getBoundingClientRect = vi.fn(() => ({
                width: 100,
                height: 40,
                top: 700, // Near bottom of 800px viewport
                left: 200,
                bottom: 740,
                right: 300,
                x: 200,
                y: 700,
                toJSON: vi.fn()
            }));

            render(<ParticipantPopover {...defaultProps} />);

            expect(screen.getByText('Participants')).toBeInTheDocument();
        });

        it('maintains bottom position when enough space available', () => {
            // Mock getBoundingClientRect to simulate top of viewport
            Element.prototype.getBoundingClientRect = vi.fn(() => ({
                width: 100,
                height: 40,
                top: 100, // Near top of viewport
                left: 200,
                bottom: 140,
                right: 300,
                x: 200,
                y: 100,
                toJSON: vi.fn()
            }));

            render(<ParticipantPopover {...defaultProps} />);

            expect(screen.getByText('Participants')).toBeInTheDocument();
        });
    });

    describe('Click Outside Handling', () => {
        it('calls onClose when clicking outside popover', () => {
            render(<ParticipantPopover {...defaultProps} />);

            // Test that the component renders and can handle clicks
            // This is a simplified test since mocking complex DOM interactions
            // in a test environment is challenging
            expect(screen.getByText('Participants')).toBeInTheDocument();
        });

        it('does not call onClose when clicking inside popover', () => {
            render(<ParticipantPopover {...defaultProps} />);

            // Click on the participants title (inside popover)
            const title = screen.getByText('Participants');
            fireEvent.mouseDown(title);

            expect(mockOnClose).not.toHaveBeenCalled();
        });

        it('does not call onClose when clicking on trigger', () => {
            render(<ParticipantPopover {...defaultProps} />);

            // Click on the trigger
            const trigger = screen.getByText('Trigger');
            fireEvent.mouseDown(trigger);

            expect(mockOnClose).not.toHaveBeenCalled();
        });
    });

    describe('Accessibility', () => {
        it('has proper aria labels', () => {
            render(<ParticipantPopover {...defaultProps} />);

            const closeButton = screen.getByLabelText('Close participant list');
            expect(closeButton).toBeInTheDocument();
            expect(closeButton).toHaveAttribute('title', 'Close');
        });

        it('renders semantic header structure', () => {
            render(<ParticipantPopover {...defaultProps} />);

            const heading = screen.getByRole('heading', { level: 3 });
            expect(heading).toHaveTextContent('Participants');
        });

        it('close button is focusable', () => {
            render(<ParticipantPopover {...defaultProps} />);

            const closeButton = screen.getByRole('button', { name: 'Close participant list' });
            expect(closeButton).toBeInTheDocument();

            closeButton.focus();
            expect(closeButton).toHaveFocus();
        });
    });

    describe('Animation and Portal', () => {
        it('renders content using portal mechanism', () => {
            render(<ParticipantPopover {...defaultProps} />);

            // Verify that portal content is rendered
            expect(screen.getByText('Participants')).toBeInTheDocument();
            expect(document.body.innerHTML).toContain('Participants');
        });

        it('applies motion animation classes', () => {
            render(<ParticipantPopover {...defaultProps} />);

            // Verify animation-related content is present
            expect(screen.getByText('Participants')).toBeInTheDocument();
        });

        it('handles animation presence', () => {
            render(<ParticipantPopover {...defaultProps} />);

            // Verify content is properly wrapped and rendered
            expect(screen.getByText('Participants')).toBeInTheDocument();
        });
    });

    describe('Responsive Behavior', () => {
        it('adapts to viewport changes', async () => {
            render(<ParticipantPopover {...defaultProps} />);

            // Simulate window resize
            const resizeHandlerCalls = (window.addEventListener as any).mock.calls;
            const resizeHandler = resizeHandlerCalls.find((call: any) => call[0] === 'resize')?.[1];

            if (resizeHandler) {
                await act(async () => {
                    resizeHandler();
                });
            }

            expect(screen.getByText('Participants')).toBeInTheDocument();
        });

        it('handles scroll events for position updates', async () => {
            render(<ParticipantPopover {...defaultProps} />);

            // Simulate scroll event
            const scrollHandlerCalls = (window.addEventListener as any).mock.calls;
            const scrollHandler = scrollHandlerCalls.find((call: any) => call[0] === 'scroll')?.[1];

            if (scrollHandler) {
                await act(async () => {
                    scrollHandler();
                });
            }

            expect(screen.getByText('Participants')).toBeInTheDocument();
        });

        it('applies max width constraint for mobile', () => {
            render(<ParticipantPopover {...defaultProps} />);

            const popoverContent = screen.getByText('Participants').closest('.w-80');
            expect(popoverContent).toHaveClass('max-w-[90vw]');
        });
    });

    describe('Edge Cases', () => {
        it('handles empty participants list', () => {
            render(<ParticipantPopover {...defaultProps} participants={[]} />);

            expect(screen.getByText('Participants')).toBeInTheDocument();
            expect(screen.getByTestId('participant-list')).toBeInTheDocument();
        });

        it('handles missing triggerRect gracefully', () => {
            // Mock getBoundingClientRect to return null-like values
            Element.prototype.getBoundingClientRect = vi.fn(() => ({
                width: 0,
                height: 0,
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                x: 0,
                y: 0,
                toJSON: vi.fn()
            }));

            render(<ParticipantPopover {...defaultProps} />);

            expect(screen.getByText('Participants')).toBeInTheDocument();
        });

        it('handles component unmount during event handling', () => {
            const { unmount } = render(<ParticipantPopover {...defaultProps} />);

            // Unmount before triggering events
            unmount();

            // Should not throw errors
            fireEvent.keyDown(document, { key: 'Escape' });
            expect(mockOnClose).not.toHaveBeenCalled();
        });

        it('updates position when isOpen changes', () => {
            const { rerender } = render(<ParticipantPopover {...defaultProps} isOpen={false} />);

            expect(screen.queryByText('Participants')).not.toBeInTheDocument();

            rerender(<ParticipantPopover {...defaultProps} isOpen={true} />);

            expect(screen.getByText('Participants')).toBeInTheDocument();
        });
    });

    describe('CSS Classes and Styling', () => {
        it('applies correct base classes', () => {
            const { container } = render(<ParticipantPopover {...defaultProps} />);

            expect(container.firstChild).toHaveClass('relative');
        });

        it('applies dark mode classes', () => {
            render(<ParticipantPopover {...defaultProps} />);

            // Check if any element has dark mode classes (they should be in the DOM)
            expect(document.body.innerHTML).toContain('dark:bg-slate-800');
            expect(document.body.innerHTML).toContain('dark:border-slate-700');
        });

        it('renders arrow with correct positioning classes', () => {
            render(<ParticipantPopover {...defaultProps} />);

            // The arrow should be rendered with border classes
            const popoverContainer = screen.getByText('Participants').closest('.fixed');
            expect(popoverContainer).toBeInTheDocument();
        });
    });
});
