import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Loading from '@/lib/components/ui/Loading';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => (
            <div
                data-animate={props.animate ? JSON.stringify(props.animate) : undefined}
                data-transition={props.transition ? JSON.stringify(props.transition) : undefined}
                {...props}
            >
                {children}
            </div>
        ),
    },
}));

describe('Loading Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic rendering', () => {
        it('should render with default props', () => {
            const { container } = render(<Loading />);

            // Default should be spinner variant with md size
            const mainDiv = container.firstChild as HTMLElement;
            expect(mainDiv).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');

            const spinner = mainDiv.querySelector('[data-animate]');
            expect(spinner).toBeInTheDocument();
            expect(spinner).toHaveClass('border-2', 'border-border-default');
        });

        it('should render without text by default', () => {
            const { container } = render(<Loading />);

            const textElement = container.querySelector('p');
            expect(textElement).not.toBeInTheDocument();
        });
    });

    describe('Spinner variant', () => {
        it('should render spinner variant', () => {
            const { container } = render(<Loading variant="spinner" />);

            const spinner = container.querySelector('[data-animate]') as HTMLElement;
            expect(spinner).toHaveClass('border-2', 'border-border-default');
            expect(spinner).toHaveClass('border-t-action');
            expect(spinner).toHaveClass('rounded-full');
        });

        it('should have rotation animation', () => {
            const { container } = render(<Loading variant="spinner" />);

            const spinner = container.querySelector('[data-animate]');
            expect(spinner).toHaveAttribute('data-animate', JSON.stringify({ rotate: 360 }));
        });

        it('should have linear transition', () => {
            const { container } = render(<Loading variant="spinner" />);

            const spinner = container.querySelector('[data-animate]');
            const expectedTransition = { duration: 1, repeat: null, ease: 'linear' };
            expect(spinner).toHaveAttribute('data-transition', JSON.stringify(expectedTransition));
        });
    });

    describe('Dots variant', () => {
        it('should render dots variant', () => {
            const { container } = render(<Loading variant="dots" />);

            const dotsContainer = container.querySelector('.flex.space-x-1');
            expect(dotsContainer).toBeInTheDocument();
            expect(dotsContainer).toHaveClass('flex', 'space-x-1');
        });

        it('should have three dots', () => {
            const { container } = render(<Loading variant="dots" />);

            const dots = container.querySelectorAll('[data-animate]');
            expect(dots).toHaveLength(3);
        });

        it('should have dots with bounce animation', () => {
            const { container } = render(<Loading variant="dots" />);

            const firstDot = container.querySelector('[data-animate]');
            const expectedAnimate = { y: [0, -8, 0] };
            expect(firstDot).toHaveAttribute('data-animate', JSON.stringify(expectedAnimate));
        });

        it('should have staggered animation delays', () => {
            const { container } = render(<Loading variant="dots" />);

            const dots = container.querySelectorAll('[data-animate]');

            expect(dots[0]).toHaveAttribute('data-transition', expect.stringContaining('"delay":0'));
            expect(dots[1]).toHaveAttribute('data-transition', expect.stringContaining('"delay":0.1'));
            expect(dots[2]).toHaveAttribute('data-transition', expect.stringContaining('"delay":0.2'));
        });

        it('should have correct dot styling', () => {
            const { container } = render(<Loading variant="dots" />);

            const firstDot = container.querySelector('[data-animate]');

            expect(firstDot).toHaveClass('bg-action');
            expect(firstDot).toHaveClass('rounded-full');
        });
    });

    describe('Pulse variant', () => {
        it('should render pulse variant', () => {
            const { container } = render(<Loading variant="pulse" />);

            const pulseElement = container.querySelector('[data-animate]') as HTMLElement;
            expect(pulseElement).toHaveClass('bg-action', 'rounded-full');
        });

        it('should have scale and opacity animation', () => {
            const { container } = render(<Loading variant="pulse" />);

            const pulseElement = container.querySelector('[data-animate]');
            const expectedAnimate = { scale: [1, 1.2, 1], opacity: [1, 0.5, 1] };
            expect(pulseElement).toHaveAttribute('data-animate', JSON.stringify(expectedAnimate));
        });

        it('should have pulse transition', () => {
            const { container } = render(<Loading variant="pulse" />);

            const pulseElement = container.querySelector('[data-animate]');
            const expectedTransition = { duration: 1.5, repeat: null };
            expect(pulseElement).toHaveAttribute('data-transition', JSON.stringify(expectedTransition));
        });
    });

    describe('Size variants', () => {
        describe('Small size (sm)', () => {
            it('should apply sm size classes for spinner', () => {
                const { container } = render(<Loading size="sm" variant="spinner" />);

                const spinner = container.querySelector('[data-animate]');
                expect(spinner).toHaveClass('w-4', 'h-4');
            });

            it('should apply sm size classes for dots', () => {
                const { container } = render(<Loading size="sm" variant="dots" />);

                const firstDot = container.querySelector('[data-animate]');
                expect(firstDot).toHaveClass('w-4', 'h-4');
            });

            it('should apply sm size classes for pulse', () => {
                const { container } = render(<Loading size="sm" variant="pulse" />);

                const pulseElement = container.querySelector('[data-animate]');
                expect(pulseElement).toHaveClass('w-4', 'h-4');
            });
        });

        describe('Medium size (md)', () => {
            it('should apply md size classes for spinner', () => {
                const { container } = render(<Loading size="md" variant="spinner" />);

                const spinner = container.querySelector('[data-animate]');
                expect(spinner).toHaveClass('w-6', 'h-6');
            });

            it('should apply md size classes for dots', () => {
                const { container } = render(<Loading size="md" variant="dots" />);

                const firstDot = container.querySelector('[data-animate]');
                expect(firstDot).toHaveClass('w-6', 'h-6');
            });

            it('should apply md size classes for pulse', () => {
                const { container } = render(<Loading size="md" variant="pulse" />);

                const pulseElement = container.querySelector('[data-animate]');
                expect(pulseElement).toHaveClass('w-6', 'h-6');
            });
        });

        describe('Large size (lg)', () => {
            it('should apply lg size classes for spinner', () => {
                const { container } = render(<Loading size="lg" variant="spinner" />);

                const spinner = container.querySelector('[data-animate]');
                expect(spinner).toHaveClass('w-8', 'h-8');
            });

            it('should apply lg size classes for dots', () => {
                const { container } = render(<Loading size="lg" variant="dots" />);

                const firstDot = container.querySelector('[data-animate]');
                expect(firstDot).toHaveClass('w-8', 'h-8');
            });

            it('should apply lg size classes for pulse', () => {
                const { container } = render(<Loading size="lg" variant="pulse" />);

                const pulseElement = container.querySelector('[data-animate]');
                expect(pulseElement).toHaveClass('w-8', 'h-8');
            });
        });

        describe('Extra large size (xl)', () => {
            it('should apply xl size classes for spinner', () => {
                const { container } = render(<Loading size="xl" variant="spinner" />);

                const spinner = container.querySelector('[data-animate]');
                expect(spinner).toHaveClass('w-12', 'h-12');
            });

            it('should apply xl size classes for dots', () => {
                const { container } = render(<Loading size="xl" variant="dots" />);

                const firstDot = container.querySelector('[data-animate]');
                expect(firstDot).toHaveClass('w-12', 'h-12');
            });

            it('should apply xl size classes for pulse', () => {
                const { container } = render(<Loading size="xl" variant="pulse" />);

                const pulseElement = container.querySelector('[data-animate]');
                expect(pulseElement).toHaveClass('w-12', 'h-12');
            });
        });
    });

    describe('Text display', () => {
        it('should display text when provided', () => {
            render(<Loading text="Loading data..." />);

            expect(screen.getByText('Loading data...')).toBeInTheDocument();
        });

        it('should not display text when not provided', () => {
            const { container } = render(<Loading />);

            const textElement = container.querySelector('p');
            expect(textElement).not.toBeInTheDocument();
        });

        it('should apply correct text classes', () => {
            render(<Loading text="Loading..." />);

            const textElement = screen.getByText('Loading...');
            expect(textElement).toHaveClass('mt-2', 'text-text-secondary');
        });

        it('should apply correct text size for different loading sizes', () => {
            const { rerender } = render(<Loading size="sm" text="Small loading" />);
            expect(screen.getByText('Small loading')).toHaveClass('text-sm');

            rerender(<Loading size="md" text="Medium loading" />);
            expect(screen.getByText('Medium loading')).toHaveClass('text-base');

            rerender(<Loading size="lg" text="Large loading" />);
            expect(screen.getByText('Large loading')).toHaveClass('text-lg');

            rerender(<Loading size="xl" text="XL loading" />);
            expect(screen.getByText('XL loading')).toHaveClass('text-xl');
        });
    });

    describe('Custom className', () => {
        it('should apply custom className to container', () => {
            const { container } = render(<Loading className="custom-loading-class" />);

            const mainDiv = container.firstChild as HTMLElement;
            expect(mainDiv).toHaveClass('custom-loading-class');
        });

        it('should preserve default classes when custom className is provided', () => {
            const { container } = render(<Loading className="custom-class" />);

            const mainDiv = container.firstChild as HTMLElement;
            expect(mainDiv).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center', 'custom-class');
        });
    });

    describe('Props combinations', () => {
        it('should handle all props together for spinner', () => {
            const { container } = render(
                <Loading
                    variant="spinner"
                    size="lg"
                    text="Loading large spinner..."
                    className="my-custom-class"
                />
            );

            const mainDiv = container.firstChild as HTMLElement;
            const spinner = container.querySelector('[data-animate]');
            const text = screen.getByText('Loading large spinner...');

            expect(mainDiv).toHaveClass('my-custom-class');
            expect(spinner).toHaveClass('w-8', 'h-8');
            expect(text).toHaveClass('text-lg');
        });

        it('should handle all props together for dots', () => {
            const { container } = render(
                <Loading
                    variant="dots"
                    size="xl"
                    text="Processing dots..."
                    className="dots-custom-class"
                />
            );

            const mainDiv = container.firstChild as HTMLElement;
            const text = screen.getByText('Processing dots...');
            const firstDot = container.querySelector('[data-animate]');

            expect(mainDiv).toHaveClass('dots-custom-class');
            expect(firstDot).toHaveClass('w-12', 'h-12');
            expect(text).toHaveClass('text-xl');
        });

        it('should handle all props together for pulse', () => {
            const { container } = render(
                <Loading
                    variant="pulse"
                    size="sm"
                    text="Small pulse..."
                    className="pulse-custom-class"
                />
            );

            const mainDiv = container.firstChild as HTMLElement;
            const pulseElement = container.querySelector('[data-animate]');
            const text = screen.getByText('Small pulse...');

            expect(mainDiv).toHaveClass('pulse-custom-class');
            expect(pulseElement).toHaveClass('w-4', 'h-4');
            expect(text).toHaveClass('text-sm');
        });
    });

    describe('Animation properties', () => {
        it('should have correct animation timing for spinner', () => {
            const { container } = render(<Loading variant="spinner" />);

            const spinner = container.querySelector('[data-animate]');
            const transition = JSON.parse(spinner?.getAttribute('data-transition') || '{}');

            expect(transition.duration).toBe(1);
            expect(transition.ease).toBe('linear');
        });

        it('should have correct animation timing for dots', () => {
            const { container } = render(<Loading variant="dots" />);

            const dots = container.querySelectorAll('[data-animate]');
            const firstDotTransition = JSON.parse(dots[0]?.getAttribute('data-transition') || '{}');

            expect(firstDotTransition.duration).toBe(0.6);
            expect(firstDotTransition.delay).toBe(0);
        });

        it('should have correct animation timing for pulse', () => {
            const { container } = render(<Loading variant="pulse" />);

            const pulseElement = container.querySelector('[data-animate]');
            const transition = JSON.parse(pulseElement?.getAttribute('data-transition') || '{}');

            expect(transition.duration).toBe(1.5);
        });
    });

    describe('Container structure', () => {
        it('should have proper container structure for all variants', () => {
            const variants = ['spinner', 'dots', 'pulse'] as const;

            variants.forEach(variant => {
                const { container } = render(<Loading variant={variant} />);
                const mainDiv = container.firstChild as HTMLElement;

                expect(mainDiv).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
            });
        });

        it('should maintain structure with text', () => {
            const { container } = render(<Loading text="Loading..." />);
            const mainDiv = container.firstChild as HTMLElement;

            expect(mainDiv).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
            expect(mainDiv.querySelector('p')).toBeInTheDocument();
        });
    });
});

