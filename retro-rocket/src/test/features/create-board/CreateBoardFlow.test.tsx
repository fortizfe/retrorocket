import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateBoardFlow from '@/features/create-board/components/CreateBoardFlow';
import { createBoard } from '@/features/dashboard/services/backendBoardsClient';

// 051-anonymous-board-mode, T020 (spec.md User Story 1 / FR-001, FR-002):
//
//   AS1: "Given a user is creating a new board... they see a clearly labeled control
//   to mark the board as anonymous, defaulted to off."
//   FR-002: "The anonymity choice MUST default to 'not anonymous'..."
//
// react-i18next, framer-motion, and react-router-dom are already mocked globally in
// src/test/setup.ts (t returns the raw key; motion.* map to plain host elements;
// useNavigate returns a no-op vi.fn()) — this file only adds the mocks setup.ts
// doesn't provide: the user context and the backend boards client.
//
// BoardTemplateSelector is stubbed out (as Dashboard.test.tsx also does) because (a)
// it uses `motion.label`, which isn't one of the tags the global framer-motion mock
// maps to a plain host element, and (b) its internals are already covered by its own
// dedicated test file (BoardTemplateSelector.test.tsx) — this file is only concerned
// with CreateBoardFlow's own "details" step.
vi.mock('@/features/create-board/components/BoardTemplateSelector', () => ({
    default: () => <div data-testid="board-template-selector" />,
}));

vi.mock('@/lib/contexts/useUserContext', () => ({
    useUser: () => ({
        user: { uid: 'u1', email: 'u1@example.com', displayName: 'User One' },
        userProfile: { uid: 'u1', displayName: 'User One' },
    }),
}));

vi.mock('@/features/dashboard/services/backendBoardsClient', () => ({
    createBoard: vi.fn(),
}));

const mockedCreateBoard = createBoard as unknown as ReturnType<typeof vi.fn>;

function goToDetailsStep() {
    render(<CreateBoardFlow isOpen onClose={vi.fn()} />);
    // Step 1 ("template") defaults selectedTemplate to 'default', so "Next" can be
    // clicked immediately without interacting with the (stubbed) template selector.
    fireEvent.click(screen.getByText('createBoard.next'));
}

function fillTitleAndSubmit(title = 'Sprint 42 Retro') {
    fireEvent.change(screen.getByPlaceholderText('dashboard.placeholder_boardTitle'), {
        target: { value: title },
    });
    fireEvent.click(screen.getByText('createBoard.create'));
}

describe('CreateBoardFlow — anonymity toggle (051-anonymous-board-mode, US1)', () => {
    beforeEach(() => {
        mockedCreateBoard.mockReset();
        mockedCreateBoard.mockResolvedValue({ boardId: 'new-board-id' });
    });

    it('renders an anonymity toggle in the details step, unchecked by default', () => {
        goToDetailsStep();

        // The exact translation key the eventual implementation picks isn't
        // prescribed anywhere in spec.md/data-model.md — only that the control is
        // "clearly labeled" as an anonymity control (FR-001) — so this matches on
        // any accessible name containing "anonymous", not a specific i18n key.
        const toggle = screen.getByRole('checkbox', { name: /anonymous/i });
        expect(toggle).not.toBeChecked();
    });

    it('calls createBoard() with isAnonymous: false when the toggle is left untouched (FR-002 default)', async () => {
        goToDetailsStep();
        fillTitleAndSubmit();

        await waitFor(() => expect(mockedCreateBoard).toHaveBeenCalled());
        expect(mockedCreateBoard).toHaveBeenCalledWith(expect.objectContaining({ isAnonymous: false }));
    });

    it('calls createBoard() with isAnonymous: true when the toggle is switched on before submitting', async () => {
        goToDetailsStep();

        const toggle = screen.getByRole('checkbox', { name: /anonymous/i });
        fireEvent.click(toggle);

        fillTitleAndSubmit();

        await waitFor(() => expect(mockedCreateBoard).toHaveBeenCalled());
        expect(mockedCreateBoard).toHaveBeenCalledWith(expect.objectContaining({ isAnonymous: true }));
    });
});
