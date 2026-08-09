import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SentimentTab from '@/features/boards/facilitator/components/SentimentTab';
import { DEFAULT_SENTIMENT_CONFIG } from '@/features/boards/types/sentiment';

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => ({
    Brain: () => <div data-testid="brain-icon" />,
    Settings: () => <div data-testid="settings-icon" />,
    AlertCircle: () => <div data-testid="alert-icon" />,
    CheckCircle: () => <div data-testid="check-icon" />,
    Loader: () => <div data-testid="loader-icon" />,
    ChevronDown: () => <div data-testid="chevron-down" />,
    ChevronUp: () => <div data-testid="chevron-up" />,
    BarChart3: () => <div data-testid="bar-chart-icon" />,
    Zap: () => <div data-testid="zap-icon" />,
    TrendingUp: () => <div data-testid="trending-up-icon" />,
}));

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/lib/components/ui/Button', () => ({
    default: ({ children, onClick, disabled, ...props }: any) => (
        <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
    ),
}));

describe('SentimentTab', () => {
    const baseProps = {
        enabled: true,
        ready: true,
        loading: false,
        config: DEFAULT_SENTIMENT_CONFIG,
        onToggle: vi.fn(),
        onConfigUpdate: vi.fn(),
        cardCount: 5,
    };

    it('shows the ready status when enabled and ready', () => {
        render(<SentimentTab {...baseProps} />);
        expect(screen.getByText('sentiment.status.ready')).toBeInTheDocument();
    });

    it('shows the disabled status when not enabled', () => {
        render(<SentimentTab {...baseProps} enabled={false} />);
        expect(screen.getByText('sentiment.status.disabled')).toBeInTheDocument();
    });

    it('shows a connection-error status when an error is present', () => {
        render(<SentimentTab {...baseProps} error="boom" />);
        expect(screen.getByText('sentiment.status.connectionError')).toBeInTheDocument();
    });

    it('exposes the auto-analysis toggle as a real switch (role="switch", aria-checked) — previously a bare button with no switch semantics', () => {
        render(<SentimentTab {...baseProps} />);
        fireEvent.click(screen.getByText('sentiment.advancedSettings'));

        const toggle = screen.getByRole('switch', { name: 'sentiment.settings.autoAnalysis' });
        expect(toggle).toHaveAttribute('aria-checked', String(DEFAULT_SENTIMENT_CONFIG.enabled));
    });

    it('calls onConfigUpdate with the flipped enabled state when the auto-analysis switch is toggled', () => {
        const onConfigUpdate = vi.fn();
        render(<SentimentTab {...baseProps} onConfigUpdate={onConfigUpdate} />);
        fireEvent.click(screen.getByText('sentiment.advancedSettings'));

        fireEvent.click(screen.getByRole('switch', { name: 'sentiment.settings.autoAnalysis' }));
        expect(onConfigUpdate).toHaveBeenCalledWith({ enabled: !DEFAULT_SENTIMENT_CONFIG.enabled });
    });
});
