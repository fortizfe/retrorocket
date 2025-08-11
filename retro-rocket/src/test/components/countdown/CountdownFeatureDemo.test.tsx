import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CountdownFeatureDemo from '../../../components/countdown/CountdownFeatureDemo';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>
    },
    AnimatePresence: ({ children }: any) => <>{children}</>
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    Clock: ({ className }: any) => <div className={className} data-testid="clock-icon">Clock</div>,
    Users: ({ className }: any) => <div className={className} data-testid="users-icon">Users</div>,
    Settings: ({ className }: any) => <div className={className} data-testid="settings-icon">Settings</div>
}));

describe('CountdownFeatureDemo', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders without crashing', () => {
        render(<CountdownFeatureDemo />);

        expect(screen.getByText('🚀 Modo Facilitador - Countdown Timer')).toBeInTheDocument();
    });

    it('displays the main heading and description', () => {
        render(<CountdownFeatureDemo />);

        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toHaveTextContent('🚀 Modo Facilitador - Countdown Timer');

        expect(screen.getByText('Control avanzado de temporizador para retrospectivas Scrum')).toBeInTheDocument();
    });

    it('displays three feature sections', () => {
        render(<CountdownFeatureDemo />);

        expect(screen.getByText('Para Facilitadores')).toBeInTheDocument();
        expect(screen.getByText('Para Participantes')).toBeInTheDocument();
        expect(screen.getByText('Características')).toBeInTheDocument();
    });

    it('shows facilitator features', () => {
        render(<CountdownFeatureDemo />);

        expect(screen.getByText('✅ Configurar tiempo (min:seg)')).toBeInTheDocument();
        expect(screen.getByText('▶️ Iniciar temporizador')).toBeInTheDocument();
        expect(screen.getByText('⏸️ Pausar cuando necesario')).toBeInTheDocument();
        expect(screen.getByText('🔄 Reiniciar fácilmente')).toBeInTheDocument();
        expect(screen.getByText('🗑️ Eliminar completamente')).toBeInTheDocument();
        expect(screen.getByText('🎛️ Panel de control exclusivo')).toBeInTheDocument();
    });

    it('shows participant features', () => {
        render(<CountdownFeatureDemo />);

        expect(screen.getByText('👁️ Ver temporizador en tiempo real')).toBeInTheDocument();
        expect(screen.getByText('🔄 Sincronización automática')).toBeInTheDocument();
        expect(screen.getByText('📊 Barra de progreso visual')).toBeInTheDocument();
        expect(screen.getByText('🚨 Notificación al terminar')).toBeInTheDocument();
        expect(screen.getByText('📱 Responsive en móvil')).toBeInTheDocument();
    });

    it('shows technical characteristics', () => {
        render(<CountdownFeatureDemo />);

        expect(screen.getByText('🔒 Seguridad con Firestore')).toBeInTheDocument();
        expect(screen.getByText('🎨 Estados visuales claros')).toBeInTheDocument();
        expect(screen.getByText('🌙 Modo oscuro completo')).toBeInTheDocument();
        expect(screen.getByText('♿ Navegación accesible')).toBeInTheDocument();
        expect(screen.getByText('🎭 Animaciones suaves')).toBeInTheDocument();
    });

    it('displays timer states section', () => {
        render(<CountdownFeatureDemo />);

        expect(screen.getByText('Estados Visuales del Temporizador')).toBeInTheDocument();
        expect(screen.getByText('Detenido')).toBeInTheDocument();
        expect(screen.getByText('En Curso')).toBeInTheDocument();
        expect(screen.getByText('Pausado')).toBeInTheDocument();
        expect(screen.getByText('Terminado')).toBeInTheDocument();
    });

    it('shows usage instructions', () => {
        render(<CountdownFeatureDemo />);

        expect(screen.getByText('📋 Cómo Usar el Countdown Timer')).toBeInTheDocument();
        expect(screen.getByText(/Como facilitador, crea una nueva retrospectiva/)).toBeInTheDocument();
        expect(screen.getByText(/Verás el panel "Controles de Facilitador"/)).toBeInTheDocument();
        expect(screen.getByText(/Configura el tiempo deseado/)).toBeInTheDocument();
        expect(screen.getByText(/Haz clic en "Crear" para configurar el temporizador/)).toBeInTheDocument();
    });

    it('includes proper icons for each section', () => {
        render(<CountdownFeatureDemo />);

        expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
        expect(screen.getByTestId('users-icon')).toBeInTheDocument();
        expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });

    it('applies correct styling classes', () => {
        render(<CountdownFeatureDemo />);

        const mainContainer = screen.getByText('🚀 Modo Facilitador - Countdown Timer').closest('div')?.parentElement;
        expect(mainContainer).toHaveClass('max-w-4xl', 'mx-auto', 'p-6', 'space-y-8');
    });

    it('has proper semantic structure', () => {
        render(<CountdownFeatureDemo />);

        // Should have section headings
        const headings = screen.getAllByRole('heading', { level: 3 });
        expect(headings.length).toBeGreaterThanOrEqual(4); // Para Facilitadores, Para Participantes, Características, etc.

        // Should have lists
        const lists = screen.getAllByRole('list');
        expect(lists.length).toBeGreaterThan(0);
    });

    it('has responsive layout structure', () => {
        render(<CountdownFeatureDemo />);

        // Check that the component renders all its main sections
        expect(screen.getByText('Para Facilitadores')).toBeInTheDocument();
        expect(screen.getByText('Para Participantes')).toBeInTheDocument();
        expect(screen.getByText('Características')).toBeInTheDocument();
    });
});
