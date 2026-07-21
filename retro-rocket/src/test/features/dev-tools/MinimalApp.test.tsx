import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MinimalApp from '@/features/dev-tools/MinimalApp';

describe('MinimalApp', () => {
    it('renders the main heading', () => {
        render(<MinimalApp />);
        expect(screen.getByText('🚀 RetroRocket')).toBeInTheDocument();
    });

    it('renders the subtitle', () => {
        render(<MinimalApp />);
        expect(screen.getByText('Retrospectivas modernas para equipos Scrum')).toBeInTheDocument();
    });

    it('renders the content section', () => {
        render(<MinimalApp />);
        expect(screen.getByText('Aplicación funcionando')).toBeInTheDocument();
        expect(screen.getByText('Esta es una versión mínima de RetroRocket con Tailwind CSS funcionando.')).toBeInTheDocument();
    });

    it('has correct CSS classes for layout', () => {
        render(<MinimalApp />);
        const mainContainer = screen.getByText('🚀 RetroRocket').closest('.max-w-4xl');
        expect(mainContainer).toHaveClass('max-w-4xl', 'mx-auto');
    });

    it('renders within a min-height screen container', () => {
        render(<MinimalApp />);
        const rootDiv = screen.getByText('🚀 RetroRocket').closest('.min-h-screen');
        expect(rootDiv).toHaveClass('min-h-screen', 'bg-gray-50', 'p-8');
    });

    it('has a card container with proper styling', () => {
        render(<MinimalApp />);
        const cardContainer = screen.getByText('Aplicación funcionando').closest('.bg-white');
        expect(cardContainer).toHaveClass('bg-white', 'rounded-lg', 'shadow-lg', 'p-6');
    });
});
