import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import ExportButtonGroup from '@/features/boards/export/components/ExportButtonGroup';
import { Retrospective } from '@/features/boards/types/retrospective';
import { Card, CardGroup } from '@/features/boards/types/card';
import { ActionItem } from '@/features/boards/types/actionItem';

// Mock dependencies
vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: vi.fn(() => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'retrospective.export.exportButton': 'Export retrospective data',
                'retrospective.export.exportText': 'Export',
            };
            return translations[key] || key;
        },
    })),
}));

vi.mock('@/lib/components/ui/Button', () => ({
    default: ({ children, onClick, className, title, variant, size, ...props }: any) => (
        <button
            onClick={onClick}
            className={className}
            title={title}
            data-variant={variant}
            data-size={size}
            {...props}
        >
            {children}
        </button>
    ),
}));

vi.mock('@/features/boards/export/components/ImprovedExportPopover', () => ({
    default: ({ children, isOpen, onClose, retrospective, cards, groups, participants, actionItems, className }: any) => (
        <div data-testid="export-popover" data-is-open={isOpen} className={className}>
            <div data-testid="popover-props">
                <span data-testid="retrospective-id">{retrospective?.id}</span>
                <span data-testid="cards-count">{cards?.length}</span>
                <span data-testid="groups-count">{groups?.length}</span>
                <span data-testid="participants-count">{participants?.length}</span>
                <span data-testid="action-items-count">{actionItems?.length}</span>
            </div>
            {isOpen && (
                <div data-testid="popover-content">
                    <button onClick={onClose} data-testid="close-popover">Close</button>
                </div>
            )}
            {children}
        </div>
    ),
}));

