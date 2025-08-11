import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ColumnHeaderMenu from '../../../components/retrospective/ColumnHeaderMenu';
import { GroupingCriteria } from '../../../types/columnGrouping';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>
    },
    AnimatePresence: ({ children }: any) => <div>{children}</div>
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    ChevronDown: ({ className }: any) => <div data-testid="chevron-down" className={className}></div>,
    CheckCircle: ({ className }: any) => <div data-testid="check-circle" className={className}></div>,
    LayoutGrid: ({ className }: any) => <div data-testid="layout-grid" className={className}></div>,
    Users: ({ className }: any) => <div data-testid="users-icon" className={className}></div>,
    Grip: ({ className }: any) => <div data-testid="grip-icon" className={className}></div>,
    Sparkles: ({ className }: any) => <div data-testid="sparkles-icon" className={className}></div>
}));

// Mock GROUPING_OPTIONS
vi.mock('../../../types/columnGrouping', () => ({
    GROUPING_OPTIONS: [
        {
            value: 'none',
            label: 'Sin agrupar',
            description: 'Mostrar tarjetas individuales',
            icon: ({ className }: any) => <div data-testid="none-icon" className={className}></div>
        },
        {
            value: 'user',
            label: 'Por usuario',
            description: 'Agrupar tarjetas por autor',
            icon: ({ className }: any) => <div data-testid="users-icon" className={className}></div>
        },
        {
            value: 'suggestions',
            label: 'Sugerencias',
            description: 'Mostrar grupos sugeridos automáticamente',
            icon: ({ className }: any) => <div data-testid="sparkles-icon" className={className}></div>
        }
    ]
}));

