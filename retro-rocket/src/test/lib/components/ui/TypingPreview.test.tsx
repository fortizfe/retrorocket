import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TypingPreview from '@/lib/components/ui/TypingPreview';
import { TypingIndicator } from '@/features/boards/types/typing';

// Mock framer-motion. AnimatePresence is a faithful-enough stand-in — not a bare
// passthrough — so tests can assert both that it stays mounted across the
// typingUsers -> empty transition (required for the typing card to exit-animate
// instead of vanishing instantly, design audit finding, spec 028: same
// AnimatePresence-boundary bug class as DAF-001) AND that a removed child's
// *last-rendered* element is frozen and kept on screen for a short window before
// being dropped, mirroring real AnimatePresence's exit-transition behavior closely
// enough to reproduce the duplicate-text race a regression test below guards
// against (research.md §4, feature 034).
vi.mock('framer-motion', () => ({
    motion: {
        div: vi.fn(({ children, ...props }) => <div {...props}>{children}</div>),
    },
    AnimatePresence: vi.fn(({ children }) => {
        const EXIT_FREEZE_MS = 20;
        const [frozen, setFrozen] = React.useState(children);
        React.useEffect(() => {
            // NotesTab/TypingPreview render their AnimatePresence child as `{condition
            // && <motion.div>...}`, which yields `false` (not `null`/`undefined`) when
            // the condition is false — treat any falsy value as "removed".
            if (children) {
                setFrozen(children);
                return;
            }
            const timer = setTimeout(() => setFrozen(null), EXIT_FREEZE_MS);
            return () => clearTimeout(timer);
        }, [children]);
        return <div data-testid="animate-presence">{frozen}</div>;
    }),
}));

function indicator(userId: string, username: string): TypingIndicator {
    return { userId, username, column: 'helped', lastActivity: new Date() };
}

/** The *visible* card's typing text specifically — mirrors the real Playwright
 * locator (e2e/retrospective-board.spec.ts's visibleTypingText), scoped past the
 * always-mounted sr-only live region, which legitimately shares the same text. */
function visibleCardText(): Element | null {
    return document.querySelector('span.text-blue-700');
}

describe('TypingPreview accessible live region', () => {
    it('is present in the DOM with the correct role/aria attributes even when nobody is typing', () => {
        render(<TypingPreview typingUsers={[]} />);

        const liveRegion = screen.getByRole('status');
        expect(liveRegion).toHaveAttribute('aria-live', 'polite');
        expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
        expect(liveRegion).toHaveTextContent('');
    });

    it('mirrors the visible text for a single typist', () => {
        render(<TypingPreview typingUsers={[indicator('u1', 'Ana')]} />);

        expect(screen.getByRole('status')).toHaveTextContent('Ana está escribiendo');
    });

    it('mirrors the visible text for two typists', () => {
        render(<TypingPreview typingUsers={[indicator('u1', 'Ana'), indicator('u2', 'Luis')]} />);

        expect(screen.getByRole('status')).toHaveTextContent('Ana y Luis están escribiendo');
    });

    it('mirrors the visible text for three or more typists', () => {
        render(<TypingPreview typingUsers={[indicator('u1', 'Ana'), indicator('u2', 'Luis'), indicator('u3', 'Sam')]} />);

        expect(screen.getByRole('status')).toHaveTextContent('Ana y 2 más están escribiendo');
    });

    it('updates the live region\'s text immediately on a typing-to-empty transition, not gated on the visual card\'s exit', () => {
        const { rerender } = render(<TypingPreview typingUsers={[indicator('u1', 'Ana')]} />);
        const liveRegionWhileTyping = screen.getByRole('status');
        expect(liveRegionWhileTyping).toHaveTextContent('Ana está escribiendo');

        rerender(<TypingPreview typingUsers={[]} />);
        const liveRegionAfterStop = screen.getByRole('status');

        expect(liveRegionAfterStop).toBe(liveRegionWhileTyping);
        expect(liveRegionAfterStop).toHaveTextContent('');
    });
});

describe('TypingPreview AnimatePresence boundary', () => {
    it('keeps AnimatePresence mounted even with nobody typing, so the card can exit-animate', () => {
        // Previously the component early-returned before ever reaching
        // AnimatePresence when typingUsers was empty, so it was never mounted
        // at all — exit animations were dead code.
        render(<TypingPreview typingUsers={[]} />);

        expect(screen.getByTestId('animate-presence')).toBeInTheDocument();
    });

    it('keeps a single AnimatePresence boundary mounted across a typing-to-empty transition', () => {
        const { rerender } = render(<TypingPreview typingUsers={[indicator('u1', 'Ana')]} />);
        expect(screen.getByTestId('animate-presence')).toBeInTheDocument();

        rerender(<TypingPreview typingUsers={[]} />);
        expect(screen.getByTestId('animate-presence')).toBeInTheDocument();
    });
});

describe('TypingPreview exit content never lingers (feature 034, Contract 4)', () => {
    it('never shows a departing typist\'s name once typingUsers has dropped to zero, even mid-exit', async () => {
        const { rerender } = render(<TypingPreview typingUsers={[indicator('u1', 'Ana')]} />);
        expect(visibleCardText()?.textContent).toBe('Ana está escribiendo');

        rerender(<TypingPreview typingUsers={[]} />);

        // The card may still be present (frozen mid-exit per the mock above), but it
        // must never display the departing typist's name — only clearing
        // `displayedUsers` before `isPresent` flips (in its own commit) guarantees
        // this, regardless of how long the real exit transition takes or how fast
        // another column's own indicator appears with matching text.
        expect(visibleCardText()?.textContent ?? '').not.toBe('Ana está escribiendo');

        await waitFor(() => expect(visibleCardText()).toBeNull());
    });

    it('never shows a stale typist\'s name when a different typist starts in the same column right as the first one stops', async () => {
        const { rerender } = render(<TypingPreview typingUsers={[indicator('u1', 'Ana')]} />);
        expect(visibleCardText()?.textContent).toBe('Ana está escribiendo');

        rerender(<TypingPreview typingUsers={[]} />);
        expect(visibleCardText()?.textContent ?? '').not.toBe('Ana está escribiendo');

        rerender(<TypingPreview typingUsers={[indicator('u2', 'Luis')]} />);
        await waitFor(() => expect(visibleCardText()?.textContent).toBe('Luis está escribiendo'));
    });
});
