import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import VersionBanner from '@/lib/components/ui/VersionBanner';
import { useBackendVersion } from '@/lib/hooks/useBackendVersion';

vi.mock('@/lib/hooks/useBackendVersion', () => ({
    useBackendVersion: vi.fn(),
}));

const mockedUseBackendVersion = vi.mocked(useBackendVersion);

describe('VersionBanner', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders nothing when the version is current', () => {
        mockedUseBackendVersion.mockReturnValue({ isStale: false });
        const { container } = render(<VersionBanner />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders a reload prompt when stale', () => {
        mockedUseBackendVersion.mockReturnValue({ isStale: true });
        render(<VersionBanner />);

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'app.reload' })).toBeInTheDocument();
    });

    it('reloads the page when the button is clicked', () => {
        mockedUseBackendVersion.mockReturnValue({ isStale: true });
        const reloadSpy = vi.fn();
        Object.defineProperty(window, 'location', {
            value: { reload: reloadSpy },
            writable: true,
        });

        render(<VersionBanner />);
        screen.getByRole('button', { name: 'app.reload' }).click();

        expect(reloadSpy).toHaveBeenCalled();
    });
});
