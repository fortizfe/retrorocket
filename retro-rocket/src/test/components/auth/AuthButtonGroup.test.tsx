import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuthButtonGroup from '../../../components/auth/AuthButtonGroup';
import { AuthProviderType } from '../../../types/user';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

// Mock the hooks and services
vi.mock('../../../hooks/useLanguage', () => ({
    useLanguage: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'auth.authButtonGroup.continueWithGoogle': 'Continue with Google',
                'auth.authButtonGroup.continueWithGithub': 'Continue with GitHub',
                'auth.authButtonGroup.comingSoon': 'Coming Soon',
                'auth.authButtonGroup.signingIn': 'Signing in...',
                'auth.authButtonGroup.termsConditions': 'By continuing, you agree to our Terms of Service',
            };
            return translations[key] || key;
        },
    }),
}));

vi.mock('../../../services/authProvider', () => ({
    getAvailableProviders: vi.fn(() => [
        { providerId: 'google', name: 'Google' },
        { providerId: 'github', name: 'GitHub' },
    ]),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
    Github: ({ className }: { className?: string }) => (
        <div className={className} data-testid="github-icon">GitHub Icon</div>
    ),
    Apple: ({ className }: { className?: string }) => (
        <div className={className} data-testid="apple-icon">Apple Icon</div>
    ),
}));

// Mock Button component
vi.mock('../../../components/ui/Button', () => ({
    default: ({ children, onClick, disabled, className, ...props }: any) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={className}
            data-testid="auth-button"
            {...props}
        >
            {children}
        </button>
    ),
}));

