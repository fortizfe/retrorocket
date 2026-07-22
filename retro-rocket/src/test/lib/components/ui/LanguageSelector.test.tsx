import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LanguageSelector from "@/lib/components/ui/LanguageSelector";

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, className, ...props }: any) => (
            <div className={className} {...props}>
                {children}
            </div>
        )
    },
    AnimatePresence: ({ children }: any) => children
}));

// Mock react-dom
vi.mock('react-dom', () => ({
    createPortal: vi.fn((children: any) => children)
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
    Languages: () => <svg data-testid="languages-icon" />
}));

// Mock useLanguage hook
const mockChangeLanguage = vi.fn();
const mockT = vi.fn((key: string) => key);
const mockGetAvailableLanguages = vi.fn(() => [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
]);

const mockUseLanguage = vi.fn(() => ({
    currentLanguage: 'es',
    changeLanguage: mockChangeLanguage,
    getAvailableLanguages: mockGetAvailableLanguages,
    t: mockT
}));

vi.mock('@/test/hooks/useLanguage', () => ({
    useLanguage: mockUseLanguage
}));

describe("LanguageSelector", () => {
    const user = userEvent.setup();

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock getBoundingClientRect
        Element.prototype.getBoundingClientRect = vi.fn(() => ({
            top: 100,
            left: 200,
            bottom: 120,
            right: 300,
            width: 100,
            height: 20,
            x: 200,
            y: 100,
            toJSON: vi.fn()
        }));

        // Mock window dimensions
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            value: 1024
        });
    });

    describe('Basic Rendering', () => {
        it('renders trigger button with default props', () => {
            const { container } = render(<LanguageSelector />);
            const button = container.querySelector('button');
            expect(button).toBeInTheDocument();
        });

        it('displays Languages icon in trigger button', () => {
            render(<LanguageSelector />);
            const icon = document.querySelector('[data-testid="languages-icon"]');
            expect(icon).toBeInTheDocument();
        });

        it('displays current language flag', () => {
            const { container } = render(<LanguageSelector />);
            expect(container.textContent).toContain('🇪🇸');
        });

        it('displays current language name', () => {
            const { container } = render(<LanguageSelector />);
            expect(container.textContent).toContain('Español');
        });

        it('applies custom className when provided', () => {
            const { container } = render(<LanguageSelector className="custom-class" />);
            const wrapper = container.firstChild as HTMLElement;
            expect(wrapper.className).toContain('custom-class');
        });
    });

    describe('Dropdown Functionality', () => {
        it('opens dropdown when trigger button is clicked', async () => {
            const { container } = render(<LanguageSelector />);
            const triggerButton = container.querySelector('button');

            await user.click(triggerButton!);

            await waitFor(() => {
                expect(container.querySelector('[class*="fixed z-50"]')).toBeInTheDocument();
            });
        });

        it('closes dropdown when trigger button is clicked again', async () => {
            const { container } = render(<LanguageSelector />);
            const triggerButton = container.querySelector('button');

            await user.click(triggerButton!);
            await user.click(triggerButton!);

            await waitFor(() => {
                expect(container.querySelector('[class*="fixed z-50"]')).not.toBeInTheDocument();
            });
        });

        it('displays available languages in dropdown', async () => {
            const { container } = render(<LanguageSelector />);

            const triggerButton = container.querySelector('button');
            await user.click(triggerButton!);

            await waitFor(() => {
                const dropdown = container.querySelector('[class*="fixed z-50"]');
                expect(dropdown).toBeInTheDocument();
                expect(dropdown?.textContent).toContain('English');
                expect(dropdown?.textContent).toContain('Español');
            });
        });
    });

    describe('Language Selection', () => {
        it('renders language options correctly', async () => {
            const { container } = render(<LanguageSelector />);

            const triggerButton = container.querySelector('button');
            await user.click(triggerButton!);

            await waitFor(() => {
                const dropdown = container.querySelector('[class*="fixed z-50"]');
                expect(dropdown).toBeInTheDocument();

                // Verify both languages are displayed
                expect(dropdown?.textContent).toContain('Español');
                expect(dropdown?.textContent).toContain('English');

                // Verify current language is highlighted
                const currentLangButton = dropdown?.querySelector('[class*="text-info-fg"]');
                expect(currentLangButton).toBeInTheDocument();
                expect(currentLangButton?.textContent).toContain('Español');
            });
        });
    });
});