describe('Loading Component', () => {
    describe('Default behavior', () => {
        it('should render with default props', () => {
            const { container } = render(<Loading />);

            const loadingContainer = container.firstChild;
            expect(loadingContainer).toBeInTheDocument();
            expect(loadingContainer).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
        });

        it('should render spinner variant by default', () => {
            const { container } = render(<Loading />);

            const spinner = container.querySelector('[data-animate]');
            expect(spinner).toHaveClass('border-2');
            expect(spinner).toHaveAttribute('data-animate', JSON.stringify({ rotate: 360 }));
        });

        it('should render medium size by default', () => {
            const { container } = render(<Loading />);

            const element = container.querySelector('[data-animate]');
            expect(element).toHaveClass('w-6', 'h-6');
        });

        it('should not render text by default', () => {
            const { container } = render(<Loading />);

            const textElement = container.querySelector('p');
            expect(textElement).not.toBeInTheDocument();
        });
    });

    describe('Text prop', () => {
        it('should render text when provided', () => {
            render(<Loading text="Loading..." />);

            const text = screen.getByText('Loading...');
            expect(text).toBeInTheDocument();
            expect(text).toHaveClass('mt-2', 'text-text-secondary', 'text-base');
        });

        it('should not render text when not provided', () => {
            const { container } = render(<Loading />);

            const textElement = container.querySelector('p');
            expect(textElement).not.toBeInTheDocument();
        });

        it('should apply correct text size based on size prop', () => {
            render(<Loading size="lg" text="Large loading..." />);

            const text = screen.getByText('Large loading...');
            expect(text).toHaveClass('text-lg');
        });
    });

    describe('Spinner variant', () => {
        it('should render spinner variant', () => {
            const { container } = render(<Loading variant="spinner" />);

            const spinner = container.querySelector('[data-animate]');
            expect(spinner).toHaveClass('border-2', 'border-border-default', 'border-t-action', 'rounded-full');
        });

        it('should have rotation animation', () => {
            const { container } = render(<Loading variant="spinner" />);

            const spinner = container.querySelector('[data-animate]');
            const expectedAnimate = { rotate: 360 };
            expect(spinner).toHaveAttribute('data-animate', JSON.stringify(expectedAnimate));
        });

        it('should have correct spinner transition', () => {
            const { container } = render(<Loading variant="spinner" />);

            const spinner = container.querySelector('[data-animate]');
            const expectedTransition = { duration: 1, repeat: Infinity, ease: 'linear' };
            expect(spinner).toHaveAttribute('data-transition', JSON.stringify(expectedTransition));
        });
    });

    describe('Dots variant', () => {
        it('should render dots variant', () => {
            const { container } = render(<Loading variant="dots" />);

            const dotsContainer = container.querySelector('.flex.space-x-1');
            expect(dotsContainer).toBeInTheDocument();
            expect(dotsContainer).toHaveClass('flex', 'space-x-1');
        });

        it('should have dots with bounce animation', () => {
            const { container } = render(<Loading variant="dots" />);

            const firstDot = container.querySelector('[data-animate]');
            expect(firstDot).toBeInTheDocument();
            const expectedAnimate = { y: [0, -8, 0] };
            expect(firstDot).toHaveAttribute('data-animate', JSON.stringify(expectedAnimate));
        });

        it('should have staggered animation delays', () => {
            const { container } = render(<Loading variant="dots" />);

            const dots = container.querySelectorAll('[data-animate]');

            expect(dots).toHaveLength(3);

            const expectedTransitions = [
                { duration: 0.6, repeat: Infinity, delay: 0 },
                { duration: 0.6, repeat: Infinity, delay: 0.1 },
                { duration: 0.6, repeat: Infinity, delay: 0.2 }
            ];

            dots.forEach((dot, index) => {
                expect(dot).toHaveAttribute('data-transition', JSON.stringify(expectedTransitions[index]));
            });
        });

        it('should have correct dot styling', () => {
            const { container } = render(<Loading variant="dots" />);

            const firstDot = container.querySelector('[data-animate]');

            expect(firstDot).toHaveClass('bg-action', 'rounded-full', 'w-6', 'h-6');
        });
    });

    describe('Pulse variant', () => {
        it('should render pulse variant', () => {
            const { container } = render(<Loading variant="pulse" />);

            const pulseElement = container.querySelector('[data-animate]');
            expect(pulseElement).toHaveClass('bg-action', 'rounded-full');
        });

        it('should have scale and opacity animation', () => {
            const { container } = render(<Loading variant="pulse" />);

            const pulseElement = container.querySelector('[data-animate]');
            const expectedAnimate = { scale: [1, 1.2, 1], opacity: [1, 0.5, 1] };
            expect(pulseElement).toHaveAttribute('data-animate', JSON.stringify(expectedAnimate));
        });

        it('should have pulse transition', () => {
            const { container } = render(<Loading variant="pulse" />);

            const pulseElement = container.querySelector('[data-animate]');
            const expectedTransition = { duration: 1.5, repeat: Infinity };
            expect(pulseElement).toHaveAttribute('data-transition', JSON.stringify(expectedTransition));
        });
    });

    describe('Size variants', () => {
        describe('Small size (sm)', () => {
            it('should apply sm size classes for spinner', () => {
                const { container } = render(<Loading size="sm" variant="spinner" />);

                const spinner = container.querySelector('[data-animate]');
                expect(spinner).toHaveClass('w-4', 'h-4');
            });

            it('should apply sm size classes for dots', () => {
                const { container } = render(<Loading size="sm" variant="dots" />);

                const firstDot = container.querySelector('[data-animate]');
                expect(firstDot).toHaveClass('w-4', 'h-4');
            });

            it('should apply sm size classes for pulse', () => {
                const { container } = render(<Loading size="sm" variant="pulse" />);

                const pulseElement = container.querySelector('[data-animate]');
                expect(pulseElement).toHaveClass('w-4', 'h-4');
            });
        });

        describe('Medium size (md)', () => {
            it('should apply md size classes for spinner', () => {
                const { container } = render(<Loading size="md" variant="spinner" />);

                const spinner = container.querySelector('[data-animate]');
                expect(spinner).toHaveClass('w-6', 'h-6');
            });

            it('should apply md size classes for dots', () => {
                const { container } = render(<Loading size="md" variant="dots" />);

                const firstDot = container.querySelector('[data-animate]');
                expect(firstDot).toHaveClass('w-6', 'h-6');
            });

            it('should apply md size classes for pulse', () => {
                const { container } = render(<Loading size="md" variant="pulse" />);

                const pulseElement = container.querySelector('[data-animate]');
                expect(pulseElement).toHaveClass('w-6', 'h-6');
            });
        });

        describe('Large size (lg)', () => {
            it('should apply lg size classes for spinner', () => {
                const { container } = render(<Loading size="lg" variant="spinner" />);

                const spinner = container.querySelector('[data-animate]');
                expect(spinner).toHaveClass('w-8', 'h-8');
            });

            it('should apply lg size classes for dots', () => {
                const { container } = render(<Loading size="lg" variant="dots" />);

                const firstDot = container.querySelector('[data-animate]');
                expect(firstDot).toHaveClass('w-8', 'h-8');
            });

            it('should apply lg size classes for pulse', () => {
                const { container } = render(<Loading size="lg" variant="pulse" />);

                const pulseElement = container.querySelector('[data-animate]');
                expect(pulseElement).toHaveClass('w-8', 'h-8');
            });
        });

        describe('Extra large size (xl)', () => {
            it('should apply xl size classes for spinner', () => {
                const { container } = render(<Loading size="xl" variant="spinner" />);

                const spinner = container.querySelector('[data-animate]');
                expect(spinner).toHaveClass('w-12', 'h-12');
            });

            it('should apply xl size classes for dots', () => {
                const { container } = render(<Loading size="xl" variant="dots" />);

                const firstDot = container.querySelector('[data-animate]');
                expect(firstDot).toHaveClass('w-12', 'h-12');
            });

            it('should apply xl size classes for pulse', () => {
                const { container } = render(<Loading size="xl" variant="pulse" />);

                const pulseElement = container.querySelector('[data-animate]');
                expect(pulseElement).toHaveClass('w-12', 'h-12');
            });
        });
    });

    describe('Text size mapping', () => {
        it('should apply sm text size for sm loading', () => {
            render(<Loading size="sm" text="Small text" />);

            const text = screen.getByText('Small text');
            expect(text).toHaveClass('text-sm');
        });

        it('should apply md text size for md loading', () => {
            render(<Loading size="md" text="Medium text" />);

            const text = screen.getByText('Medium text');
            expect(text).toHaveClass('text-base');
        });

        it('should apply lg text size for lg loading', () => {
            render(<Loading size="lg" text="Large text" />);

            const text = screen.getByText('Large text');
            expect(text).toHaveClass('text-lg');
        });

        it('should apply xl text size for xl loading', () => {
            render(<Loading size="xl" text="Extra large text" />);

            const text = screen.getByText('Extra large text');
            expect(text).toHaveClass('text-xl');
        });
    });

    describe('Custom className', () => {
        it('should apply custom className to container', () => {
            const { container } = render(<Loading className="custom-loading-class" />);

            const loadingContainer = container.firstChild;
            expect(loadingContainer).toHaveClass('custom-loading-class');
        });

        it('should preserve default classes when custom className is provided', () => {
            const { container } = render(<Loading className="custom-class" />);

            const loadingContainer = container.firstChild;
            expect(loadingContainer).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center', 'custom-class');
        });
    });

    describe('Props combinations', () => {
        it('should handle all props together for spinner', () => {
            const { container } = render(
                <Loading
                    variant="spinner"
                    size="lg"
                    text="Loading large spinner..."
                    className="my-custom-class"
                />
            );

            const loadingContainer = container.firstChild;
            const spinner = container.querySelector('[data-animate]');
            const text = screen.getByText('Loading large spinner...');

            expect(loadingContainer).toHaveClass('my-custom-class');
            expect(spinner).toHaveClass('w-8', 'h-8');
            expect(text).toHaveClass('text-lg');
        });

        it('should handle all props together for dots', () => {
            const { container } = render(
                <Loading
                    variant="dots"
                    size="xl"
                    text="Processing dots..."
                    className="dots-custom-class"
                />
            );

            const loadingContainer = container.firstChild;
            const text = screen.getByText('Processing dots...');
            const firstDot = container.querySelector('[data-animate]');

            expect(loadingContainer).toHaveClass('dots-custom-class');
            expect(firstDot).toHaveClass('w-12', 'h-12');
            expect(text).toHaveClass('text-xl');
        });

        it('should handle all props together for pulse', () => {
            const { container } = render(
                <Loading
                    variant="pulse"
                    size="sm"
                    text="Small pulse..."
                    className="pulse-custom-class"
                />
            );

            const loadingContainer = container.firstChild;
            const pulseElement = container.querySelector('[data-animate]');
            const text = screen.getByText('Small pulse...');

            expect(loadingContainer).toHaveClass('pulse-custom-class');
            expect(pulseElement).toHaveClass('w-4', 'h-4');
            expect(text).toHaveClass('text-sm');
        });
    });

    describe('Accessibility', () => {
        it('should be accessible with screen readers', () => {
            const { container } = render(<Loading variant="spinner" />);

            const loadingContainer = container.firstChild;
            expect(loadingContainer).toBeInTheDocument();
        });

        it('should have proper structure for dots variant', () => {
            const { container } = render(<Loading variant="dots" />);

            const dots = container.querySelectorAll('[data-animate]');
            expect(dots).toHaveLength(3);
        });

        it('should have descriptive text when provided', () => {
            render(<Loading text="Please wait while we load your content" />);

            const text = screen.getByText('Please wait while we load your content');
            expect(text).toBeInTheDocument();
            expect(text).toBeVisible();
        });
    });
});

