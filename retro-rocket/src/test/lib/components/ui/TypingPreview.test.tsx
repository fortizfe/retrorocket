import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import TypingPreview from '@/lib/components/ui/TypingPreview';
import { TypingIndicator } from '@/features/boards/types/typing';

// Real es.json values for the typing.* keys (feature 052 migrates TypingPreview
// off its current hardcoded Spanish template literals and onto these, via
// useLanguage()/t()). Interpolating against these exact strings means every
// pre-existing assertion in this file (which checks literal Spanish text) keeps
// passing unchanged once the component is wired up to call `t` for real.
const ES_TYPING_STRINGS: Record<string, string> = {
    'typing.single': '{{username}} está escribiendo',
    'typing.double': '{{username1}} y {{username2}} están escribiendo',
    'typing.multiple': '{{username}} y {{count}} más están escribiendo',
    'typing.anonymous': 'Un usuario está escribiendo',
};

function interpolate(template: string, options?: Record<string, unknown>): string {
    if (!options) return template;
    return template.replace(/\{\{(.*?)\}\}/g, (_match, token: string) => {
        const value = options[token.trim()];
        return value === undefined ? '' : String(value);
    });
}

const { mockT } = vi.hoisted(() => ({
    mockT: vi.fn((key: string, options?: Record<string, unknown>) => {
        const template = ES_TYPING_STRINGS[key];
        return template ? interpolate(template, options) : key;
    }),
}));

// TypingPreview doesn't call useLanguage() yet (feature 052, T003 wires it up) —
// this mock is added ahead of that so T002's tests can assert the future call
// shape (RED). Local to this file: no existing precedent for mocking this hook.
vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({
        t: mockT,
        currentLanguage: 'es',
        changeLanguage: vi.fn(),
        getAvailableLanguages: vi.fn(() => []),
    }),
}));

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
        render(<TypingPreview typingUsers={[]} isAnonymous={false} />);

        const liveRegion = screen.getByRole('status');
        expect(liveRegion).toHaveAttribute('aria-live', 'polite');
        expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
        expect(liveRegion).toHaveTextContent('');
    });

    it('mirrors the visible text for a single typist', () => {
        render(<TypingPreview typingUsers={[indicator('u1', 'Ana')]} isAnonymous={false} />);

        expect(screen.getByRole('status')).toHaveTextContent('Ana está escribiendo');
    });

    it('mirrors the visible text for two typists', () => {
        render(<TypingPreview typingUsers={[indicator('u1', 'Ana'), indicator('u2', 'Luis')]} isAnonymous={false} />);

        expect(screen.getByRole('status')).toHaveTextContent('Ana y Luis están escribiendo');
    });

    it('mirrors the visible text for three or more typists', () => {
        render(<TypingPreview typingUsers={[indicator('u1', 'Ana'), indicator('u2', 'Luis'), indicator('u3', 'Sam')]} isAnonymous={false} />);

        expect(screen.getByRole('status')).toHaveTextContent('Ana y 2 más están escribiendo');
    });

    it('updates the live region\'s text immediately on a typing-to-empty transition, not gated on the visual card\'s exit', () => {
        const { rerender } = render(<TypingPreview typingUsers={[indicator('u1', 'Ana')]} isAnonymous={false} />);
        const liveRegionWhileTyping = screen.getByRole('status');
        expect(liveRegionWhileTyping).toHaveTextContent('Ana está escribiendo');

        rerender(<TypingPreview typingUsers={[]} isAnonymous={false} />);
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
        render(<TypingPreview typingUsers={[]} isAnonymous={false} />);

        expect(screen.getByTestId('animate-presence')).toBeInTheDocument();
    });

    it('keeps a single AnimatePresence boundary mounted across a typing-to-empty transition', () => {
        const { rerender } = render(<TypingPreview typingUsers={[indicator('u1', 'Ana')]} isAnonymous={false} />);
        expect(screen.getByTestId('animate-presence')).toBeInTheDocument();

        rerender(<TypingPreview typingUsers={[]} isAnonymous={false} />);
        expect(screen.getByTestId('animate-presence')).toBeInTheDocument();
    });
});

