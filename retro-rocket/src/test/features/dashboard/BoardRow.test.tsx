import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import toast from 'react-hot-toast';
import BoardRow from '@/features/dashboard/components/BoardRow';
import type { BoardSummary } from '@/features/dashboard/services/backendBoardsClient';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
    BrowserRouter: ({ children }: any) => children,
    useNavigate: () => mockNavigate,
}));

vi.mock('react-hot-toast', () => ({
    default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/features/dashboard/services/backendBoardsClient', async () => {
    const actual = await vi.importActual<typeof import('@/features/dashboard/services/backendBoardsClient')>(
        '@/features/dashboard/services/backendBoardsClient'
    );
    return { ...actual, deleteBoard: vi.fn() };
});

// react-i18next is globally mocked in src/test/setup.ts with a fixed
// language: 'es'. This file overrides it locally with a *mutable* language
// so the locale-date regression test (FR-016) can prove the rendered date
// actually changes with i18n.language, not just that some value renders.
let mockLanguage = 'es';
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'dashboard.boardCard.deleteSuccess': 'Board deleted successfully',
                'dashboard.boardCard.deleteError': 'Error deleting board',
                'dashboard.boardCard.deleteBoard': 'Delete Board',
                'dashboard.boardCard.deleteConfirmation': 'This action cannot be undone',
                'dashboard.boardCard.deleteButton': 'Delete',
                'dashboard.boardCard.deleteTitle': 'Delete board',
                'dashboard.boardCard.editTitle': 'Edit board',
                'dashboard.boardCard.joined': 'Joined',
                'dashboard.boardCard.creator': 'Creator',
                'dashboard.boardCard.participants': 'participants',
                'dashboard.boardCard.openBoard': 'Open Board',
                'common.cancel': 'Cancel',
            };
            return translations[key] ?? key;
        },
        i18n: { language: mockLanguage, changeLanguage: vi.fn() },
    }),
    I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
    initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

vi.mock('@/features/dashboard/components/EditRetrospectiveModal', () => ({
    default: ({ isOpen }: any) => (isOpen ? <div data-testid="edit-modal" /> : null),
}));

// Captures the animation-relevant props BoardRow passes to motion.li on each
// render — spreading them onto the real DOM <li> (as the old mock did) would
// both warn ("unknown prop") and make them un-assertable. `mock`-prefixed
// per Vitest's vi.mock hoisting rule (see mockNavigate below).
const mockBoardRowMotionProps = vi.fn();
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        li: ({ children, initial, animate, exit, transition, layout, ...domProps }: any) => {
            mockBoardRowMotionProps({ initial, animate, exit, transition, layout });
            return <li {...domProps}>{children}</li>;
        },
    },
    AnimatePresence: ({ children }: any) => children,
}));

vi.mock('@/lib/components/ui/Button', () => ({
    default: ({ children, onClick, loading, disabled, ...props }: any) => (
        <button onClick={onClick} disabled={disabled || loading} {...props}>
            {children}
        </button>
    ),
}));

import { deleteBoard } from '@/features/dashboard/services/backendBoardsClient';

