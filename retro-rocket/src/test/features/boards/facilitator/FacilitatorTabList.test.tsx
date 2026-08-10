import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FacilitatorTabList from '@/features/boards/facilitator/components/FacilitatorTabList';

vi.mock('framer-motion', () => ({
    motion: {
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: (key: string) => key }),
}));

describe('FacilitatorTabList', () => {
    const baseProps = {
        activeTab: 'controls',
        onTabChange: vi.fn(),
    };

    it('exposes a real ARIA tabs pattern with the default idPrefix', () => {
        render(<FacilitatorTabList {...baseProps} />);

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
    });

    it('shows the timer badge on the Controls tab when provided', () => {
        render(<FacilitatorTabList {...baseProps} timerBadge="▶" />);
        expect(screen.getByText('▶')).toBeInTheDocument();
    });

    it('renders no badge on the Controls tab when timerBadge is not provided', () => {
        render(<FacilitatorTabList {...baseProps} />);
        expect(screen.queryByText('▶')).not.toBeInTheDocument();
    });

    it('moves to the adjacent tab on ArrowRight/ArrowLeft, per the WAI-ARIA tabs keyboard pattern', () => {
        const onTabChange = vi.fn();
        render(<FacilitatorTabList {...baseProps} onTabChange={onTabChange} />);

        const controlsTab = screen.getByRole('tab', { name: /controls/i });
        fireEvent.keyDown(controlsTab, { key: 'ArrowRight' });
        expect(onTabChange).toHaveBeenCalledWith('team-mood');
    });

    it('namespaces tab/panel element IDs by idPrefix, so a desktop and mobile instance can coexist in the DOM without ID collisions', () => {
        render(<FacilitatorTabList {...baseProps} idPrefix="facilitator-mobile" />);

        expect(document.getElementById('facilitator-mobile-tab-controls')).toBeInTheDocument();
        expect(document.getElementById('facilitator-tab-controls')).not.toBeInTheDocument();
    });
});
