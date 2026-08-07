import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import ImprovedExportPopover from '@/features/boards/export/components/ImprovedExportPopover';
import { Retrospective } from '@/features/boards/types/retrospective';

// A detectable marker (not a bare passthrough) so tests can assert AnimatePresence
// stays mounted (via the portal) across the isOpen transition — required for the
// popover to exit-animate instead of vanishing instantly (design audit finding,
// spec 028: same AnimatePresence-boundary bug class as DAF-001; `{isOpen &&
// createPortal(<AnimatePresence>...)}` previously removed AnimatePresence itself
// along with everything inside it in one render pass).
vi.mock('react-dom', () => ({
    createPortal: (children: React.ReactNode) => children,
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }: any) => <div data-testid="animate-presence">{children}</div>,
}));

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/lib/hooks/useBodyScrollLock', () => ({
    useBodyScrollLock: () => undefined,
}));

vi.mock('@/features/boards/export/hooks/useUnifiedExport', () => ({
    useUnifiedExport: () => ({
        isExporting: false,
        progress: 0,
        error: null,
        success: false,
        exportRetrospective: vi.fn(),
    }),
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
    useAuth: () => ({ user: { uid: 'user-1' } }),
}));

vi.mock('@/features/boards/export/hooks/useExportOptions', () => ({
    useExportOptions: () => ({
        exportOptions: {
            format: 'pdf',
            documentConfig: { customTitle: '', includeRetroRocketLogo: true },
            basicOptions: { includeActionItems: true, includeStatistics: true },
            facilitatorOptions: {
                includeFacilitatorNotes: false,
                includeSentimentBadges: false,
                includeTeamMoodAnalysis: false,
            },
        },
        updateFormat: vi.fn(),
        updateDocumentConfig: vi.fn(),
        updateBasicOptions: vi.fn(),
        updateFacilitatorOptions: vi.fn(),
        unifiedOptions: {},
    }),
}));

vi.mock('@/features/boards/sentiment', () => ({
    useSentiment: () => undefined,
    useTeamMood: () => ({ report: null }),
}));

describe('ImprovedExportPopover', () => {
    const retrospective = {
        id: 'retro-1',
        title: 'Test Retro',
        createdBy: 'user-1',
    } as unknown as Retrospective;

    const defaultProps = {
        retrospective,
        cards: [],
        groups: [],
        participants: [],
        isOpen: true,
        onClose: vi.fn(),
        children: <button>Trigger</button>,
    };

    it('renders the trigger', () => {
        render(<ImprovedExportPopover {...defaultProps} />);
        expect(screen.getByText('Trigger')).toBeInTheDocument();
    });

    it('does not render popover content when closed', () => {
        render(<ImprovedExportPopover {...defaultProps} isOpen={false} />);
        expect(screen.queryByText('retrospective.export.title')).not.toBeInTheDocument();
    });

    it('renders popover content when open', () => {
        render(<ImprovedExportPopover {...defaultProps} isOpen={true} />);
        expect(screen.getByText('retrospective.export.title')).toBeInTheDocument();
    });

    it('keeps AnimatePresence mounted even when closed, so the popover can exit-animate instead of being removed via `isOpen &&` gating the whole portal (design audit finding, spec 028)', () => {
        const { rerender } = render(<ImprovedExportPopover {...defaultProps} isOpen={false} />);

        expect(screen.getByTestId('animate-presence')).toBeInTheDocument();
        expect(screen.queryByText('retrospective.export.title')).not.toBeInTheDocument();

        rerender(<ImprovedExportPopover {...defaultProps} isOpen={true} />);

        // Open state also renders the error/success status AnimatePresence boundaries
        // (design audit finding DAF's exit-animation fixes), so multiple markers are
        // expected here — the assertion is that at least one persists.
        expect(screen.getAllByTestId('animate-presence').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('retrospective.export.title')).toBeInTheDocument();
    });
});
