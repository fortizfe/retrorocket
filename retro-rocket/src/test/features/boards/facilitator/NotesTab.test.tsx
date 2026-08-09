import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NotesTab from '@/features/boards/facilitator/components/NotesTab';

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
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

        // Gone immediately — before the in-flight createNote promise has
        // resolved — not just eventually.
        expect(screen.queryByPlaceholderText('retrospective.facilitator.notes.placeholder')).not.toBeInTheDocument();
        expect(createNoteMock).toHaveBeenCalledWith("A's private note");

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
});