describe('TypingPreview exit content never lingers (feature 034, Contract 4)', () => {
    it('never shows a departing typist\'s name once typingUsers has dropped to zero, even mid-exit', async () => {
        const { rerender } = render(<TypingPreview typingUsers={[indicator('u1', 'Ana')]} isAnonymous={false} />);
        expect(visibleCardText()?.textContent).toBe('Ana está escribiendo');

        rerender(<TypingPreview typingUsers={[]} isAnonymous={false} />);

        // The card may still be present (frozen mid-exit per the mock above), but it
        // must never display the departing typist's name — only clearing
        // `displayedUsers` before `isPresent` flips (in its own commit) guarantees
        // this, regardless of how long the real exit transition takes or how fast
        // another column's own indicator appears with matching text.
        expect(visibleCardText()?.textContent ?? '').not.toBe('Ana está escribiendo');

        await waitFor(() => expect(visibleCardText()).toBeNull());
    });

    it('never shows a stale typist\'s name when a different typist starts in the same column right as the first one stops', async () => {
        const { rerender } = render(<TypingPreview typingUsers={[indicator('u1', 'Ana')]} isAnonymous={false} />);
        expect(visibleCardText()?.textContent).toBe('Ana está escribiendo');

        rerender(<TypingPreview typingUsers={[]} isAnonymous={false} />);
        expect(visibleCardText()?.textContent ?? '').not.toBe('Ana está escribiendo');

        rerender(<TypingPreview typingUsers={[indicator('u2', 'Luis')]} isAnonymous={false} />);
        await waitFor(() => expect(visibleCardText()?.textContent).toBe('Luis está escribiendo'));
    });
});

describe('TypingPreview i18n (feature 052)', () => {
    it('calls t("typing.single", { username }) for one typist', () => {
        mockT.mockClear();
        render(<TypingPreview typingUsers={[indicator('u1', 'Ana')]} isAnonymous={false} />);

        expect(mockT).toHaveBeenCalledWith('typing.single', { username: 'Ana' });
    });

    it('calls t("typing.double", { username1, username2 }) for two typists', () => {
        mockT.mockClear();
        render(<TypingPreview typingUsers={[indicator('u1', 'Ana'), indicator('u2', 'Luis')]} isAnonymous={false} />);

        expect(mockT).toHaveBeenCalledWith('typing.double', { username1: 'Ana', username2: 'Luis' });
    });

    it('calls t("typing.multiple", { username, count }) for three or more typists', () => {
        mockT.mockClear();
        render(<TypingPreview typingUsers={[indicator('u1', 'Ana'), indicator('u2', 'Luis'), indicator('u3', 'Sam')]} isAnonymous={false} />);

        expect(mockT).toHaveBeenCalledWith('typing.multiple', { username: 'Ana', count: 2 });
    });
});