describe('Loading Component', () => {
    describe('Default behavior', () => {
        it('should render spinner variant by default', () => {
            const { container } = render(<Loading />);

            const spinner = container.querySelector('[data-animate]');
            expect(spinner).toBeInTheDocument();
            expect(spinner).toHaveClass('border-2', 'border-border-default', 'border-t-action', 'rounded-full');
        });

        it('should use medium size by default', () => {
            const { container } = render(<Loading />);

            const spinner = container.querySelector('[data-animate]');
            expect(spinner).toHaveClass('w-6', 'h-6');
        });

        it('should not display text by default', () => {
            render(<Loading />);

            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
        });

        it('should apply default container classes', () => {
            const { container } = render(<Loading />);

            const loadingContainer = container.firstChild as HTMLElement;
            expect(loadingContainer).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
        });
    });

    describe('Spinner variant', () => {
        it('should render spinner variant', () => {
            const { container } = render(<Loading variant="spinner" />);

            const spinner = container.querySelector('[data-animate]');
            expect(spinner).toHaveClass('border-2', 'rounded-full');
        });

        it('should have rotation animation', () => {
            const { container } = render(<Loading variant="spinner" />);

            const spinner = container.querySelector('[data-animate]');
            expect(spinner).toHaveAttribute('data-animate', JSON.stringify({ rotate: 360 }));
        });

        it('should have linear infinite transition', () => {
            const { container } = render(<Loading variant="spinner" />);

            const spinner = container.querySelector('[data-animate]');
            const expectedTransition = { duration: 1, repeat: Infinity, ease: 'linear' };
            expect(spinner).toHaveAttribute('data-transition', JSON.stringify(expectedTransition));
        });
    });

    describe('Dots variant', () => {
        it('should render three dots', () => {
            const { container } = render(<Loading variant="dots" />);

            const dotsContainer = container.querySelector('.flex.space-x-1');
            const dots = dotsContainer?.querySelectorAll('[data-animate]');
            expect(dots).toHaveLength(3);
        });

        it('should have dots with correct spacing', () => {
            const { container } = render(<Loading variant="dots" />);

            const dotsContainer = container.querySelector('.flex.space-x-1');
            expect(dotsContainer).toBeInTheDocument();
            expect(dotsContainer).toHaveClass('flex', 'space-x-1');
        });

        it('should have dots with bounce animation', () => {
            const { container } = render(<Loading variant="dots" />);

            const dotsContainer = container.querySelector('.flex.space-x-1');
            const firstDot = dotsContainer?.querySelector('[data-animate]');

            expect(firstDot).toHaveAttribute('data-animate', JSON.stringify({ y: [0, -8, 0] }));
        });

        it('should have staggered animation delays', () => {
            const { container } = render(<Loading variant="dots" />);

            const dotsContainer = container.querySelector('.flex.space-x-1');
            const dots = dotsContainer?.querySelectorAll('[data-animate]');

            expect(dots).toHaveLength(3);

            // Check staggered delays
            expect(dots![0]).toHaveAttribute('data-transition', JSON.stringify({ duration: 0.6, repeat: Infinity, delay: 0 }));
            expect(dots![1]).toHaveAttribute('data-transition', JSON.stringify({ duration: 0.6, repeat: Infinity, delay: 0.1 }));
            expect(dots![2]).toHaveAttribute('data-transition', JSON.stringify({ duration: 0.6, repeat: Infinity, delay: 0.2 }));
        });

        it('should have correct dot styling', () => {
            const { container } = render(<Loading variant="dots" />);

            const dotsContainer = container.querySelector('.flex.space-x-1');
            const firstDot = dotsContainer?.querySelector('[data-animate]');

            expect(firstDot).toHaveClass('bg-action', 'rounded-full');
        });
    });

    describe('Pulse variant', () => {
        it('should render pulse variant', () => {
            const { container } = render(<Loading variant="pulse" />);

            const pulseElement = container.querySelector('[data-animate]');
            expect(pulseElement).toHaveClass('bg-action', 'rounded-full');
        });

        it('should have scale and opacity animation', () => {
            const { container } = render(<Loading variant="pulse" />);

            const pulseElement = container.querySelector('[data-animate]');
            const expectedAnimate = { scale: [1, 1.2, 1], opacity: [1, 0.5, 1] };
            expect(pulseElement).toHaveAttribute('data-animate', JSON.stringify(expectedAnimate));
        });

        it('should have pulse transition', () => {
            const { container } = render(<Loading variant="pulse" />);

            const pulseElement = container.querySelector('[data-animate]');
            const expectedTransition = { duration: 1.5, repeat: Infinity };
            expect(pulseElement).toHaveAttribute('data-transition', JSON.stringify(expectedTransition));
        });
    });

    describe('Size variants', () => {
        describe('Small size (sm)', () => {
            it('should apply sm size classes for spinner', () => {
                const { container } = render(<Loading size="sm" variant="spinner" />);

                const spinner = container.querySelector('[data-animate]');
                expect(spinner).toHaveClass('w-4', 'h-4');
            });

            it('should apply sm size classes for dots', () => {
                const { container } = render(<Loading size="sm" variant="dots" />);

                const dotsContainer = container.querySelector('.flex.space-x-1');
                const firstDot = dotsContainer?.querySelector('[data-animate]');
                expect(firstDot).toHaveClass('w-4', 'h-4');
            });

            it('should apply sm size classes for pulse', () => {
                const { container } = render(<Loading size="sm" variant="pulse" />);

                const pulseElement = container.querySelector('[data-animate]');
                expect(pulseElement).toHaveClass('w-4', 'h-4');
            });
        });

        describe('Medium size (md)', () => {
            it('should apply md size classes for spinner', () => {
                const { container } = render(<Loading size="md" variant="spinner" />);

                const spinner = container.querySelector('[data-animate]');
                expect(spinner).toHaveClass('w-6', 'h-6');
            });

            it('should apply md size classes for dots', () => {
                const { container } = render(<Loading size="md" variant="dots" />);

                const dotsContainer = container.querySelector('.flex.space-x-1');
                const firstDot = dotsContainer?.querySelector('[data-animate]');
                expect(firstDot).toHaveClass('w-6', 'h-6');
            });

            it('should apply md size classes for pulse', () => {
                const { container } = render(<Loading size="md" variant="pulse" />);

                const pulseElement = container.querySelector('[data-animate]');
                expect(pulseElement).toHaveClass('w-6', 'h-6');
            });
        });

        describe('Large size (lg)', () => {
            it('should apply lg size classes for spinner', () => {
                const { container } = render(<Loading size="lg" variant="spinner" />);

                const spinner = container.querySelector('[data-animate]');
                expect(spinner).toHaveClass('w-8', 'h-8');
            });

            it('should apply lg size classes for dots', () => {
                const { container } = render(<Loading size="lg" variant="dots" />);

                const dotsContainer = container.querySelector('.flex.space-x-1');
                const firstDot = dotsContainer?.querySelector('[data-animate]');
                expect(firstDot).toHaveClass('w-8', 'h-8');
            });

            it('should apply lg size classes for pulse', () => {
                const { container } = render(<Loading size="lg" variant="pulse" />);

                const pulseElement = container.querySelector('[data-animate]');
                expect(pulseElement).toHaveClass('w-8', 'h-8');
            });
        });

        describe('Extra large size (xl)', () => {
            it('should apply xl size classes for spinner', () => {
                const { container } = render(<Loading size="xl" variant="spinner" />);

                const spinner = container.querySelector('[data-animate]');
                expect(spinner).toHaveClass('w-12', 'h-12');
            });

            it('should apply xl size classes for dots', () => {
                const { container } = render(<Loading size="xl" variant="dots" />);

                const dotsContainer = container.querySelector('.flex.space-x-1');
                const firstDot = dotsContainer?.querySelector('[data-animate]');
                expect(firstDot).toHaveClass('w-12', 'h-12');
            });

            it('should apply xl size classes for pulse', () => {
                const { container } = render(<Loading size="xl" variant="pulse" />);

                const pulseElement = container.querySelector('[data-animate]');
                expect(pulseElement).toHaveClass('w-12', 'h-12');
            });
        });
    });

    describe('Text prop', () => {
        it('should display text when provided for spinner', () => {
            render(<Loading variant="spinner" text="Loading data..." />);

            const text = screen.getByText('Loading data...');
            expect(text).toBeInTheDocument();
            expect(text).toHaveClass('mt-2', 'text-text-secondary');
        });

        it('should display text when provided for dots', () => {
            render(<Loading variant="dots" text="Processing..." />);

            const text = screen.getByText('Processing...');
            expect(text).toBeInTheDocument();
            expect(text).toHaveClass('mt-2', 'text-text-secondary');
        });

        it('should display text when provided for pulse', () => {
            render(<Loading variant="pulse" text="Please wait..." />);

            const text = screen.getByText('Please wait...');
            expect(text).toBeInTheDocument();
            expect(text).toHaveClass('mt-2', 'text-text-secondary');
        });

        it('should not display text when not provided', () => {
            render(<Loading variant="spinner" />);

            expect(screen.queryByRole('text')).not.toBeInTheDocument();
        });

        it('should apply text-sm for sm size text', () => {
            render(<Loading size="sm" text="Loading..." />);

            const text = screen.getByText('Loading...');
            expect(text).toHaveClass('text-sm');
        });

        it('should apply text-base for md size text', () => {
            render(<Loading size="md" text="Loading..." />);

            const text = screen.getByText('Loading...');
            expect(text).toHaveClass('text-base');
        });

        it('should apply text-lg for lg size text', () => {
            render(<Loading size="lg" text="Loading..." />);

            const text = screen.getByText('Loading...');
            expect(text).toHaveClass('text-lg');
        });

        it('should apply text-xl for xl size text', () => {
            render(<Loading size="xl" text="Loading..." />);

            const text = screen.getByText('Loading...');
            expect(text).toHaveClass('text-xl');
        });
    });

    describe('Custom className', () => {
        it('should apply custom className to container', () => {
            const { container } = render(<Loading className="custom-loading-class" />);

            const loadingContainer = container.firstChild as HTMLElement;
            expect(loadingContainer).toHaveClass('custom-loading-class');
        });

        it('should preserve default classes when custom className is provided', () => {
            const { container } = render(<Loading className="custom-class" />);

            const loadingContainer = container.firstChild as HTMLElement;
            expect(loadingContainer).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center', 'custom-class');
        });
    });

    describe('Invalid variant handling', () => {
        it('should return null for unknown variant', () => {
            // @ts-expect-error Testing invalid variant
            const { container } = render(<Loading variant="unknown" />);

            expect(container.firstChild).toBeNull();
        });
    });

    describe('Props combinations', () => {
        it('should handle all props together for spinner', () => {
            const { container } = render(
                <Loading
                    variant="spinner"
                    size="lg"
                    text="Loading large spinner..."
                    className="my-custom-class"
                />
            );

            const loadingContainer = container.firstChild as HTMLElement;
            const spinner = container.querySelector('[data-animate]');
            const text = screen.getByText('Loading large spinner...');

            expect(loadingContainer).toHaveClass('my-custom-class');
            expect(spinner).toHaveClass('w-8', 'h-8');
            expect(text).toHaveClass('text-lg');
        });

        it('should handle all props together for dots', () => {
            const { container } = render(
                <Loading
                    variant="dots"
                    size="xl"
                    text="Processing dots..."
                    className="dots-custom-class"
                />
            );

            const loadingContainer = container.firstChild as HTMLElement;
            const text = screen.getByText('Processing dots...');
            const dotsContainer = container.querySelector('.flex.space-x-1');
            const firstDot = dotsContainer?.querySelector('[data-animate]');

            expect(loadingContainer).toHaveClass('dots-custom-class');
            expect(text).toHaveClass('text-xl');
            expect(firstDot).toHaveClass('w-12', 'h-12');
        });

        it('should handle all props together for pulse', () => {
            const { container } = render(
                <Loading
                    variant="pulse"
                    size="sm"
                    text="Small pulse..."
                    className="pulse-custom-class"
                />
            );

            const loadingContainer = container.firstChild as HTMLElement;
            const pulseElement = container.querySelector('[data-animate]');
            const text = screen.getByText('Small pulse...');

            expect(loadingContainer).toHaveClass('pulse-custom-class');
            expect(pulseElement).toHaveClass('w-4', 'h-4');
            expect(text).toHaveClass('text-sm');
        });
    });

    describe('Accessibility', () => {
        it('should have proper role for spinner element', () => {
            const { container } = render(<Loading variant="spinner" />);

            const spinner = container.querySelector('[data-animate]');
            expect(spinner).toBeInTheDocument();
        });

        it('should have proper role for dots elements', () => {
            const { container } = render(<Loading variant="dots" />);

            const dotsContainer = container.querySelector('.flex.space-x-1');
            const dots = dotsContainer?.querySelectorAll('[data-animate]');
            expect(dots).toHaveLength(3);
        });

        it('should have proper role for pulse element', () => {
            const { container } = render(<Loading variant="pulse" />);

            const pulseElement = container.querySelector('[data-animate]');
            expect(pulseElement).toBeInTheDocument();
        });

        it('should have accessible text content', () => {
            render(<Loading text="Loading application data" />);

            const text = screen.getByText('Loading application data');
            expect(text).toBeInTheDocument();
            expect(text.tagName).toBe('P');
        });
    });
});