describe('ColumnHeaderMenu', () => {
    const defaultProps = {
        currentGrouping: 'none' as GroupingCriteria,
        onGroupingChange: vi.fn(),
        disabled: false,
        hasCards: true
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        it('should render the menu button when not disabled and has cards', () => {
            render(<ColumnHeaderMenu {...defaultProps} />);

            const button = screen.getByRole('button', { name: /opciones de agrupación/i });
            expect(button).toBeInTheDocument();
            expect(button).toHaveAttribute('aria-expanded', 'false');
            expect(button).toHaveAttribute('aria-haspopup', 'true');
        });

        it('should display the correct icons in the button', () => {
            render(<ColumnHeaderMenu {...defaultProps} />);

            expect(screen.getByTestId('layout-grid')).toBeInTheDocument();
            expect(screen.getByTestId('chevron-down')).toBeInTheDocument();
        });

        it('should apply correct styling based on current grouping', () => {
            const { rerender } = render(<ColumnHeaderMenu {...defaultProps} currentGrouping="none" />);

            const button = screen.getByRole('button');
            expect(button).toHaveClass('text-slate-600', 'dark:text-slate-400');

            rerender(<ColumnHeaderMenu {...defaultProps} currentGrouping="user" />);
            expect(button).toHaveClass('bg-blue-50', 'dark:bg-blue-900/30', 'text-blue-700', 'dark:text-blue-300');
        });

        it('should not render when disabled', () => {
            render(<ColumnHeaderMenu {...defaultProps} disabled={true} />);

            expect(screen.queryByRole('button')).not.toBeInTheDocument();
        });

        it('should not render when hasCards is false', () => {
            render(<ColumnHeaderMenu {...defaultProps} hasCards={false} />);

            expect(screen.queryByRole('button')).not.toBeInTheDocument();
        });
    });

    describe('Menu Interaction', () => {
        it('should open menu when button is clicked', async () => {
            const user = userEvent.setup();
            render(<ColumnHeaderMenu {...defaultProps} />);

            const button = screen.getByRole('button');
            await user.click(button);

            expect(button).toHaveAttribute('aria-expanded', 'true');
            expect(screen.getByText('Sin agrupar')).toBeInTheDocument();
            expect(screen.getByText('Por usuario')).toBeInTheDocument();
            expect(screen.getByText('Sugerencias')).toBeInTheDocument();
        });

        it('should close menu when button is clicked again', async () => {
            const user = userEvent.setup();
            render(<ColumnHeaderMenu {...defaultProps} />);

            const button = screen.getByRole('button');

            // Open menu
            await user.click(button);
            expect(button).toHaveAttribute('aria-expanded', 'true');

            // Close menu
            await user.click(button);
            expect(button).toHaveAttribute('aria-expanded', 'false');
        });

        it('should show chevron rotation when menu is open', async () => {
            const user = userEvent.setup();
            render(<ColumnHeaderMenu {...defaultProps} />);

            const chevron = screen.getByTestId('chevron-down');
            expect(chevron).not.toHaveClass('rotate-180');

            await user.click(screen.getByRole('button'));
            expect(chevron).toHaveClass('rotate-180');
        });

        it('should show button hover state', () => {
            render(<ColumnHeaderMenu {...defaultProps} />);

            const button = screen.getByRole('button');
            expect(button).toHaveClass('hover:bg-slate-100', 'dark:hover:bg-slate-700');
        });
    });

    describe('Menu Options', () => {
        it('should display all grouping options with correct content', async () => {
            const user = userEvent.setup();
            render(<ColumnHeaderMenu {...defaultProps} />);

            await user.click(screen.getByRole('button'));

            // Check each option
            expect(screen.getByText('Sin agrupar')).toBeInTheDocument();
            expect(screen.getByText('Mostrar tarjetas individuales')).toBeInTheDocument();

            expect(screen.getByText('Por usuario')).toBeInTheDocument();
            expect(screen.getByText('Agrupar tarjetas por autor')).toBeInTheDocument();

            expect(screen.getByText('Sugerencias')).toBeInTheDocument();
            expect(screen.getByText('Mostrar grupos sugeridos automáticamente')).toBeInTheDocument();
        });

        it('should show check mark for current grouping option', async () => {
            const user = userEvent.setup();
            render(<ColumnHeaderMenu {...defaultProps} currentGrouping="user" />);

            await user.click(screen.getByRole('button'));

            const checkIcon = screen.getByTestId('check-circle');
            expect(checkIcon).toBeInTheDocument();
        });

        it('should apply correct styling to selected option', async () => {
            const user = userEvent.setup();
            render(<ColumnHeaderMenu {...defaultProps} currentGrouping="user" />);

            await user.click(screen.getByRole('button'));

            const userOption = screen.getByText('Por usuario').closest('button');
            expect(userOption).toHaveClass('text-blue-600', 'dark:text-blue-400', 'bg-blue-50', 'dark:bg-blue-900/20');
        });

        it('should call onGroupingChange when option is selected', async () => {
            const user = userEvent.setup();
            const onGroupingChange = vi.fn();
            render(<ColumnHeaderMenu {...defaultProps} onGroupingChange={onGroupingChange} />);

            await user.click(screen.getByRole('button'));
            await user.click(screen.getByText('Por usuario'));

            expect(onGroupingChange).toHaveBeenCalledWith('user');
        });

        it('should close menu after selecting an option', async () => {
            const user = userEvent.setup();
            render(<ColumnHeaderMenu {...defaultProps} />);

            const button = screen.getByRole('button');
            await user.click(button);
            await user.click(screen.getByText('Por usuario'));

            expect(button).toHaveAttribute('aria-expanded', 'false');
        });

        it('should show icons for each option', async () => {
            const user = userEvent.setup();
            render(<ColumnHeaderMenu {...defaultProps} />);

            await user.click(screen.getByRole('button'));

            // Check for icons in the menu options
            expect(screen.getByTestId('users-icon')).toBeInTheDocument();
            expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
            expect(screen.getAllByTestId('none-icon')).toHaveLength(2); // One in button, one in menu
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA attributes', () => {
            render(<ColumnHeaderMenu {...defaultProps} />);

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('aria-label', 'Opciones de agrupación');
            expect(button).toHaveAttribute('aria-expanded', 'false');
            expect(button).toHaveAttribute('aria-haspopup', 'true');
            expect(button).toHaveAttribute('title', 'Agrupar tarjetas');
        });

        it('should have proper ARIA labels for menu options', async () => {
            const user = userEvent.setup();
            render(<ColumnHeaderMenu {...defaultProps} />);

            await user.click(screen.getByRole('button'));

            const userOption = screen.getByLabelText('Por usuario: Agrupar tarjetas por autor');
            expect(userOption).toBeInTheDocument();

            const noneOption = screen.getByLabelText('Sin agrupar: Mostrar tarjetas individuales');
            expect(noneOption).toBeInTheDocument();
        });

        it('should set aria-expanded correctly when menu state changes', async () => {
            const user = userEvent.setup();
            render(<ColumnHeaderMenu {...defaultProps} />);

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('aria-expanded', 'false');

            await user.click(button);
            expect(button).toHaveAttribute('aria-expanded', 'true');
        });
    });

    describe('Outside Click Handling', () => {
        it('should close menu when clicking outside', async () => {
            render(
                <div>
                    <ColumnHeaderMenu {...defaultProps} />
                    <div data-testid="outside-element">Outside</div>
                </div>
            );

            const button = screen.getByRole('button');
            const outsideElement = screen.getByTestId('outside-element');

            // Open menu
            fireEvent.click(button);
            expect(button).toHaveAttribute('aria-expanded', 'true');

            // Click outside
            fireEvent.mouseDown(outsideElement);
            await waitFor(() => {
                expect(button).toHaveAttribute('aria-expanded', 'false');
            });
        });

        it('should not close menu when clicking inside', async () => {
            const user = userEvent.setup();
            render(<ColumnHeaderMenu {...defaultProps} />);

            const button = screen.getByRole('button');
            await user.click(button);

            // Click on a menu option instead of the container
            const menuOption = screen.getByText('Por usuario');
            fireEvent.mouseDown(menuOption);

            expect(button).toHaveAttribute('aria-expanded', 'true');
        });
    });

    describe('Different Grouping States', () => {
        it('should display correct icon for current grouping in button', () => {
            const { rerender } = render(<ColumnHeaderMenu {...defaultProps} currentGrouping="none" />);
            expect(screen.getByTestId('layout-grid')).toBeInTheDocument();

            rerender(<ColumnHeaderMenu {...defaultProps} currentGrouping="user" />);
            expect(screen.getAllByTestId('users-icon')).toHaveLength(1);

            rerender(<ColumnHeaderMenu {...defaultProps} currentGrouping="suggestions" />);
            expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
        });

        it('should handle unknown grouping criteria gracefully', () => {
            render(<ColumnHeaderMenu {...defaultProps} currentGrouping={'unknown' as GroupingCriteria} />);

            expect(screen.getByRole('button')).toBeInTheDocument();
            expect(screen.getByTestId('layout-grid')).toBeInTheDocument();
        });
    });

    describe('Event Handling', () => {
        it('should handle keyboard interactions', async () => {
            const user = userEvent.setup();
            render(<ColumnHeaderMenu {...defaultProps} />);

            const button = screen.getByRole('button');

            // Should be able to focus and activate with keyboard
            await user.tab();
            expect(button).toHaveFocus();

            await user.keyboard('{Enter}');
            expect(button).toHaveAttribute('aria-expanded', 'true');
        });

        it('should handle rapid menu toggling', async () => {
            const user = userEvent.setup();
            render(<ColumnHeaderMenu {...defaultProps} />);

            const button = screen.getByRole('button');

            // Rapid clicking
            await user.click(button);
            await user.click(button);
            await user.click(button);

            expect(button).toHaveAttribute('aria-expanded', 'true');
        });
    });

    describe('Edge Cases', () => {
        it('should handle missing onGroupingChange prop gracefully', async () => {
            const user = userEvent.setup();
            render(<ColumnHeaderMenu {...defaultProps} onGroupingChange={undefined as any} />);

            await user.click(screen.getByRole('button'));

            // Should not throw error when clicking option
            expect(() => user.click(screen.getByText('Por usuario'))).not.toThrow();
        });

        it('should work with all boolean prop combinations', () => {
            const combinations = [
                { disabled: true, hasCards: true },
                { disabled: false, hasCards: false },
                { disabled: true, hasCards: false },
                { disabled: false, hasCards: true }
            ];

            combinations.forEach((props, index) => {
                const { unmount } = render(<ColumnHeaderMenu {...defaultProps} {...props} />);

                if (props.disabled || !props.hasCards) {
                    expect(screen.queryByRole('button')).not.toBeInTheDocument();
                } else {
                    expect(screen.getByRole('button')).toBeInTheDocument();
                }

                unmount();
            });
        });
    });
});
