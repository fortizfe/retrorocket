import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FacilitatorMenuTabs from '@/features/boards/facilitator/components/FacilitatorMenuTabs';

vi.mock('framer-motion', () => ({
    motion: {
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: (key: string) => key }),
}));

describe('FacilitatorMenuTabs', () => {
    const baseProps = {
        activeTab: 'controls',
        onTabChange: vi.fn(),
        onClose: vi.fn(),
    };

    it('shows the timer badge on the Controls tab when provided', () => {
        // Regression test: timerBadge was threaded all the way from FacilitatorMenu's
        // getTimerBadge() into this component's props, but the 'controls' tab entry
        // never read it into its `badge` field, so the badge silently never rendered.
        render(
            <FacilitatorMenuTabs {...baseProps} timerBadge="▶">
                <div>content</div>
            </FacilitatorMenuTabs>
        );

        expect(screen.getByText('▶')).toBeInTheDocument();
    });

    it('renders no badge on the Controls tab when timerBadge is not provided', () => {
        render(
            <FacilitatorMenuTabs {...baseProps}>
                <div>content</div>
            </FacilitatorMenuTabs>
        );

        expect(screen.queryByText('▶')).not.toBeInTheDocument();
    });

    it('exposes a real ARIA tabs pattern — previously plain buttons with no tab semantics at all (contracts/accessibility-interaction-contract.md)', () => {
        render(
            <FacilitatorMenuTabs {...baseProps}>
                <div>content</div>
            </FacilitatorMenuTabs>
        );

        const tablist = screen.getByRole('tablist');
        expect(tablist).toBeInTheDocument();

        const tabs = screen.getAllByRole('tab');
        expect(tabs).toHaveLength(4);

        const activeTab = tabs.find((tab) => tab.id === 'facilitator-tab-controls');
        expect(activeTab).toHaveAttribute('aria-selected', 'true');
        expect(activeTab).toHaveAttribute('aria-controls', 'facilitator-tabpanel-controls');

        const inactiveTab = tabs.find((tab) => tab.id === 'facilitator-tab-notes');
        expect(inactiveTab).toHaveAttribute('aria-selected', 'false');
        expect(inactiveTab).toHaveAttribute('tabindex', '-1');

        const panel = screen.getByRole('tabpanel');
        expect(panel).toHaveAttribute('aria-labelledby', 'facilitator-tab-controls');
        expect(panel).toHaveTextContent('content');
    });

    it('moves to the adjacent tab on ArrowRight/ArrowLeft, per the WAI-ARIA tabs keyboard pattern', () => {
        const onTabChange = vi.fn();
        render(
            <FacilitatorMenuTabs {...baseProps} onTabChange={onTabChange}>
                <div>content</div>
            </FacilitatorMenuTabs>
        );

        const controlsTab = screen.getByRole('tab', { name: /controls/i });
        fireEvent.keyDown(controlsTab, { key: 'ArrowRight' });
        expect(onTabChange).toHaveBeenCalledWith('team-mood');
    });
});
