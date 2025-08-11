import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TestApp from '../../TestApp';

// Mock alert function
vi.stubGlobal('alert', vi.fn());

describe('TestApp', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders without crashing', () => {
        render(<TestApp />);

        expect(screen.getByText('🚀 RetroRocket Test')).toBeInTheDocument();
    });

    it('displays the main heading', () => {
        render(<TestApp />);

        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toHaveTextContent('🚀 RetroRocket Test');
        expect(heading).toHaveStyle({ color: 'rgb(0, 128, 0)' }); // green is rgb(0, 128, 0)
    });

    it('displays status information', () => {
        render(<TestApp />);

        expect(screen.getByText('Si ves este mensaje, React está funcionando correctamente!')).toBeInTheDocument();
        expect(screen.getByText('Estado de la aplicación:')).toBeInTheDocument();
        expect(screen.getByText('✅ React funcionando')).toBeInTheDocument();
        expect(screen.getByText('✅ TypeScript compilando')).toBeInTheDocument();
        expect(screen.getByText('✅ Vite sirviendo archivos')).toBeInTheDocument();
    });

    it('has a functional test button', () => {
        render(<TestApp />);

        const button = screen.getByRole('button', { name: 'Probar JavaScript' });
        expect(button).toBeInTheDocument();

        fireEvent.click(button);
        expect(window.alert).toHaveBeenCalledWith('¡JavaScript funcionando!');
    });

    it('applies correct inline styling', () => {
        render(<TestApp />);

        const container = screen.getByText('🚀 RetroRocket Test').closest('div');
        expect(container).toHaveStyle({
            padding: '20px',
            fontFamily: 'Arial, sans-serif'
        });

        const statusBox = screen.getByText('Estado de la aplicación:').closest('div');
        expect(statusBox).toHaveStyle({
            background: '#f0f8ff',
            padding: '10px',
            borderRadius: '5px',
            margin: '10px 0'
        });
    });

    it('has correct semantic structure', () => {
        render(<TestApp />);

        // Should have main heading
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();

        // Should have a button
        expect(screen.getByRole('button')).toBeInTheDocument();

        // Should have a list
        expect(screen.getByRole('list')).toBeInTheDocument();
    });
});
