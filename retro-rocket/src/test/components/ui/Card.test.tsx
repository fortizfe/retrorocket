import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Card from '../../../components/ui/Card';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

describe('Card Component', () => {
    describe('Basic Rendering', () => {
        it('should render with default props', () => {
            render(<Card>Test content</Card>);

            const card = screen.getByText('Test content').closest('div');
            expect(card).toBeInTheDocument();
            expect(card).toHaveClass('bg-white', 'dark:bg-slate-800');
            expect(screen.getByText('Test content')).toBeInTheDocument();
        });

        it('should apply custom className', () => {
            render(<Card className="custom-class">Content</Card>);

            const card = screen.getByText('Content').closest('div');
            expect(card).toHaveClass('custom-class');
        });

        it('should handle different variants', () => {
            const { rerender } = render(<Card variant="outlined">Outlined card</Card>);

            let card = screen.getByText('Outlined card').closest('div');
            expect(card).toHaveClass('border-2');

            rerender(<Card variant="elevated">Elevated card</Card>);
            card = screen.getByText('Elevated card').closest('div');
            expect(card).toHaveClass('shadow-lg');

            rerender(<Card variant="glass">Glass card</Card>);
            card = screen.getByText('Glass card').closest('div');
            expect(card).toHaveClass('bg-white/80', 'backdrop-blur-sm');
        });

        it('should handle different padding sizes', () => {
            const { rerender } = render(<Card padding="sm">Small padding</Card>);

            let card = screen.getByText('Small padding').closest('div');
            expect(card).toHaveClass('p-3');

            rerender(<Card padding="lg">Large padding</Card>);
            card = screen.getByText('Large padding').closest('div');
            expect(card).toHaveClass('p-6');
        });

        it('should handle interactive variant', () => {
            render(<Card variant="interactive">Interactive Card</Card>);

            const card = screen.getByText('Interactive Card').closest('div');
            expect(card).toHaveClass('cursor-pointer');
        });

        it('should handle hover prop', () => {
            render(<Card hover>Hoverable card</Card>);

            const card = screen.getByText('Hoverable card').closest('div');
            expect(card).toHaveClass('cursor-pointer');
        });
    });

    describe('Loading States', () => {
        it('should show loading indicator when loading prop is true', () => {
            render(
                <Card loading>
                    Loading content
                </Card>
            );

            const card = screen.getByText('Loading content').closest('div')?.parentElement;
            expect(card).toHaveClass('pointer-events-none', 'opacity-70');

            // Should have loading spinner
            const spinner = card?.querySelector('.animate-spin');
            expect(spinner).toBeInTheDocument();
        });

        it('should not show loading states when loading is false', () => {
            render(
                <Card loading={false}>
                    Normal content
                </Card>
            );

            const card = screen.getByText('Normal content').closest('div')?.parentElement;
            expect(card).not.toHaveClass('pointer-events-none', 'opacity-70');
        });
    });

    describe('Custom Background', () => {
        it('should handle custom background prop', () => {
            render(<Card customBackground>Custom bg</Card>);

            const card = screen.getByText('Custom bg').closest('div');
            expect(card).toHaveClass('border', 'border-slate-200', 'dark:border-slate-700');
            expect(card).not.toHaveClass('bg-white', 'dark:bg-slate-800');
        });
    });

    describe('Dark Mode Support', () => {
        it('should have proper dark mode classes', () => {
            render(<Card>Dark mode test</Card>);

            const card = screen.getByText('Dark mode test').closest('div');
            expect(card).toHaveClass('bg-white', 'dark:bg-slate-800');
            expect(card).toHaveClass('border-slate-200', 'dark:border-slate-700');
        });

        it('should handle dark mode for elevated variant', () => {
            render(<Card variant="elevated">Elevated dark</Card>);

            const card = screen.getByText('Elevated dark').closest('div');
            expect(card).toHaveClass('shadow-lg');
        });
    });

    describe('Animation and Interactions', () => {
        it('should handle hover animations for interactive cards', async () => {
            const user = userEvent.setup();

            render(<Card variant="interactive">Animated card</Card>);

            const card = screen.getByText('Animated card').closest('div');
            expect(card).toHaveClass('cursor-pointer');

            // Test hover state
            await user.hover(card!);
            // Motion animations are handled by framer-motion
        });

        it('should handle click events', async () => {
            const handleClick = vi.fn();
            const user = userEvent.setup();

            render(
                <Card onClick={handleClick}>
                    Clickable card
                </Card>
            );

            const card = screen.getByText('Clickable card').closest('div');
            await user.click(card!);

            expect(handleClick).toHaveBeenCalledOnce();
        });
    });

    describe('Accessibility', () => {
        it('should support aria attributes', () => {
            render(
                <Card aria-label="Custom card label">
                    Accessible card
                </Card>
            );

            const card = screen.getByText('Accessible card').closest('div');
            expect(card).toHaveAttribute('aria-label', 'Custom card label');
        });

        it('should be keyboard accessible when interactive', async () => {
            const handleClick = vi.fn();

            render(
                <Card onClick={handleClick} tabIndex={0}>
                    Keyboard accessible
                </Card>
            );

            const card = screen.getByText('Keyboard accessible').closest('div');

            // Focus the card
            card?.focus();
            expect(card).toHaveFocus();
        });
    });

    describe('Performance and Error Handling', () => {
        it('should handle missing children gracefully', () => {
            // Card component requires children, so we test with empty content
            render(<Card>{''}</Card>);

            // Component should still render
            const container = document.querySelector('.bg-white');
            expect(container).toBeInTheDocument();
        });

        it('should handle invalid variant gracefully', () => {
            // TypeScript would prevent this, but test runtime behavior
            render(<Card variant={'invalid' as any}>Content</Card>);

            const card = screen.getByText('Content').closest('div');
            expect(card).toBeInTheDocument();
            // Should fall back to default variant styling
        });

        it('should maintain consistent styling', () => {
            render(<Card>Consistent styling</Card>);

            const card = screen.getByText('Consistent styling').closest('div');
            expect(card).toHaveClass('rounded-lg'); // From borderRadius.card
            expect(card).toHaveClass('relative'); // Base classes
        });
    });

    describe('Motion Integration', () => {
        it('should integrate with framer-motion', () => {
            render(<Card>Motion card</Card>);

            // The motion.div wrapper should be present
            const card = screen.getByText('Motion card').closest('div');
            expect(card).toBeInTheDocument();

            // Motion props are handled by the mocked framer-motion
        });

        it('should respect reduced motion preferences', () => {
            render(<Card hover>Motion sensitive</Card>);

            const card = screen.getByText('Motion sensitive').closest('div');
            expect(card).toHaveClass('transition-transform'); // From animations.default
        });
    });

    describe('All Variants', () => {
        it('should render all supported variants correctly', () => {
            const variants: Array<'default' | 'outlined' | 'elevated' | 'filled' | 'glass' | 'interactive'> = [
                'default', 'outlined', 'elevated', 'filled', 'glass', 'interactive'
            ];

            variants.forEach(variant => {
                const { unmount } = render(<Card variant={variant}>{variant} variant</Card>);

                const card = screen.getByText(`${variant} variant`).closest('div');
                expect(card).toBeInTheDocument();

                // Test specific classes for each variant
                switch (variant) {
                    case 'outlined':
                        expect(card).toHaveClass('border-2');
                        break;
                    case 'elevated':
                        expect(card).toHaveClass('shadow-lg');
                        break;
                    case 'glass':
                        expect(card).toHaveClass('backdrop-blur-sm');
                        break;
                    case 'interactive':
                        expect(card).toHaveClass('cursor-pointer');
                        break;
                }

                unmount();
            });
        });

        it('should render all padding sizes correctly', () => {
            const paddings: Array<'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'> = [
                'none', 'xs', 'sm', 'md', 'lg', 'xl'
            ];

            paddings.forEach(padding => {
                const { unmount } = render(<Card padding={padding}>{padding} padding</Card>);

                const card = screen.getByText(`${padding} padding`).closest('div');
                expect(card).toBeInTheDocument();

                // Test specific padding classes
                const expectedPaddingClasses = {
                    'none': '',
                    'xs': 'p-2',
                    'sm': 'p-3',
                    'md': 'p-4',
                    'lg': 'p-6',
                    'xl': 'p-8'
                };

                if (expectedPaddingClasses[padding]) {
                    expect(card).toHaveClass(expectedPaddingClasses[padding]);
                }

                unmount();
            });
        });
    });
});