describe('BoardRow', () => {
    const mockOnDeleted = vi.fn();
    const mockOnUpdated = vi.fn();

    const defaultBoard: BoardSummary = {
        id: 'board-1',
        title: 'Test Board',
        description: 'Test board description',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-02'),
        participantCount: 3,
        isActive: true,
        createdBy: 'user-1',
        isCreator: true,
    };

    const currentUserId = 'user-1';

    beforeEach(() => {
        vi.clearAllMocks();
        mockLanguage = 'es';
    });

    const lastMotionProps = () => mockBoardRowMotionProps.mock.calls.at(-1)![0];

    const renderRow = (board = defaultBoard, userId = currentUserId, index = 0) =>
        render(
            <BrowserRouter>
                <ul>
                    <BoardRow
                        board={board}
                        index={index}
                        currentUserId={userId}
                        onDeleted={mockOnDeleted}
                        onUpdated={mockOnUpdated}
                    />
                </ul>
            </BrowserRouter>
        );

    describe('Normal view (FR-002, FR-003)', () => {
        it('renders title and description', () => {
            renderRow();
            expect(screen.getByText('Test Board')).toBeInTheDocument();
            expect(screen.getByText('Test board description')).toBeInTheDocument();
        });

        it('renders without a description when not provided', () => {
            const { description: _d, ...boardWithoutDescription } = defaultBoard;
            renderRow(boardWithoutDescription as BoardSummary);
            expect(screen.getByText('Test Board')).toBeInTheDocument();
            expect(screen.queryByText('Test board description')).not.toBeInTheDocument();
        });

        it('displays participant count', () => {
            const { container } = renderRow();
            expect(container.textContent).toContain('3');
            expect(container.textContent).toContain('participants');
        });

        it('shows creator badge when the user is the creator', () => {
            renderRow();
            expect(screen.getByText('Creator')).toBeInTheDocument();
        });

        it('shows joined badge when the user is not the creator', () => {
            renderRow({ ...defaultBoard, isCreator: false });
            expect(screen.getByText('Joined')).toBeInTheDocument();
        });

        it('truncates long titles/descriptions with a native title attribute exposing the full text', () => {
            const longTitle = 'A'.repeat(200);
            renderRow({ ...defaultBoard, title: longTitle });
            const titleEl = screen.getByText(longTitle);
            expect(titleEl).toHaveAttribute('title', longTitle);
        });
    });

    describe('Locale-aware dates (FR-016 — corrects the hardcoded es-ES defect)', () => {
        it('renders the creation date using the active i18next language, not a fixed locale', () => {
            // Day (5) and month (3) deliberately differ so en-US (MM/DD) and
            // es-ES (DD/MM) field ordering produces visibly different output —
            // a same-day/month date would pass even with a hardcoded locale.
            const board = { ...defaultBoard, createdAt: new Date('2023-03-05T00:00:00Z') };

            mockLanguage = 'es';
            const { unmount } = renderRow(board);
            const esText = screen.getByText(/2023/).textContent;
            unmount();

            mockLanguage = 'en';
            renderRow(board);
            const enText = screen.getByText(/2023/).textContent;

            // Regression guard: a hardcoded 'es-ES' formatter would render
            // identical output regardless of the active language.
            expect(enText).not.toBe(esText);
        });
    });

    describe('Owner-only actions (FR-007, FR-008)', () => {
        it('shows rename and delete controls for the board owner', () => {
            renderRow();
            expect(screen.getByTitle('Edit board')).toBeInTheDocument();
            expect(screen.getByTitle('Delete board')).toBeInTheDocument();
        });

        it('does not show rename or delete controls for a non-owner', () => {
            renderRow(defaultBoard, 'different-user');
            expect(screen.queryByTitle('Edit board')).not.toBeInTheDocument();
            expect(screen.queryByTitle('Delete board')).not.toBeInTheDocument();
        });

        it('never gates action controls behind a hover-only opacity class (FR-015 regression guard)', () => {
            // Unit-level guard only: jsdom doesn't evaluate :hover, so this
            // catches a reintroduced `opacity-0`-style class; real keyboard/
            // touch reachability is verified in e2e (dashboard-manage.spec.ts).
            renderRow();
            const deleteButton = screen.getByTitle('Delete board');
            const editButton = screen.getByTitle('Edit board');
            expect(deleteButton.className).not.toMatch(/opacity-0/);
            expect(editButton.className).not.toMatch(/opacity-0/);
        });

        it('opens the rename modal when the edit control is activated', () => {
            renderRow();
            fireEvent.click(screen.getByTitle('Edit board'));
            expect(screen.getByTestId('edit-modal')).toBeInTheDocument();
        });
    });

    describe('Delete confirmation flow (FR-008)', () => {
        it('shows a confirmation step before deleting, with cancel/confirm', () => {
            renderRow();
            fireEvent.click(screen.getByTitle('Delete board'));

            expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
            expect(screen.getByText('Cancel')).toBeInTheDocument();
            expect(screen.getByText('Delete')).toBeInTheDocument();
        });

        it('returns to the normal view when cancel is clicked', () => {
            renderRow();
            fireEvent.click(screen.getByTitle('Delete board'));
            fireEvent.click(screen.getByText('Cancel'));

            expect(screen.queryByText('This action cannot be undone')).not.toBeInTheDocument();
            expect(screen.getByText('Test Board')).toBeInTheDocument();
        });

        it('calls deleteBoard, shows a success toast, and calls onDeleted on success', async () => {
            vi.mocked(deleteBoard).mockResolvedValueOnce(undefined);
            renderRow();

            fireEvent.click(screen.getByTitle('Delete board'));
            fireEvent.click(screen.getByText('Delete'));

            await waitFor(() => {
                expect(deleteBoard).toHaveBeenCalledWith('board-1');
                expect(toast.success).toHaveBeenCalledWith('Board deleted successfully');
                expect(mockOnDeleted).toHaveBeenCalledWith('board-1');
            });
        });

        it('shows an error toast and stays in the confirmation view when delete fails', async () => {
            vi.mocked(deleteBoard).mockRejectedValueOnce(new Error('Delete failed'));
            renderRow();

            fireEvent.click(screen.getByTitle('Delete board'));
            fireEvent.click(screen.getByText('Delete'));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Delete failed');
            });
            expect(mockOnDeleted).not.toHaveBeenCalled();
        });
    });

    describe('Navigation (FR-006)', () => {
        it('navigates to the board when opened', () => {
            renderRow();
            fireEvent.click(screen.getByText('Test Board'));
            expect(mockNavigate).toHaveBeenCalledWith('/retro/board-1');
        });
    });

    describe('Edge cases', () => {
        it('handles zero participants', () => {
            const { container } = renderRow({ ...defaultBoard, participantCount: 0 });
            expect(container.textContent).toContain('0');
            expect(container.textContent).toContain('participants');
        });

        it('handles a missing optional description without crashing', () => {
            const minimalBoard: BoardSummary = {
                id: 'board-2',
                title: 'Minimal Board',
                description: '',
                createdAt: new Date('2023-01-01'),
                updatedAt: new Date('2023-01-01'),
                participantCount: 1,
                isActive: true,
                createdBy: 'user-1',
                isCreator: true,
            };
            renderRow(minimalBoard);
            expect(screen.getByText('Minimal Board')).toBeInTheDocument();
        });
    });

    // research.md R1/R2 (spec 032): the pre-fix code applied one shared
    // `transition` object to mount, `layout` reflow, and `exit` alike, so
    // rows leaving the table (filter/sort/page changes) inherited an
    // entrance-shaped stagger delay before they even started fading, and
    // reflowing rows replayed that same delay instead of moving together as
    // one update. These tests pin the fix: layout/exit must never carry the
    // index-based entrance delay, while the true mount entrance keeps it.
    describe('Row transition split by purpose (research.md R1/R2, FR-001–FR-005, FR-010)', () => {
        it('gives the layout reflow transition no entrance delay, regardless of row index', () => {
            renderRow(defaultBoard, currentUserId, 6); // index 6 → 0.3s if the entrance delay leaked in
            const { transition } = lastMotionProps();
            expect(transition?.layout).toBeDefined();
            expect(transition.layout.delay ?? 0).toBe(0);
        });

        it("gives the exit transition its own config with no inherited entrance delay", () => {
            renderRow(defaultBoard, currentUserId, 6);
            const { exit } = lastMotionProps();
            expect(exit?.transition).toBeDefined();
            expect(exit.transition.delay ?? 0).toBe(0);
        });

        it('keeps the exit transition faster than the mount entrance duration', () => {
            renderRow();
            const { exit, transition } = lastMotionProps();
            const entranceDuration = transition.default?.duration ?? transition.duration;
            expect(exit.transition.duration).toBeLessThan(entranceDuration);
        });

        it('still applies the existing index-based stagger delay to the true mount entrance', () => {
            renderRow(defaultBoard, currentUserId, 4); // 4 * 0.05 = 0.2
            const { transition } = lastMotionProps();
            const entranceDelay = transition.default?.delay ?? transition.delay;
            expect(entranceDelay).toBeCloseTo(0.2);
        });

        it('caps the mount entrance stagger delay at 0.3s for high indices, unchanged from before', () => {
            renderRow(defaultBoard, currentUserId, 50);
            const { transition } = lastMotionProps();
            const entranceDelay = transition.default?.delay ?? transition.delay;
            expect(entranceDelay).toBe(0.3);
        });

        it('does not change the animated properties, and keeps entrance/exit on the same ease-out curve', () => {
            renderRow();
            const { initial, animate, exit, transition } = lastMotionProps();
            expect(initial).toEqual({ opacity: 0, y: 8 });
            expect(animate).toEqual({ opacity: 1, y: 0 });
            expect(exit.opacity).toBe(0);
            const entranceEase = transition.default?.ease ?? transition.ease;
            expect(entranceEase).toEqual([0.23, 1, 0.32, 1]);
            expect(exit.transition.ease).toEqual([0.23, 1, 0.32, 1]);
        });

        it('gives the layout reflow its own ease-in-out curve — on-screen movement, not an entrance/exit (animate skill decision)', () => {
            renderRow();
            const { transition } = lastMotionProps();
            // Deliberately distinct from the entrance/exit ease-out curve:
            // a row reflowing to a new slot is "moving on screen," which
            // the animate skill's easing table scopes to ease-in-out.
            expect(transition.layout.ease).toEqual([0.77, 0, 0.175, 1]);
        });
    });

    // research.md R4: reduced motion is already handled app-wide by
    // <MotionConfig reducedMotion="user"> in src/App.tsx, which snaps
    // framer-motion's transform-driven values (this row's `y`/`layout`
    // shift) instantly while still animating opacity. BoardRow must not
    // duplicate that with its own prefers-reduced-motion branch — doing so
    // would risk diverging from the app-root behavior confirmed in R4.
    describe('Reduced motion delegation (research.md R4 — MotionConfig handles this app-wide)', () => {
        it('does not read prefers-reduced-motion itself — no local reduced-motion hook is imported', () => {
            const source = readFileSync(
                path.resolve(__dirname, '../../../features/dashboard/components/BoardRow.tsx'),
                'utf-8'
            );
            expect(source).not.toMatch(/useReducedMotion/);
        });

        it('renders the same static transition/exit shape regardless of row index — no conditional branching to diverge from MotionConfig', () => {
            renderRow(defaultBoard, currentUserId, 1);
            const first = lastMotionProps();
            renderRow(defaultBoard, currentUserId, 1);
            const second = lastMotionProps();
            expect(second).toEqual(first);
        });
    });
});