// feature 052-anonymous-typing-indicator, T004 (US1): `isAnonymous` does not exist
// on TypingPreviewProps yet (added in T007) — these tests are RED until then, both
// because the visible/live-region text still uses the named variants and because
// TypeScript does not yet know about the `isAnonymous` prop at all.
describe('TypingPreview anonymous mode (feature 052)', () => {
    it('shows only the generic message, in both the visible card and the live region, for a single typist', () => {
        mockT.mockClear();
        render(<TypingPreview typingUsers={[indicator('u1', 'Ana')]} isAnonymous={true} />);

        expect(visibleCardText()?.textContent).toBe('Un usuario está escribiendo');
        expect(screen.getByRole('status')).toHaveTextContent('Un usuario está escribiendo');
        // No variables for this key (contract: `t('typing.anonymous')`, no options).
        expect(mockT).toHaveBeenCalledWith('typing.anonymous');
        expect(mockT).not.toHaveBeenCalledWith('typing.single', expect.anything());
    });

    it('still shows the single generic message — not doubled or counted — for two simultaneous typists', () => {
        mockT.mockClear();
        render(<TypingPreview typingUsers={[indicator('u1', 'Ana'), indicator('u2', 'Luis')]} isAnonymous={true} />);

        expect(visibleCardText()?.textContent).toBe('Un usuario está escribiendo');
        expect(screen.getByRole('status')).toHaveTextContent('Un usuario está escribiendo');
        expect(mockT).toHaveBeenCalledWith('typing.anonymous');
        expect(mockT).not.toHaveBeenCalledWith('typing.double', expect.anything());
    });

    it('still shows the single generic message — not doubled or counted — for three or more simultaneous typists', () => {
        mockT.mockClear();
        render(<TypingPreview typingUsers={[indicator('u1', 'Ana'), indicator('u2', 'Luis'), indicator('u3', 'Sam')]} isAnonymous={true} />);

        expect(visibleCardText()?.textContent).toBe('Un usuario está escribiendo');
        expect(screen.getByRole('status')).toHaveTextContent('Un usuario está escribiendo');
        expect(mockT).toHaveBeenCalledWith('typing.anonymous');
        expect(mockT).not.toHaveBeenCalledWith('typing.multiple', expect.anything());
    });

    it('renders no avatar/initials cluster at all — no element carries a typist\'s identifying title', () => {
        render(<TypingPreview
            typingUsers={[indicator('u1', 'Ana'), indicator('u2', 'Luis'), indicator('u3', 'Sam')]}
            isAnonymous={true}
        />);

        // Non-anonymous markup gives each avatar a `title={user.username}`; none of
        // those identifying names may appear anywhere in the DOM while anonymous.
        expect(document.querySelector('[title="Ana"]')).toBeNull();
        expect(document.querySelector('[title="Luis"]')).toBeNull();
        expect(document.querySelector('[title="Sam"]')).toBeNull();
        // No `title` attribute of any kind should remain — the whole avatar cluster
        // block (including its `+N` overflow badge) must be absent from the DOM,
        // not merely relabeled.
        expect(document.querySelectorAll('[title]').length).toBe(0);
    });

    it('renders no "+N" overflow badge even with four simultaneous typists', () => {
        render(<TypingPreview
            typingUsers={[
                indicator('u1', 'Ana'),
                indicator('u2', 'Luis'),
                indicator('u3', 'Sam'),
                indicator('u4', 'Kim'),
            ]}
            isAnonymous={true}
        />);

        // Non-anonymous markup would show a "+1" badge here (4 typists, 3 shown).
        expect(screen.queryByText('+1')).not.toBeInTheDocument();
        expect(document.querySelectorAll('[title]').length).toBe(0);
    });
});

// feature 052-anonymous-typing-indicator, T010 (US2/FR-003/SC-002): complements the
// anonymous-mode tests above, which only assert the avatar cluster's *absence*. This
// asserts its presence — unchanged from pre-052 behavior — when isAnonymous is false,
// closing the explicit "avatars shown as today when not anonymous" acceptance scenario.
describe('TypingPreview non-anonymous mode still shows avatars (feature 052)', () => {
    it('renders the avatar/initials cluster, including the "+N" overflow badge, when not anonymous', () => {
        render(<TypingPreview
            typingUsers={[
                indicator('u1', 'Ana'),
                indicator('u2', 'Luis'),
                indicator('u3', 'Sam'),
                indicator('u4', 'Kim'),
            ]}
            isAnonymous={false}
        />);

        // First three typists get an individually-titled avatar (matches the real
        // avatar markup's title={user.username}).
        expect(document.querySelector('[title="Ana"]')).not.toBeNull();
        expect(document.querySelector('[title="Luis"]')).not.toBeNull();
        expect(document.querySelector('[title="Sam"]')).not.toBeNull();
        // Fourth typist overflows into the "+1" badge instead of its own avatar.
        expect(screen.getByText('+1')).toBeInTheDocument();
    });
});