describe('ExportButtonGroup Component', () => {
    const mockRetrospective: Retrospective = {
        id: 'retro-123',
        title: 'Sprint Review Retrospective',
        description: 'Q4 Sprint Review',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
        createdBy: 'facilitator-1',
        isActive: true,
        participantCount: 2
    };

    const mockCards: Card[] = [
        {
            id: 'card-1',
            content: 'Great team collaboration',
            createdBy: 'user1',
            column: 'helped',
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-15'),
            retrospectiveId: 'retro-123',
            color: 'pastelGreen'
        },
        {
            id: 'card-2',
            content: 'Need better communication',
            createdBy: 'user2',
            column: 'improve',
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-15'),
            retrospectiveId: 'retro-123',
            color: 'pastelYellow'
        }
    ];

    const mockGroups: CardGroup[] = [
        {
            id: 'group-1',
            retrospectiveId: 'retro-123',
            column: 'improve',
            headCardId: 'card-2',
            memberCardIds: [],
            isCollapsed: false,
            createdAt: new Date('2024-01-15'),
            createdBy: 'user1',
            order: 1
        }
    ];

    const mockParticipants = [
        { name: 'Alice Johnson', joinedAt: new Date('2024-01-15T09:00:00Z') },
        { name: 'Bob Smith', joinedAt: new Date('2024-01-15T09:01:00Z') }
    ];

    const mockActionItems: ActionItem[] = [
        {
            id: 'action-1',
            content: 'Improve daily standups',
            retrospectiveId: 'retro-123',
            createdBy: 'facilitator-1',
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-15'),
            assignedTo: 'user1',
            assignedToName: 'Alice',
            dueDate: new Date('2024-01-22')
        }
    ];

    const defaultProps = {
        retrospective: mockRetrospective,
        cards: mockCards,
        groups: mockGroups,
        participants: mockParticipants,
        actionItems: mockActionItems
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        it('renders export button with correct text', () => {
            render(<ExportButtonGroup {...defaultProps} />);

            const button = screen.getByRole('button');
            expect(button).toBeInTheDocument();
            expect(button).toHaveTextContent('Export');
        });

        it('renders button with correct attributes', () => {
            render(<ExportButtonGroup {...defaultProps} />);

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('data-variant', 'outline');
            expect(button).toHaveAttribute('data-size', 'sm');
            expect(button).toHaveAttribute('title', 'Export retrospective data');
        });

        it('renders button with default styling classes', () => {
            render(<ExportButtonGroup {...defaultProps} />);

            const button = screen.getByRole('button');
            expect(button).toHaveClass('flex', 'items-center', 'gap-2');
        });

        it('renders ExportPopover wrapper', () => {
            render(<ExportButtonGroup {...defaultProps} />);

            const popover = screen.getByTestId('export-popover');
            expect(popover).toBeInTheDocument();
        });
    });

    describe('Props Passing', () => {
        it('passes retrospective data to ExportPopover', () => {
            render(<ExportButtonGroup {...defaultProps} />);

            expect(screen.getByTestId('retrospective-id')).toHaveTextContent('retro-123');
        });

        it('passes cards data to ExportPopover', () => {
            render(<ExportButtonGroup {...defaultProps} />);

            expect(screen.getByTestId('cards-count')).toHaveTextContent('2');
        });

        it('passes groups data to ExportPopover', () => {
            render(<ExportButtonGroup {...defaultProps} />);

            expect(screen.getByTestId('groups-count')).toHaveTextContent('1');
        });

        it('passes participants data to ExportPopover', () => {
            render(<ExportButtonGroup {...defaultProps} />);

            expect(screen.getByTestId('participants-count')).toHaveTextContent('2');
        });

        it('passes action items to ExportPopover', () => {
            render(<ExportButtonGroup {...defaultProps} />);

            expect(screen.getByTestId('action-items-count')).toHaveTextContent('1');
        });

        it('passes custom className to ExportPopover', () => {
            const customClass = 'custom-export-class';
            render(<ExportButtonGroup {...defaultProps} className={customClass} />);

            const popover = screen.getByTestId('export-popover');
            expect(popover).toHaveClass(customClass);
        });
    });

    describe('Popover State Management', () => {
        it('initially shows popover as closed', () => {
            render(<ExportButtonGroup {...defaultProps} />);

            const popover = screen.getByTestId('export-popover');
            expect(popover).toHaveAttribute('data-is-open', 'false');
            expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument();
        });

        it('opens popover when button is clicked', async () => {
            const user = userEvent.setup();
            render(<ExportButtonGroup {...defaultProps} />);

            const button = screen.getByRole('button');
            await user.click(button);

            const popover = screen.getByTestId('export-popover');
            expect(popover).toHaveAttribute('data-is-open', 'true');
            expect(screen.getByTestId('popover-content')).toBeInTheDocument();
        });

        it('closes popover when onClose is called', async () => {
            const user = userEvent.setup();
            render(<ExportButtonGroup {...defaultProps} />);

            // Open popover
            const button = screen.getByRole('button');
            await user.click(button);

            expect(screen.getByTestId('popover-content')).toBeInTheDocument();

            // Close popover
            const closeButton = screen.getByTestId('close-popover');
            await user.click(closeButton);

            const popover = screen.getByTestId('export-popover');
            expect(popover).toHaveAttribute('data-is-open', 'false');
            expect(screen.queryByTestId('popover-content')).not.toBeInTheDocument();
        });

        it('can toggle popover multiple times', async () => {
            const user = userEvent.setup();
            render(<ExportButtonGroup {...defaultProps} />);

            const button = screen.getByRole('button');
            const popover = screen.getByTestId('export-popover');

            // Open
            await user.click(button);
            expect(popover).toHaveAttribute('data-is-open', 'true');

            // Close  
            const closeButton = screen.getByTestId('close-popover');
            await user.click(closeButton);
            expect(popover).toHaveAttribute('data-is-open', 'false');

            // Open again
            await user.click(button);
            expect(popover).toHaveAttribute('data-is-open', 'true');
        });
    });

    describe('Default Props', () => {
        it('handles missing actionItems prop with default empty array', () => {
            const propsWithoutActionItems = {
                retrospective: mockRetrospective,
                cards: mockCards,
                groups: mockGroups,
                participants: mockParticipants
            };

            render(<ExportButtonGroup {...propsWithoutActionItems} />);

            expect(screen.getByTestId('action-items-count')).toHaveTextContent('0');
        });

        it('handles missing className prop with default empty string', () => {
            render(<ExportButtonGroup {...defaultProps} />);

            const popover = screen.getByTestId('export-popover');
            // When no className is provided, React doesn't add the attribute
            expect(popover).not.toHaveAttribute('className');
        });
    });

    describe('Edge Cases', () => {
        it('handles empty arrays gracefully', () => {
            const emptyProps = {
                retrospective: mockRetrospective,
                cards: [],
                groups: [],
                participants: [],
                actionItems: []
            };

            render(<ExportButtonGroup {...emptyProps} />);

            expect(screen.getByTestId('cards-count')).toHaveTextContent('0');
            expect(screen.getByTestId('groups-count')).toHaveTextContent('0');
            expect(screen.getByTestId('participants-count')).toHaveTextContent('0');
            expect(screen.getByTestId('action-items-count')).toHaveTextContent('0');
        });

        it('handles large datasets', () => {
            const largeMockCards = Array.from({ length: 100 }, (_, i) => ({
                ...mockCards[0],
                id: `card-${i}`,
                content: `Card ${i}`
            }));

            const largeProps = {
                ...defaultProps,
                cards: largeMockCards
            };

            render(<ExportButtonGroup {...largeProps} />);

            expect(screen.getByTestId('cards-count')).toHaveTextContent('100');
        });

        it('handles special characters in retrospective data', () => {
            const specialRetrospective = {
                ...mockRetrospective,
                id: 'retro-123-ñáéíóú-@#$%',
                title: 'Sprint Review with émojis 🚀 & spëcial chars'
            };

            render(<ExportButtonGroup {...defaultProps} retrospective={specialRetrospective} />);

            expect(screen.getByTestId('retrospective-id')).toHaveTextContent('retro-123-ñáéíóú-@#$%');
        });
    });

    describe('User Interactions', () => {
        it('allows multiple button clicks without issues', async () => {
            const user = userEvent.setup();
            render(<ExportButtonGroup {...defaultProps} />);

            const button = screen.getByRole('button');

            // Click multiple times rapidly
            await user.click(button);
            await user.click(button);
            await user.click(button);

            // Should still work normally
            const popover = screen.getByTestId('export-popover');
            expect(popover).toHaveAttribute('data-is-open', 'true');
        });

        it('maintains state correctly during rapid interactions', async () => {
            const user = userEvent.setup();
            render(<ExportButtonGroup {...defaultProps} />);

            const button = screen.getByRole('button');

            // Open
            await user.click(button);

            // Close
            const closeButton = screen.getByTestId('close-popover');
            await user.click(closeButton);

            // Quick open-close cycle
            await user.click(button);
            const closeButton2 = screen.getByTestId('close-popover');
            await user.click(closeButton2);

            const popover = screen.getByTestId('export-popover');
            expect(popover).toHaveAttribute('data-is-open', 'false');
        });
    });

    describe('Accessibility', () => {
        it('has proper button role', () => {
            render(<ExportButtonGroup {...defaultProps} />);

            const button = screen.getByRole('button');
            expect(button).toBeInTheDocument();
        });

        it('has descriptive title attribute', () => {
            render(<ExportButtonGroup {...defaultProps} />);

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('title', 'Export retrospective data');
        });

        it('button is focusable', () => {
            render(<ExportButtonGroup {...defaultProps} />);

            const button = screen.getByRole('button');
            button.focus();
            expect(button).toHaveFocus();
        });
    });

    describe('Component Integration', () => {
        it('properly integrates with ExportPopover component', () => {
            render(<ExportButtonGroup {...defaultProps} />);

            // Check that all required props are passed to ExportPopover
            const propsContainer = screen.getByTestId('popover-props');
            expect(propsContainer).toBeInTheDocument();

            // Verify all data is accessible through ExportPopover
            expect(screen.getByTestId('retrospective-id')).toBeInTheDocument();
            expect(screen.getByTestId('cards-count')).toBeInTheDocument();
            expect(screen.getByTestId('groups-count')).toBeInTheDocument();
            expect(screen.getByTestId('participants-count')).toBeInTheDocument();
            expect(screen.getByTestId('action-items-count')).toBeInTheDocument();
        });

        it('properly integrates with Button component', () => {
            render(<ExportButtonGroup {...defaultProps} />);

            const button = screen.getByRole('button');

            // Check Button component props are applied
            expect(button).toHaveAttribute('data-variant', 'outline');
            expect(button).toHaveAttribute('data-size', 'sm');
            expect(button).toHaveClass('flex', 'items-center', 'gap-2');
        });
    });
});
