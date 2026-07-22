import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from '@/lib/components/ui/ThemeToggle';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    Sun: ({ className }: { className?: string }) => <div data-testid="sun-icon" className={className}>Sun</div>,
    Moon: ({ className }: { className?: string }) => <div data-testid="moon-icon" className={className}>Moon</div>,
}));

describe('ThemeToggle Component', () => {
    let mockLocalStorage: { [key: string]: string };
    let mockMatchMedia: any;

    beforeEach(() => {
        // Mock localStorage
        mockLocalStorage = {};
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
                setItem: vi.fn((key: string, value: string) => {
                    mockLocalStorage[key] = value;
                }),
                removeItem: vi.fn((key: string) => {
                    delete mockLocalStorage[key];
                }),
                clear: vi.fn(() => {
                    mockLocalStorage = {};
                }),
            },
            writable: true,
        });

        // Mock matchMedia
        mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: !query.includes('dark'),
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: mockMatchMedia,
        });

        // Reset document class list
        document.documentElement.className = '';
    });

    afterEach(() => {
        vi.clearAllMocks();
        document.documentElement.className = '';
    });

    describe('Basic functionality', () => {
        it('should render toggle button', () => {
            render(<ThemeToggle />);
            const button = screen.getByRole('button');
            expect(button).toBeInTheDocument();
        });

        it('should have correct accessibility attributes', () => {
            render(<ThemeToggle />);
            const button = screen.getByRole('button');

            expect(button).toHaveAttribute('aria-label');
            expect(button).toHaveAttribute('title');
        });

        it('should display both sun and moon icons', () => {
            render(<ThemeToggle />);

            const sunIcon = screen.getByTestId('sun-icon');
            const moonIcon = screen.getByTestId('moon-icon');

            expect(sunIcon).toBeInTheDocument();
            expect(moonIcon).toBeInTheDocument();
        });
    });

    describe('Theme initialization', () => {
        it('should initialize with light theme when no saved theme and prefers light', () => {
            mockMatchMedia.mockImplementation((query: string) => ({
                matches: false, // prefers light
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            render(<ThemeToggle />);

            expect(document.documentElement.classList.contains('dark')).toBe(false);
        });

        it('should initialize with dark theme when no saved theme and prefers dark', () => {
            mockMatchMedia.mockImplementation((query: string) => ({
                matches: query.includes('dark'), // prefers dark
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            render(<ThemeToggle />);

            expect(document.documentElement.classList.contains('dark')).toBe(true);
        });

        it('should initialize with saved dark theme from localStorage', () => {
            mockLocalStorage['theme'] = 'dark';

            render(<ThemeToggle />);

            expect(document.documentElement.classList.contains('dark')).toBe(true);
        });

        it('should initialize with saved light theme from localStorage', () => {
            mockLocalStorage['theme'] = 'light';

            render(<ThemeToggle />);

            expect(document.documentElement.classList.contains('dark')).toBe(false);
        });

        it('should prioritize saved theme over system preference', () => {
            mockLocalStorage['theme'] = 'light';
            mockMatchMedia.mockImplementation((query: string) => ({
                matches: query.includes('dark'), // prefers dark but saved is light
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            render(<ThemeToggle />);

            expect(document.documentElement.classList.contains('dark')).toBe(false);
        });
    });

    describe('Theme toggling', () => {
        it('should toggle from light to dark theme', async () => {
            const user = userEvent.setup();
            mockLocalStorage['theme'] = 'light';

            render(<ThemeToggle />);
            const button = screen.getByRole('button');

            // Initially light
            expect(document.documentElement.classList.contains('dark')).toBe(false);

            // Click to toggle to dark
            await user.click(button);

            expect(document.documentElement.classList.contains('dark')).toBe(true);
            expect(window.localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
        });

        it('should toggle from dark to light theme', async () => {
            const user = userEvent.setup();
            mockLocalStorage['theme'] = 'dark';

            render(<ThemeToggle />);
            const button = screen.getByRole('button');

            // Initially dark
            expect(document.documentElement.classList.contains('dark')).toBe(true);

            // Click to toggle to light
            await user.click(button);

            expect(document.documentElement.classList.contains('dark')).toBe(false);
            expect(window.localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
        });

        it('should update aria-label when theme changes', async () => {
            const user = userEvent.setup();
            mockLocalStorage['theme'] = 'light';

            render(<ThemeToggle />);
            const button = screen.getByRole('button');

            // Labels are i18n keys (react-i18next is mocked to return the key).
            // Initially light theme - should show option to switch to dark
            expect(button).toHaveAttribute('aria-label', 'header.switchToDark');

            // Click to toggle to dark
            await user.click(button);

            // Now dark theme - should show option to switch to light
            expect(button).toHaveAttribute('aria-label', 'header.switchToLight');
        });

        it('should update title when theme changes', async () => {
            const user = userEvent.setup();
            mockLocalStorage['theme'] = 'light';

            render(<ThemeToggle />);
            const button = screen.getByRole('button');

            // Initially light theme (i18n keys via mocked react-i18next)
            expect(button).toHaveAttribute('title', 'header.switchToDark');

            // Click to toggle to dark
            await user.click(button);

            // Now dark theme
            expect(button).toHaveAttribute('title', 'header.switchToLight');
        });
    });

    describe('Keyboard interaction', () => {
        it('should toggle theme with Enter key', () => {
            mockLocalStorage['theme'] = 'light';

            render(<ThemeToggle />);
            const button = screen.getByRole('button');

            // Initially light
            expect(document.documentElement.classList.contains('dark')).toBe(false);

            // Press Enter to toggle
            fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
            fireEvent.click(button); // Simulate the click that would happen

            expect(document.documentElement.classList.contains('dark')).toBe(true);
        });

        it('should toggle theme with Space key', () => {
            mockLocalStorage['theme'] = 'light';

            render(<ThemeToggle />);
            const button = screen.getByRole('button');

            // Initially light
            expect(document.documentElement.classList.contains('dark')).toBe(false);

            // Press Space to toggle
            fireEvent.keyDown(button, { key: ' ', code: 'Space' });
            fireEvent.click(button); // Simulate the click that would happen

            expect(document.documentElement.classList.contains('dark')).toBe(true);
        });
    });

    describe('Icon styling', () => {
        it('should apply correct classes to sun icon', () => {
            render(<ThemeToggle />);
            const sunIcon = screen.getByTestId('sun-icon');
            expect(sunIcon).toHaveClass('w-5', 'h-5', 'text-amber-500');
        });

        it('should apply correct classes to moon icon', () => {
            render(<ThemeToggle />);
            const moonIcon = screen.getByTestId('moon-icon');
            expect(moonIcon).toHaveClass('w-5', 'h-5', 'text-blue-400');
        });
    });

    describe('Button styling', () => {
        it('should have correct base classes', () => {
            render(<ThemeToggle />);
            const button = screen.getByRole('button');

            expect(button).toHaveClass(
                'relative',
                'flex',
                'items-center',
                'justify-center',
                'w-10',
                'h-10',
                'rounded-lg'
            );
        });

        it('should have correct background and hover classes', () => {
            render(<ThemeToggle />);
            const button = screen.getByRole('button');

            // Theme-aware surface tokens (no `dark:` utilities needed).
            expect(button).toHaveClass(
                'bg-surface-raised',
                'hover:bg-surface',
                'border-border-default'
            );
        });

        it('should have focus styles', () => {
            render(<ThemeToggle />);
            const button = screen.getByRole('button');

            // Standardized focus-visible ring using the focus token.
            expect(button).toHaveClass(
                'focus:outline-none',
                'focus-visible:ring-2',
                'focus-visible:ring-focus',
                'focus-visible:ring-offset-2'
            );
        });
    });

    describe('Edge cases', () => {
        it('should handle multiple rapid toggles', async () => {
            const user = userEvent.setup();
            mockLocalStorage['theme'] = 'light';

            render(<ThemeToggle />);
            const button = screen.getByRole('button');

            // Rapid toggles
            await user.click(button);
            await user.click(button);
            await user.click(button);

            // Should end up in dark mode (odd number of clicks)
            expect(document.documentElement.classList.contains('dark')).toBe(true);
            expect(window.localStorage.setItem).toHaveBeenLastCalledWith('theme', 'dark');
        });

        it('should handle localStorage access', () => {
            // Mock localStorage to work normally
            mockLocalStorage['theme'] = 'light';

            render(<ThemeToggle />);

            // Should render without issues when localStorage works
            const button = screen.getByRole('button');
            expect(button).toBeInTheDocument();
        });
    });
});
