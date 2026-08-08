import React from 'react';
import { render, screen } from '@testing-library/react';
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
});
