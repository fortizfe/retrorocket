import { screen, fireEvent, waitFor } from '@testing-library/react';
import LanguageSelector from './LanguageSelector';
import { render } from '../../test/utils/test-utils';
import { useLanguage } from '../../hooks/useLanguage';

// Mock dependencies
jest.mock('../../hooks/useLanguage');

// Mock createPortal
jest.mock('react-dom', () => ({
    ...jest.requireActual('react-dom'),
    createPortal: (children: React.ReactNode) => children,
}));

describe('LanguageSelector', () => {
    const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>;

    const mockLanguageContext = {
        currentLanguage: 'es',
        changeLanguage: jest.fn(),
        getAvailableLanguages: jest.fn(() => [
            { code: 'es', name: 'Español', flag: '🇪🇸' },
            { code: 'en', name: 'English', flag: '🇺🇸' },
        ]),
        t: jest.fn((key: string) => {
            const translations: Record<string, string> = {
                'header.closeLanguageSelector': 'Cerrar selector de idioma',
            };
            return translations[key] || key;
        }),
    };

    beforeEach(() => {
        mockUseLanguage.mockReturnValue(mockLanguageContext);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should render language selector button', () => {
        render(<LanguageSelector />);

        const button = screen.getByRole('button', { name: /change language/i });
        expect(button).toBeInTheDocument();
        expect(button).toHaveAttribute('title', 'Change language');
    });

    it('should display current language flag and name', () => {
        render(<LanguageSelector />);

        expect(screen.getByText('🇪🇸')).toBeInTheDocument();
        expect(screen.getByText('Español')).toBeInTheDocument();
    });

    it('should show dropdown when button is clicked', async () => {
        render(<LanguageSelector />);

        const button = screen.getByRole('button', { name: /change language/i });
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText('English')).toBeInTheDocument();
            expect(screen.getByText('🇺🇸')).toBeInTheDocument();
        });
    });

    it('should highlight current language in dropdown', async () => {
        render(<LanguageSelector />);

        const button = screen.getByRole('button', { name: /change language/i });
        fireEvent.click(button);

        await waitFor(() => {
            const spanishButton = screen.getByRole('button', { name: /🇪🇸 español/i });
            expect(spanishButton).toHaveClass('text-primary-600');
        });
    });

    it('should change language when option is selected', async () => {
        render(<LanguageSelector />);

        const button = screen.getByRole('button', { name: /change language/i });
        fireEvent.click(button);

        await waitFor(() => {
            const englishButton = screen.getByRole('button', { name: /🇺🇸 english/i });
            fireEvent.click(englishButton);
        });

        expect(mockLanguageContext.changeLanguage).toHaveBeenCalledWith('en');
    });

    it('should close dropdown when language is selected', async () => {
        render(<LanguageSelector />);

        const button = screen.getByRole('button', { name: /change language/i });
        fireEvent.click(button);

        await waitFor(() => {
            const englishButton = screen.getByRole('button', { name: /🇺🇸 english/i });
            fireEvent.click(englishButton);
        });

        await waitFor(() => {
            expect(screen.queryByRole('button', { name: /🇺🇸 english/i })).not.toBeInTheDocument();
        });
    });

    it('should close dropdown when backdrop is clicked', async () => {
        render(<LanguageSelector />);

        const button = screen.getByRole('button', { name: /change language/i });
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText('English')).toBeInTheDocument();
        });

        const backdrop = screen.getByLabelText(/cerrar selector de idioma/i);
        fireEvent.click(backdrop);

        await waitFor(() => {
            expect(screen.queryByRole('button', { name: /🇺🇸 english/i })).not.toBeInTheDocument();
        });
    });

    it('should handle window resize while dropdown is open', async () => {
        render(<LanguageSelector />);

        const button = screen.getByRole('button', { name: /change language/i });
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText('English')).toBeInTheDocument();
        });

        // Trigger window resize
        fireEvent(window, new Event('resize'));

        // Dropdown should still be visible
        expect(screen.getByText('English')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
        render(<LanguageSelector className="custom-class" />);

        const container = screen.getByRole('button', { name: /change language/i }).parentElement;
        expect(container).toHaveClass('custom-class');
    });

    it('should work with different current language', () => {
        const englishContext = {
            ...mockLanguageContext,
            currentLanguage: 'en',
        };
        mockUseLanguage.mockReturnValue(englishContext);

        render(<LanguageSelector />);

        expect(screen.getByText('🇺🇸')).toBeInTheDocument();
        expect(screen.getByText('English')).toBeInTheDocument();
    });

    it('should handle empty available languages gracefully', () => {
        const emptyLanguagesContext = {
            ...mockLanguageContext,
            getAvailableLanguages: jest.fn(() => []),
        };
        mockUseLanguage.mockReturnValue(emptyLanguagesContext);

        render(<LanguageSelector />);

        // Should not crash and should render the button
        const button = screen.getByRole('button', { name: /change language/i });
        expect(button).toBeInTheDocument();
    });

    it('should handle missing current language in available languages', () => {
        const missingLanguageContext = {
            ...mockLanguageContext,
            currentLanguage: 'fr', // Not in available languages
        };
        mockUseLanguage.mockReturnValue(missingLanguageContext);

        render(<LanguageSelector />);

        // Should fallback to first available language
        expect(screen.getByText('🇪🇸')).toBeInTheDocument();
        expect(screen.getByText('Español')).toBeInTheDocument();
    });

    it('should show only icons on small screens', () => {
        render(<LanguageSelector />);

        const flagSpan = screen.getByText('🇪🇸');
        const nameSpan = screen.getByText('Español');

        // Check responsive classes
        expect(flagSpan).toHaveClass('hidden', 'sm:inline');
        expect(nameSpan).toHaveClass('hidden', 'md:inline');
    });
});
