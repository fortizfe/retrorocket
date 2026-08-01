import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConnectedAppsCard from '@/features/auth/components/ConnectedAppsCard';
import { useConnectedApps } from '@/features/auth/hooks/useConnectedApps';
import type { ConnectedApp } from '@/features/auth/services/connectedAppsService';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'es' } }),
}));

vi.mock('@/features/auth/hooks/useConnectedApps', () => ({
    useConnectedApps: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const mockUseConnectedApps = vi.mocked(useConnectedApps);

function app(overrides: Partial<ConnectedApp> = {}): ConnectedApp {
    return {
        id: 'c1',
        clientName: 'Claude',
        createdAt: '2026-07-20T10:00:00Z',
        status: 'active',
        origin: 'unknown',
        lastUsedAt: null,
        ...overrides,
    };
}

describe('ConnectedAppsCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders distinct origin labels for two connections sharing the same clientName', () => {
        mockUseConnectedApps.mockReturnValue({
            connectedApps: [
                app({ id: 'c1', origin: 'desktop' }),
                app({ id: 'c2', origin: 'mobile' }),
            ],
            isLoading: false,
            error: null,
            revokingIds: [],
            refresh: vi.fn(),
            revoke: vi.fn(),
        });

        render(<ConnectedAppsCard />);

        expect(screen.getByText('mcpConnector.connectedApps.originDesktop')).toBeInTheDocument();
        expect(screen.getByText('mcpConnector.connectedApps.originMobile')).toBeInTheDocument();
    });

    it('renders a "never used yet" state when lastUsedAt is null', () => {
        mockUseConnectedApps.mockReturnValue({
            connectedApps: [app({ id: 'c1', lastUsedAt: null })],
            isLoading: false,
            error: null,
            revokingIds: [],
            refresh: vi.fn(),
            revoke: vi.fn(),
        });

        render(<ConnectedAppsCard />);

        expect(screen.getByText('mcpConnector.connectedApps.neverUsedYet')).toBeInTheDocument();
        expect(screen.queryByText('mcpConnector.connectedApps.lastUsedOn')).not.toBeInTheDocument();
    });

    it('renders a last-used date instead of "never used yet" when lastUsedAt is set', () => {
        mockUseConnectedApps.mockReturnValue({
            connectedApps: [app({ id: 'c1', lastUsedAt: '2026-07-30T09:15:00Z' })],
            isLoading: false,
            error: null,
            revokingIds: [],
            refresh: vi.fn(),
            revoke: vi.fn(),
        });

        render(<ConnectedAppsCard />);

        expect(screen.getByText('mcpConnector.connectedApps.lastUsedOn')).toBeInTheDocument();
        expect(screen.queryByText('mcpConnector.connectedApps.neverUsedYet')).not.toBeInTheDocument();
    });
});
