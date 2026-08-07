import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TypingPreview from '@/lib/components/ui/TypingPreview';
import { TypingIndicator } from '@/features/boards/types/typing';

// Mock framer-motion. AnimatePresence renders a detectable marker (not a bare
// passthrough) so tests can assert it stays mounted across the typingUsers ->
// empty transition — required for the typing card to exit-animate instead of
// vanishing instantly (design audit finding, spec 028: same AnimatePresence-
// boundary bug class as DAF-001, here caused by the early `return liveRegion`
// above the AnimatePresence tree).
vi.mock('framer-motion', () => ({
    motion: {
        div: vi.fn(({ children, ...props }) => <div {...props}>{children}</div>),
    },
    AnimatePresence: vi.fn(({ children }) => <div data-testid="animate-presence">{children}</div>),
}));

function indicator(userId: string, username: string): TypingIndicator {
    return { userId, username, column: 'helped', lastActivity: new Date() };
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

    it('keeps the same live-region node mounted across a typing-to-empty transition — only its text changes', () => {
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
