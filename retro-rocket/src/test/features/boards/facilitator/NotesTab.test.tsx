import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NotesTab from '@/features/boards/facilitator/components/NotesTab';

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    // Faithful enough to reproduce the duplicate-content race this file's create-note
    // tests guard against (research.md §3, feature 034): real AnimatePresence keeps
    // rendering an exiting child's *last committed* element — frozen, not re-evaluated
    // against newer state — for the length of its exit transition, instead of dropping
    // it in the same commit that removed it from the tree. A bare passthrough
    // (`<>{children}</>`) cannot observe or guard against that class of bug, since it
    // unmounts the exiting child immediately. EXIT_FREEZE_MS stands in for a real exit
    // transition's duration.
    AnimatePresence: ({ children }: any) => {
        const EXIT_FREEZE_MS = 20;
        const [frozen, setFrozen] = React.useState(children);
        React.useEffect(() => {
            // NotesTab renders its children as `{condition && <motion.div>...}`, which
            // yields `false` (not `null`/`undefined`) when the condition is false — so
            // this must treat any falsy value as "removed", not just `== null`.
            if (children) {
                setFrozen(children);
                return;
            }
            const timer = setTimeout(() => setFrozen(null), EXIT_FREEZE_MS);
            return () => clearTimeout(timer);
        }, [children]);
        return frozen;
    },
}));

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/lib/components/ui/Button', () => ({
    default: ({ children, onClick, disabled, ...props }: any) => (
        <button onClick={onClick} disabled={disabled} {...props}>
            {children}
        </button>
    ),
}));

const createNoteMock = vi.fn();
const updateNoteMock = vi.fn();
vi.mock('@/features/boards/facilitator/hooks/useFacilitatorNotes', () => ({
    useFacilitatorNotes: (_retroId: string, _facilitatorId: string, notes: unknown[]) => ({
        notes,
        loading: false,
        error: null,
        createNote: createNoteMock,
        updateNote: updateNoteMock,
        deleteNote: vi.fn(),
        clearError: vi.fn(),
    }),
}));

describe('NotesTab', () => {
    beforeEach(() => {
        createNoteMock.mockReset();
        updateNoteMock.mockReset();
    });

    // Regression guard for a real race: `notes` is realtime-synced
    // (useFacilitatorNotes), so a just-created note can arrive back into this
    // component via the live channel before createNote()'s own request/response
    // round-trip resolves. If the creation form closed only *after* that
    // await, the still-open textarea and the newly rendered note (same text)
    // could both be mounted at once — exactly what broke
    // e2e/retrospective-board.spec.ts's "a facilitator note is never visible
    // to another participant's session" (strict-mode violation: two elements
    // matched the same text). Closing the form before the await removes the
    // window entirely.
    it('closes the creation form before createNote resolves, so it can never coexist with a realtime-delivered duplicate', async () => {
        let resolveCreate!: () => void;
        createNoteMock.mockImplementation(
            () => new Promise<void>((resolve) => { resolveCreate = resolve; })
        );

        render(<NotesTab retrospectiveId="retro-1" facilitatorId="fac-1" notes={[]} />);

        fireEvent.click(screen.getByText('notes.new'));
        const textarea = screen.getByPlaceholderText('retrospective.facilitator.notes.placeholder');
        fireEvent.change(textarea, { target: { value: "A's private note" } });
        fireEvent.click(screen.getByText('retrospective.facilitator.notes.save'));

        // Starts closing immediately — before the in-flight createNote promise has
        // resolved, and well before its own (short, independent) exit transition would
        // finish — not gated on the network at all.
        await waitFor(() => expect(screen.queryByPlaceholderText('retrospective.facilitator.notes.placeholder')).not.toBeInTheDocument());
        expect(createNoteMock).toHaveBeenCalledWith("A's private note");

        resolveCreate();
        await waitFor(() => expect(createNoteMock).toHaveBeenCalledTimes(1));
    });

    it('clears the textarea\'s content in its own commit before the form starts exiting, so its frozen exit snapshot is always empty — never the just-saved text (Contract 3, feature 034)', async () => {
        let resolveCreate!: () => void;
        createNoteMock.mockImplementation(
            () => new Promise<void>((resolve) => { resolveCreate = resolve; })
        );

        render(<NotesTab retrospectiveId="retro-1" facilitatorId="fac-1" notes={[]} />);

        fireEvent.click(screen.getByText('notes.new'));
        const textarea = screen.getByPlaceholderText('retrospective.facilitator.notes.placeholder') as HTMLTextAreaElement;
        fireEvent.change(textarea, { target: { value: "A's private note" } });
        fireEvent.click(screen.getByText('retrospective.facilitator.notes.save'));

        // The mocked AnimatePresence above now freezes the exiting form for a short
        // window (simulating a real exit transition) instead of unmounting it
        // instantly — so during that window, the exiting textarea is still queryable.
        // If its value were still "A's private note", this would be the exact strict
        // -mode-violation scenario that broke the Playwright spec (two elements with
        // the same text: the exiting textarea and the realtime-delivered note). It
        // must already be empty.
        const exitingTextarea = screen.queryByPlaceholderText('retrospective.facilitator.notes.placeholder') as HTMLTextAreaElement | null;
        if (exitingTextarea) {
            expect(exitingTextarea.value).toBe('');
        }
        expect(screen.queryAllByText("A's private note")).toHaveLength(0);

        // And once the exit window fully elapses, it's gone entirely.
        await waitFor(() => expect(screen.queryByPlaceholderText('retrospective.facilitator.notes.placeholder')).not.toBeInTheDocument());

        resolveCreate();
        await waitFor(() => expect(createNoteMock).toHaveBeenCalledTimes(1));
    });

    it('closes the edit form before updateNote resolves, for the same reason', async () => {
        let resolveUpdate!: () => void;
        updateNoteMock.mockImplementation(
            () => new Promise<void>((resolve) => { resolveUpdate = resolve; })
        );

        const notes = [
            { id: 'n1', content: 'Original note', retrospectiveId: 'retro-1', facilitatorId: 'fac-1', timestamp: new Date() },
        ];
        render(<NotesTab retrospectiveId="retro-1" facilitatorId="fac-1" notes={notes} />);

        fireEvent.click(screen.getByTitle('retrospective.facilitator.notes.editTitle'));
        const textarea = screen.getByPlaceholderText('retrospective.facilitator.notes.editPlaceholder');
        fireEvent.change(textarea, { target: { value: 'Updated note' } });
        fireEvent.click(screen.getByText('retrospective.facilitator.notes.save'));

        expect(screen.queryByPlaceholderText('retrospective.facilitator.notes.editPlaceholder')).not.toBeInTheDocument();
        expect(updateNoteMock).toHaveBeenCalledWith('n1', 'Updated note');

        resolveUpdate();
        await waitFor(() => expect(updateNoteMock).toHaveBeenCalledTimes(1));
    });

    it('keeps a note\'s edit/delete controls always visible — never hover-only (research.md §3, FR-012)', () => {
        const notes = [
            { id: 'n1', content: 'A note', retrospectiveId: 'retro-1', facilitatorId: 'fac-1', timestamp: new Date() },
        ];
        render(<NotesTab retrospectiveId="retro-1" facilitatorId="fac-1" notes={notes} />);

        const editButton = screen.getByTitle('retrospective.facilitator.notes.editTitle');
        let node: HTMLElement | null = editButton;
        while (node) {
            expect(node.className).not.toMatch(/\bopacity-0\b/);
            node = node.parentElement;
        }
    });
});