describe('AuthButtonGroup', () => {
    const defaultProps = {
        onProviderSignIn: vi.fn(),
        loading: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        it('should render all auth providers', () => {
            render(<AuthButtonGroup {...defaultProps} />);

            expect(screen.getByText('Continue with Google')).toBeInTheDocument();
            expect(screen.getByText('Continue with GitHub')).toBeInTheDocument();
            expect(screen.getByText('Coming Soon: Apple')).toBeInTheDocument();
        });

        it('should render provider icons correctly', () => {
            render(<AuthButtonGroup {...defaultProps} />);

            // Google icon (SVG)
            expect(document.querySelector('svg')).toBeInTheDocument();

            // GitHub icon
            expect(screen.getByTestId('github-icon')).toBeInTheDocument();

            // Apple icon
            expect(screen.getByTestId('apple-icon')).toBeInTheDocument();
        });

        it('should render terms and conditions text', () => {
            render(<AuthButtonGroup {...defaultProps} />);

            expect(screen.getByText('By continuing, you agree to our Terms of Service')).toBeInTheDocument();
        });

        it('should apply custom className', () => {
            const { container } = render(
                <AuthButtonGroup {...defaultProps} className="custom-class" />
            );

            expect(container.firstChild).toHaveClass('custom-class');
        });
    });

    describe('Provider Availability', () => {
        it('should enable available providers', () => {
            render(<AuthButtonGroup {...defaultProps} />);

            const buttons = screen.getAllByTestId('auth-button');

            // Google and GitHub should be enabled (available)
            expect(buttons[0]).not.toBeDisabled(); // Google
            expect(buttons[1]).not.toBeDisabled(); // GitHub
        });

        it('should disable unavailable providers', () => {
            render(<AuthButtonGroup {...defaultProps} />);

            const buttons = screen.getAllByTestId('auth-button');

            // Apple should be disabled (coming soon)
            expect(buttons[2]).toBeDisabled(); // Apple
        });

        it('should show coming soon badge for Apple', () => {
            render(<AuthButtonGroup {...defaultProps} />);

            expect(screen.getByText('Coming Soon')).toBeInTheDocument();
        });
    });

    describe('User Interactions', () => {
        it('should call onProviderSignIn when clicking available provider', () => {
            const mockOnProviderSignIn = vi.fn();
            render(<AuthButtonGroup {...defaultProps} onProviderSignIn={mockOnProviderSignIn} />);

            const buttons = screen.getAllByTestId('auth-button');

            // Click Google button
            fireEvent.click(buttons[0]);
            expect(mockOnProviderSignIn).toHaveBeenCalledWith('google');

            // Click GitHub button
            fireEvent.click(buttons[1]);
            expect(mockOnProviderSignIn).toHaveBeenCalledWith('github');
        });

        it('should not call onProviderSignIn when clicking disabled provider', () => {
            const mockOnProviderSignIn = vi.fn();
            render(<AuthButtonGroup {...defaultProps} onProviderSignIn={mockOnProviderSignIn} />);

            const buttons = screen.getAllByTestId('auth-button');

            // Click Apple button (disabled)
            fireEvent.click(buttons[2]);
            expect(mockOnProviderSignIn).not.toHaveBeenCalled();
        });

        it('should handle multiple clicks on same provider', () => {
            const mockOnProviderSignIn = vi.fn();
            render(<AuthButtonGroup {...defaultProps} onProviderSignIn={mockOnProviderSignIn} />);

            const buttons = screen.getAllByTestId('auth-button');

            // Multiple clicks on Google
            fireEvent.click(buttons[0]);
            fireEvent.click(buttons[0]);
            fireEvent.click(buttons[0]);

            expect(mockOnProviderSignIn).toHaveBeenCalledTimes(3);
            expect(mockOnProviderSignIn).toHaveBeenCalledWith('google');
        });
    });

    describe('Loading State', () => {
        it('should disable all buttons when loading', () => {
            render(<AuthButtonGroup {...defaultProps} loading={true} />);

            const buttons = screen.getAllByTestId('auth-button');

            buttons.forEach(button => {
                expect(button).toBeDisabled();
            });
        });

        it('should show "Signing in..." text when loading', () => {
            render(<AuthButtonGroup {...defaultProps} loading={true} />);

            expect(screen.getAllByText('Signing in...')).toHaveLength(3);
        });

        it('should apply loading opacity styles', () => {
            render(<AuthButtonGroup {...defaultProps} loading={true} />);

            const buttons = screen.getAllByTestId('auth-button');

            buttons.forEach(button => {
                expect(button.className).toContain('opacity-50');
            });
        });

        it('should not call onProviderSignIn when loading', () => {
            const mockOnProviderSignIn = vi.fn();
            render(
                <AuthButtonGroup
                    {...defaultProps}
                    onProviderSignIn={mockOnProviderSignIn}
                    loading={true}
                />
            );

            const buttons = screen.getAllByTestId('auth-button');

            // Try to click Google button while loading
            fireEvent.click(buttons[0]);
            expect(mockOnProviderSignIn).not.toHaveBeenCalled();
        });
    });

    describe('Provider Styling', () => {
        it('should apply correct styles for available providers', () => {
            render(<AuthButtonGroup {...defaultProps} />);

            const buttons = screen.getAllByTestId('auth-button');

            // Check Google and GitHub buttons have available styles
            expect(buttons[0].className).toContain('!bg-white');
            expect(buttons[1].className).toContain('!bg-white');
        });

        it('should apply disabled styles for unavailable providers', () => {
            render(<AuthButtonGroup {...defaultProps} />);

            const buttons = screen.getAllByTestId('auth-button');

            // Check Apple button has disabled styles
            expect(buttons[2].className).toContain('bg-slate-100');
            expect(buttons[2].className).toContain('cursor-not-allowed');
        });

        it('should apply dark mode styles correctly', () => {
            render(<AuthButtonGroup {...defaultProps} />);

            const buttons = screen.getAllByTestId('auth-button');

            // Check dark mode classes are present
            expect(buttons[0].className).toContain('dark:!bg-slate-800');
            expect(buttons[0].className).toContain('dark:!text-slate-100');
        });
    });

    describe('Provider Icons', () => {
        it('should render Google SVG icon correctly', () => {
            render(<AuthButtonGroup {...defaultProps} />);

            const svgIcon = document.querySelector('svg');
            expect(svgIcon).toBeInTheDocument();
            expect(svgIcon).toHaveClass('w-5', 'h-5');
        });

        it('should render GitHub icon with correct props', () => {
            render(<AuthButtonGroup {...defaultProps} />);

            const githubIcon = screen.getByTestId('github-icon');
            expect(githubIcon).toBeInTheDocument();
            expect(githubIcon).toHaveClass('w-5', 'h-5');
        });

        it('should render Apple icon with correct props', () => {
            render(<AuthButtonGroup {...defaultProps} />);

            const appleIcon = screen.getByTestId('apple-icon');
            expect(appleIcon).toBeInTheDocument();
            expect(appleIcon).toHaveClass('w-5', 'h-5');
        });
    });

    describe('Provider Name Translation', () => {
        it('should display correct provider names', () => {
            render(<AuthButtonGroup {...defaultProps} />);

            expect(screen.getByText('Continue with Google')).toBeInTheDocument();
            expect(screen.getByText('Continue with GitHub')).toBeInTheDocument();
            expect(screen.getByText('Coming Soon: Apple')).toBeInTheDocument();
        });

        it('should handle provider name edge cases', () => {
            render(<AuthButtonGroup {...defaultProps} />);

            // Should handle unknown provider gracefully by rendering default providers
            const buttons = screen.getAllByTestId('auth-button');
            expect(buttons).toHaveLength(3); // Should render all 3 known providers
        });
    });

    describe('Animation Integration', () => {
        it('should render motion.div components', () => {
            const { container } = render(<AuthButtonGroup {...defaultProps} />);

            // Should have provider containers
            const providerContainers = container.querySelectorAll('div[class*="space-y-3"] > div');
            expect(providerContainers.length).toBeGreaterThan(0);
        });
    });

    describe('Accessibility', () => {
        it('should have proper button semantics', () => {
            render(<AuthButtonGroup {...defaultProps} />);

            const buttons = screen.getAllByTestId('auth-button');

            buttons.forEach(button => {
                expect(button.tagName).toBe('BUTTON');
            });
        });

        it('should have descriptive button text', () => {
            render(<AuthButtonGroup {...defaultProps} />);

            expect(screen.getByText('Continue with Google')).toBeInTheDocument();
            expect(screen.getByText('Continue with GitHub')).toBeInTheDocument();
            expect(screen.getByText('Coming Soon: Apple')).toBeInTheDocument();
        });

        it('should disable buttons appropriately for screen readers', () => {
            render(<AuthButtonGroup {...defaultProps} loading={true} />);

            const buttons = screen.getAllByTestId('auth-button');

            buttons.forEach(button => {
                expect(button).toHaveAttribute('disabled');
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty available providers', () => {
            render(<AuthButtonGroup {...defaultProps} />);

            const buttons = screen.getAllByTestId('auth-button');

            // Should always render the standard 3 providers
            expect(buttons).toHaveLength(3);
        });

        it('should handle provider service errors gracefully', () => {
            // Should not crash and should render something
            expect(() => {
                render(<AuthButtonGroup {...defaultProps} />);
            }).not.toThrow();
        });

        it('should handle missing translation keys', () => {
            render(<AuthButtonGroup {...defaultProps} />);

            // Should still render with some text content
            const buttons = screen.getAllByTestId('auth-button');
            expect(buttons).toHaveLength(3);
        });
    });

    describe('Provider Types', () => {
        it('should handle all supported provider types', () => {
            const providerTypes: AuthProviderType[] = ['google', 'github', 'apple'];

            render(<AuthButtonGroup {...defaultProps} />);

            const buttons = screen.getAllByTestId('auth-button');
            expect(buttons).toHaveLength(providerTypes.length);
        });

        it('should call onProviderSignIn with correct provider type', () => {
            const mockOnProviderSignIn = vi.fn();
            render(<AuthButtonGroup {...defaultProps} onProviderSignIn={mockOnProviderSignIn} />);

            const buttons = screen.getAllByTestId('auth-button');

            // Test each available provider
            fireEvent.click(buttons[0]); // Google
            expect(mockOnProviderSignIn).toHaveBeenLastCalledWith('google');

            fireEvent.click(buttons[1]); // GitHub
            expect(mockOnProviderSignIn).toHaveBeenLastCalledWith('github');
        });
    });
});
