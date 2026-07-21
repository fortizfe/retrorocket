import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SimpleApp from '@/features/dev-tools/SimpleApp';

describe('SimpleApp', () => {
    it('renders the main heading', () => {
        render(<SimpleApp />);
        expect(screen.getByText('🚀 RetroRocket Simple')).toBeInTheDocument();
    });

    it('renders the description text', () => {
        render(<SimpleApp />);
        expect(screen.getByText('Aplicación funcionando sin dependencias externas')).toBeInTheDocument();
    });

    it('has correct inline styling', () => {
        render(<SimpleApp />);
        const container = screen.getByText('🚀 RetroRocket Simple').closest('div');
        expect(container).toHaveStyle({ padding: '20px' });
    });

    it('renders an h1 element for the title', () => {
        render(<SimpleApp />);
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toHaveTextContent('🚀 RetroRocket Simple');
    });

    it('renders a paragraph element for the description', () => {
        render(<SimpleApp />);
        const paragraph = screen.getByText('Aplicación funcionando sin dependencias externas');
        expect(paragraph.tagName).toBe('P');
    });
});
