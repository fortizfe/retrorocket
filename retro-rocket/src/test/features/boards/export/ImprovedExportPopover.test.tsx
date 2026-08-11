import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import ImprovedExportPopover from '@/features/boards/export/components/ImprovedExportPopover';
import { Retrospective } from '@/features/boards/types/retrospective';

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, whileTap: _whileTap, ...props }: any) => <button {...props}>{children}</button>,
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: (key: string) => key }),
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

// Feature 038 (T013/T016): ImprovedExportPopover is now a pure content component —
// mounting/dismissal-gating and Floating UI/BottomSheet chrome live entirely in its
// caller (RetrospectiveTopbar.tsx), matching the established FacilitatorMenuTabs.tsx
// pattern (no `isOpen` prop; the parent's own `{open && ...}` conditional render
// controls whether this mounts at all). The export-job state (isExporting/progress/
// error/success/exportRetrospective) is consumed as props, lifted by the caller
// (T012) rather than owned here.
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
        onClose: vi.fn(),
        presentation: 'desktop' as const,
        isExporting: false,
        progress: 0,
        error: null,
        success: false,
        exportRetrospective: vi.fn(),
        resetState: vi.fn(),
    };

    it('renders its content unconditionally once mounted — the caller decides whether to mount it at all', () => {
        render(<ImprovedExportPopover {...defaultProps} />);
        expect(screen.getByText('retrospective.export.title')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /PDF/ })).toBeInTheDocument();
    });

    it('marks the selected export format with aria-pressed', () => {
        render(<ImprovedExportPopover {...defaultProps} />);
        expect(screen.getByRole('button', { name: /PDF/ })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: /TXT/ })).toHaveAttribute('aria-pressed', 'false');
    });

    it('preserves the always-included-content notice for every participant', () => {
        render(<ImprovedExportPopover {...defaultProps} />);
        expect(screen.getByText('retrospective.export.alwaysIncluded.title')).toBeInTheDocument();
    });

    it('omits the facilitator-only zone entirely for a non-owner participant', () => {
        const nonOwnerRetrospective = { ...retrospective, createdBy: 'someone-else' };
        render(<ImprovedExportPopover {...defaultProps} retrospective={nonOwnerRetrospective} />);
        expect(screen.queryByText('retrospective.export.facilitatorZone.title')).not.toBeInTheDocument();
    });

    it('shows the facilitator-only zone for the board owner', () => {
        render(<ImprovedExportPopover {...defaultProps} />);
        expect(screen.getByText('retrospective.export.facilitatorZone.title')).toBeInTheDocument();
    });

    describe('desktop presentation', () => {
        it('renders its own shelled header, including a close button that calls onClose', async () => {
            const onClose = vi.fn();
            const { default: userEvent } = await import('@testing-library/user-event');
            const user = userEvent.setup();
            render(<ImprovedExportPopover {...defaultProps} presentation="desktop" onClose={onClose} />);

            const closeButton = screen.getByRole('button', { name: 'common.close' });
            await user.click(closeButton);
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('mobile presentation', () => {
        it('renders content only — no shell header or close button of its own (BottomSheet supplies both)', () => {
            render(<ImprovedExportPopover {...defaultProps} presentation="mobile" />);
            expect(screen.queryByRole('button', { name: 'common.close' })).not.toBeInTheDocument();
            // The content itself (format grid etc.) is still present either way.
            expect(screen.getByRole('button', { name: /PDF/ })).toBeInTheDocument();
        });
    });

    describe('export job state (feature 038, FR-007/FR-007a — lifted props from T012)', () => {
        it('shows in-progress feedback, including progress, when isExporting is true', () => {
            render(<ImprovedExportPopover {...defaultProps} isExporting={true} progress={42} />);
            expect(screen.getByText(/42/)).toBeInTheDocument();
        });

        it('shows the success state from props, without owning any export-job state itself', () => {
            render(<ImprovedExportPopover {...defaultProps} success={true} />);
            expect(screen.getByText('retrospective.export.success')).toBeInTheDocument();
        });

        it('shows the error state from props', () => {
            render(<ImprovedExportPopover {...defaultProps} error="Something went wrong" />);
            expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        });

        it('calls the injected exportRetrospective (not a locally-owned hook) when the export button is clicked', async () => {
            const exportRetrospective = vi.fn().mockResolvedValue(undefined);
            const { default: userEvent } = await import('@testing-library/user-event');
            const user = userEvent.setup();
            render(<ImprovedExportPopover {...defaultProps} exportRetrospective={exportRetrospective} />);

            await user.click(screen.getByRole('button', { name: /retrospective.export.export/ }));
            expect(exportRetrospective).toHaveBeenCalledTimes(1);
        });
    });
});
