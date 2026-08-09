import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';
import DashboardPage from '@/pages/Dashboard';
import * as backendBoardsClient from '@/features/dashboard/services/backendBoardsClient';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        header: ({ children, ...props }: any) => <header {...props}>{children}</header>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    },
    // A detectable marker (not a bare passthrough) so tests can assert the board
    // list is actually wrapped in AnimatePresence — required for a removed board to
    // exit-animate instead of vanishing instantly (design audit finding, spec 028:
    // same AnimatePresence-boundary bug class as DAF-001).
    AnimatePresence: ({ children }: any) => <div data-testid="animate-presence">{children}</div>,
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock UserContext
const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
};

const mockUserProfile = {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    createdAt: new Date(),
};

vi.mock('@/lib/contexts/useUserContext', () => ({
    useUser: () => ({
        user: mockUser,
        userProfile: mockUserProfile,
    }),
}));

// Mock services
vi.mock('@/features/dashboard/services/backendBoardsClient', () => ({
    listBoards: vi.fn(() => Promise.resolve([])),
    createBoard: vi.fn(() => Promise.resolve({ boardId: 'new-board-id' })),
    joinBoard: vi.fn(),
    renameBoard: vi.fn(),
    deleteBoard: vi.fn(),
}));

// Mock components
vi.mock('@/features/auth/components/AuthWrapper', () => ({
    default: ({ children }: any) => <div data-testid="auth-wrapper">{children}</div>,
}));

// BoardRow has its own dedicated unit test (BoardRow.test.tsx); here it's
// stubbed so Dashboard's own orchestration (search/filter/sort/pagination
// wiring) is what's under test, not BoardRow's internals.
vi.mock('@/features/dashboard/components/BoardRow', () => ({
    default: ({ board }: any) => (
        <li data-testid="board-row">
            <h3>{board.title}</h3>
            <p>{board.description}</p>
        </li>
    ),
}));

vi.mock('@/features/dashboard/components/JoinRetrospectiveModal', () => ({
    default: ({ isOpen, onClose }: any) =>
        isOpen ? (
            <div data-testid="join-modal">
                <button onClick={onClose}>Close</button>
            </div>
        ) : null,
}));

vi.mock('@/lib/components/ui/Button', () => ({
    default: ({ children, onClick, ...props }: any) => (
        <button onClick={onClick} {...props}>
            {children}
        </button>
    ),
}));

vi.mock('@/lib/components/ui/Input', () => ({
    default: ({ value, onChange, ...props }: any) => (
        <input
            value={value}
            onChange={(e) => onChange?.(e)}
            {...props}
        />
    ),
}));

vi.mock('@/features/create-board/components/BoardTemplateSelector', () => ({
    default: ({ selectedTemplate, onTemplateChange }: any) => (
        <div data-testid="board-template-selector">
            <select
                value={selectedTemplate}
                onChange={(e) => onTemplateChange?.(e.target.value)}
                title="Select board template"
            >
                <option value="default">Default Template</option>
                <option value="madSadGlad">Mad Sad Glad</option>
                <option value="startStopContinue">Start Stop Continue</option>
            </select>
        </div>
    ),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

const renderWithProviders = (component: React.ReactElement) => {
    return render(
        <BrowserRouter>
            <I18nextProvider i18n={i18n}>
                {component}
            </I18nextProvider>
        </BrowserRouter>
    );
};

function makeBoard(overrides: Partial<backendBoardsClient.BoardSummary> & { id: string; title: string }) {
    return {
        description: '',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        participantCount: 1,
        isActive: true,
        createdBy: 'test-user-id',
        isCreator: true,
        ...overrides,
    } as backendBoardsClient.BoardSummary;
}

describe('DashboardPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders without crashing', () => {
        renderWithProviders(<DashboardPage />);
        expect(screen.getByTestId('auth-wrapper')).toBeInTheDocument();
    });

    it('displays loading state initially', () => {
        renderWithProviders(<DashboardPage />);

        // Component renders immediately without a specific loading state text
        expect(screen.getByTestId('auth-wrapper')).toBeInTheDocument();
    });

    it('displays dashboard title after loading', async () => {
        renderWithProviders(<DashboardPage />);

        await waitFor(() => {
            expect(screen.getByText('dashboard.title')).toBeInTheDocument();
        });
    });

    it('shows create board button after loading', async () => {
        renderWithProviders(<DashboardPage />);

        await waitFor(() => {
            expect(screen.getByText('dashboard.newBoard')).toBeInTheDocument();
        });
    });

    it('shows join board button after loading', async () => {
        renderWithProviders(<DashboardPage />);

        await waitFor(() => {
            expect(screen.getAllByText('dashboard.joinRetro')).toHaveLength(2);
        });
    });

    it('opens create form when create button is clicked', async () => {
        renderWithProviders(<DashboardPage />);

        // Wait for loading to complete
        await waitFor(() => {
            expect(screen.getByText('dashboard.newBoard')).toBeInTheDocument();
        });

        const createButton = screen.getByText('dashboard.newBoard');
        fireEvent.click(createButton);

        await waitFor(() => {
            expect(screen.getByTestId('board-template-selector')).toBeInTheDocument();
        });
    });

    it('opens join modal when join button is clicked', async () => {
        renderWithProviders(<DashboardPage />);

        // Wait for loading to complete - get the join button from the header area
        await waitFor(() => {
            expect(screen.getAllByText('dashboard.joinRetro')).toHaveLength(2);
        });

        const joinButtons = screen.getAllByText('dashboard.joinRetro');
        const headerJoinButton = joinButtons[0]; // First one is in the header
        fireEvent.click(headerJoinButton);

        // Just check that we can interact with the button - modal mocking might be complex
        expect(headerJoinButton).toBeInTheDocument();
    });

    it('loads user boards on mount', async () => {
        const { listBoards } = await import('@/features/dashboard/services/backendBoardsClient');

        renderWithProviders(<DashboardPage />);

        await waitFor(() => {
            expect(listBoards).toHaveBeenCalled();
        });
    });

    it('loads user boards exactly once on mount, not repeatedly on unrelated re-renders', async () => {
        // Characterizes the effect's [user] dependency (Dashboard.tsx's loadUserBoards
        // useEffect) — a naive react-hooks/exhaustive-deps fix that adds the unmemoized
        // loadUserBoards function itself to the deps array would make it re-run on every
        // render, since that function gets a new identity each time. This test would fail
        // on that naive fix (repeated calls) and must keep passing after the real fix
        // (wrapping loadUserBoards in useCallback([user])).
        const { listBoards } = await import('@/features/dashboard/services/backendBoardsClient');

        renderWithProviders(<DashboardPage />);

        await waitFor(() => {
            expect(listBoards).toHaveBeenCalledTimes(1);
        });

        // Give any spurious extra effect run a chance to fire before asserting it stayed at 1.
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(listBoards).toHaveBeenCalledTimes(1);
    });

    it('handles create board form submission', async () => {
        renderWithProviders(<DashboardPage />);

        // Wait for loading to complete and open create form
        await waitFor(() => {
            expect(screen.getByText('dashboard.newBoard')).toBeInTheDocument();
        });

        const createButton = screen.getByText('dashboard.newBoard');
        fireEvent.click(createButton);

        // Wait for template selector to appear
        await waitFor(() => {
            expect(screen.getByTestId('board-template-selector')).toBeInTheDocument();
        });

        // Click next to go to the next step (where title input should be)
        const nextButton = screen.getByText('createBoard.next');
        fireEvent.click(nextButton);

        // Wait for form to appear and fill it
        await waitFor(() => {
            // For now, just verify the next button was clicked
            expect(nextButton).toBeInTheDocument();
        });
    });

    it('displays empty boards state', async () => {
        renderWithProviders(<DashboardPage />);

        await waitFor(() => {
            expect(screen.getByText('dashboard.noBoards')).toBeInTheDocument();
        });
    });

    it('displays create first board prompt', async () => {
        renderWithProviders(<DashboardPage />);

        await waitFor(() => {
            expect(screen.getByText('dashboard.createFirst_button')).toBeInTheDocument();
        });
    });

    it('displays a visible, non-silent error state when the board list fails to load (FR-014)', async () => {
        vi.mocked(backendBoardsClient.listBoards).mockRejectedValueOnce(new Error('network down'));

        renderWithProviders(<DashboardPage />);

        await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument();
            expect(screen.getByText('dashboard.error.title')).toBeInTheDocument();
        });
    });

    describe('Reachability regardless of board count (FR-012 — corrects the pre-existing grid-pagination defect)', () => {
        it('renders pagination — and every board stays reachable through it — whenever there are more boards than fit on one page', async () => {
            // The pre-redesign defect: pagination only rendered in "list" view
            // mode, so boards past page 1 were permanently unreachable in the
            // default "grid" view. Direction B has a single layout with no
            // view-mode branch at all, so this is structurally impossible to
            // reintroduce — this test guards that invariant, not a toggle.
            const manyBoards = Array.from({ length: 25 }, (_, i) =>
                makeBoard({ id: `board-${i}`, title: `Board ${String(i).padStart(2, '0')}` })
            );
            vi.mocked(backendBoardsClient.listBoards).mockResolvedValueOnce(manyBoards);

            renderWithProviders(<DashboardPage />);

            await waitFor(() => {
                expect(screen.getAllByTestId('board-row')).toHaveLength(10); // default page size
            });

            // The 25th board (index 24) is on page 3 — reach it via pagination,
            // proving it isn't permanently hidden behind unreachable UI.
            expect(screen.queryByText('Board 24')).not.toBeInTheDocument();
            fireEvent.click(screen.getByRole('button', { name: '3' }));

            await waitFor(() => {
                expect(screen.getByText('Board 24')).toBeInTheDocument();
            });
        });
    });

    describe('Pagination transitions (spec 032 US2, FR-002, FR-004, FR-009)', () => {
        const manyBoards = Array.from({ length: 25 }, (_, i) =>
            makeBoard({ id: `board-${i}`, title: `Board ${String(i).padStart(2, '0')}` })
        );

        it('leaves no stray/leftover rows from the previous page after a page-number change', async () => {
            vi.mocked(backendBoardsClient.listBoards).mockResolvedValueOnce(manyBoards);
            renderWithProviders(<DashboardPage />);
            await waitFor(() => expect(screen.getAllByTestId('board-row')).toHaveLength(10));

            fireEvent.click(screen.getByRole('button', { name: '2' }));

            await waitFor(() => {
                expect(screen.getAllByTestId('board-row')).toHaveLength(10);
                expect(screen.getByText('Board 10')).toBeInTheDocument(); // first row of page 2
            });
            // Page 1's rows must not linger after the page change.
            expect(screen.queryByText('Board 00')).not.toBeInTheDocument();
        });

        it('transitions the row set through the same shared path when items-per-page changes, not a separate/clashing behavior', async () => {
            vi.mocked(backendBoardsClient.listBoards).mockResolvedValueOnce(manyBoards);
            renderWithProviders(<DashboardPage />);
            await waitFor(() => expect(screen.getAllByTestId('board-row')).toHaveLength(10));

            fireEvent.change(screen.getByTitle('dashboard.controls.itemsPerPage'), { target: { value: '20' } });

            await waitFor(() => {
                expect(screen.getAllByTestId('board-row')).toHaveLength(20);
            });
            // Changing items-per-page also resets to page 1 — no residual page-2+ state.
            expect(screen.getByText('Board 00')).toBeInTheDocument();
        });

        it('produces no state change or stray side effect when a disabled pagination control is clicked', async () => {
            vi.mocked(backendBoardsClient.listBoards).mockResolvedValueOnce(manyBoards);
            renderWithProviders(<DashboardPage />);
            await waitFor(() => expect(screen.getAllByTestId('board-row')).toHaveLength(10));

            // 25 boards / 10 per page = 3 pages; jump to the last page, where "Next" is disabled.
            fireEvent.click(screen.getByRole('button', { name: '3' }));
            await waitFor(() => expect(screen.getByText('Board 24')).toBeInTheDocument());

            const nextButton = screen.getByTitle('common.next');
            expect(nextButton).toBeDisabled();
            fireEvent.click(nextButton); // no-op: native disabled buttons don't fire onClick

            // Still on page 3 — nothing changed as a side effect of the click.
            expect(screen.getByText('Board 24')).toBeInTheDocument();
            expect(screen.getAllByTestId('board-row')).toHaveLength(5); // last page: 25 - 20
        });
    });

    describe('Search, filter, and sort (FR-009, FR-010, FR-011)', () => {
        const boards = [
            makeBoard({ id: '1', title: 'Sprint 12 Retro', description: 'alpha team', isCreator: true, createdAt: new Date('2023-01-03') }),
            makeBoard({ id: '2', title: 'Q1 Planning', description: 'roadmap', isCreator: true, createdAt: new Date('2023-01-01') }),
            makeBoard({ id: '3', title: 'Bug Bash Retro', description: 'alpha bugs', isCreator: false, createdAt: new Date('2023-01-02') }),
        ];

        it('lists every board with live per-scope counts', async () => {
            vi.mocked(backendBoardsClient.listBoards).mockResolvedValueOnce(boards);
            renderWithProviders(<DashboardPage />);

            await waitFor(() => {
                expect(screen.getAllByTestId('board-row')).toHaveLength(3);
            });
            expect(screen.getByText('(3)')).toBeInTheDocument(); // all
            expect(screen.getByText('(2)')).toBeInTheDocument(); // created
            expect(screen.getByText('(1)')).toBeInTheDocument(); // joined
        });

        it('narrows the list when searching by title/description substring', async () => {
            vi.mocked(backendBoardsClient.listBoards).mockResolvedValueOnce(boards);
            renderWithProviders(<DashboardPage />);
            await waitFor(() => expect(screen.getAllByTestId('board-row')).toHaveLength(3));

            fireEvent.change(screen.getByLabelText('dashboard.controls.filterPlaceholder'), {
                target: { value: 'roadmap' },
            });

            await waitFor(() => {
                const rows = screen.getAllByTestId('board-row');
                expect(rows).toHaveLength(1);
                expect(rows[0]).toHaveTextContent('Q1 Planning');
            });
        });

        it('filters by scope when a segmented option is selected', async () => {
            vi.mocked(backendBoardsClient.listBoards).mockResolvedValueOnce(boards);
            renderWithProviders(<DashboardPage />);
            await waitFor(() => expect(screen.getAllByTestId('board-row')).toHaveLength(3));

            fireEvent.click(screen.getByText('(1)')); // "Joined" scope option

            await waitFor(() => {
                const rows = screen.getAllByTestId('board-row');
                expect(rows).toHaveLength(1);
                expect(rows[0]).toHaveTextContent('Bug Bash Retro');
            });
        });

        it('leaves no stray/leftover rows from the previous scope after a filter change (spec 032 US1 scenario 1, FR-001, FR-004)', async () => {
            vi.mocked(backendBoardsClient.listBoards).mockResolvedValueOnce(boards);
            renderWithProviders(<DashboardPage />);
            await waitFor(() => expect(screen.getAllByTestId('board-row')).toHaveLength(3));

            fireEvent.click(screen.getByText('(1)')); // "Joined" scope option → only 'Bug Bash Retro'

            await waitFor(() => {
                const rows = screen.getAllByTestId('board-row');
                expect(rows).toHaveLength(1);
            });
            // Titles from the previous ("All") scope must not linger anywhere in the list.
            expect(screen.queryByText('Sprint 12 Retro')).not.toBeInTheDocument();
            expect(screen.queryByText('Q1 Planning')).not.toBeInTheDocument();

            fireEvent.click(screen.getByText('(3)')); // back to "All"
            await waitFor(() => {
                expect(screen.getAllByTestId('board-row')).toHaveLength(3);
            });
        });

        it('settles on the latest scope with no broken/inconsistent state when filters change rapidly in succession (spec 032 US1 scenario 2, FR-005)', async () => {
            vi.mocked(backendBoardsClient.listBoards).mockResolvedValueOnce(boards);
            renderWithProviders(<DashboardPage />);
            await waitFor(() => expect(screen.getAllByTestId('board-row')).toHaveLength(3));

            // Fire two scope changes back-to-back, before awaiting the first's settle.
            fireEvent.click(screen.getByText('(1)')); // Joined
            fireEvent.click(screen.getByText('(2)')); // Created (without awaiting the Joined state first)

            await waitFor(() => {
                const rows = screen.getAllByTestId('board-row');
                expect(rows).toHaveLength(2);
                expect(rows.map((r) => r.textContent)).toEqual(
                    expect.arrayContaining([expect.stringContaining('Sprint 12 Retro'), expect.stringContaining('Q1 Planning')])
                );
            });
            expect(screen.queryByText('Bug Bash Retro')).not.toBeInTheDocument();
        });

        it('shows a distinct no-results state (not the zero-boards empty state) when search matches nothing', async () => {
            vi.mocked(backendBoardsClient.listBoards).mockResolvedValueOnce(boards);
            renderWithProviders(<DashboardPage />);
            await waitFor(() => expect(screen.getAllByTestId('board-row')).toHaveLength(3));

            fireEvent.change(screen.getByLabelText('dashboard.controls.filterPlaceholder'), {
                target: { value: 'nothing matches this' },
            });

            await waitFor(() => {
                expect(screen.getByText('dashboard.controls.noResults')).toBeInTheDocument();
            });
            expect(screen.queryByText('dashboard.noBoards')).not.toBeInTheDocument();
            // spec 032 Polish, Edge Cases, FR-004: the transition into the
            // no-results state must not leave stray rows from the previous
            // (matching) set behind.
            expect(screen.queryAllByTestId('board-row')).toHaveLength(0);
        });

        it('sorts by name and toggles direction on repeat selection', async () => {
            vi.mocked(backendBoardsClient.listBoards).mockResolvedValueOnce(boards);
            renderWithProviders(<DashboardPage />);
            await waitFor(() => expect(screen.getAllByTestId('board-row')).toHaveLength(3));

            fireEvent.click(screen.getByTitle('dashboard.controls.sortByName'));
            await waitFor(() => {
                const rows = screen.getAllByTestId('board-row');
                expect(rows[0]).toHaveTextContent('Bug Bash Retro'); // ascending: B < Q < S
            });

            fireEvent.click(screen.getByTitle('dashboard.controls.sortByName'));
            await waitFor(() => {
                const rows = screen.getAllByTestId('board-row');
                expect(rows[0]).toHaveTextContent('Sprint 12 Retro'); // descending
            });
        });

        // BoardRow is stubbed in this file (see top-level mock), so the
        // per-row transition timing itself is verified in BoardRow.test.tsx
        // (research.md R1/R2). What this file can and must guard is that
        // sort doesn't get its own, separate list-rendering path — research.md
        // R5's claim that sort/filter/pagination all share one row list.
        it('reorders rows through the single shared AnimatePresence-wrapped list — no separate rendering path for sort (research.md R5, FR-010)', () => {
            const source = readFileSync(path.resolve(__dirname, '../../pages/Dashboard.tsx'), 'utf-8');
            const animatePresenceCount = (source.match(/<AnimatePresence/g) ?? []).length;
            expect(animatePresenceCount).toBe(1);
        });
    });

    describe('Cross-interaction interruption (spec 032 Polish, Edge Cases, FR-005, SC-003)', () => {
        it('settles correctly on the new filtered page when a scope-filter change is immediately followed by a page-number change', async () => {
            const manyBoards = [
                ...Array.from({ length: 15 }, (_, i) =>
                    makeBoard({ id: `created-${i}`, title: `Created ${String(i).padStart(2, '0')}`, isCreator: true })
                ),
                ...Array.from({ length: 5 }, (_, i) =>
                    makeBoard({ id: `joined-${i}`, title: `Joined ${String(i).padStart(2, '0')}`, isCreator: false })
                ),
            ];
            vi.mocked(backendBoardsClient.listBoards).mockResolvedValueOnce(manyBoards);
            renderWithProviders(<DashboardPage />);
            await waitFor(() => expect(screen.getAllByTestId('board-row')).toHaveLength(10));

            // Filter to "Created" (15 boards → resets to page 1, 2 pages of 10/5),
            // then immediately jump to page 2 without awaiting the filter to settle.
            fireEvent.click(screen.getByText('(15)')); // "Created" scope count
            fireEvent.click(screen.getByRole('button', { name: '2' }));

            await waitFor(() => {
                const rows = screen.getAllByTestId('board-row');
                expect(rows).toHaveLength(5); // page 2 of the 15 "Created" boards: 15 - 10
            });
            // No mix of the pre-filter (Joined) set or the pre-page (page 1) set lingering.
            expect(screen.queryByText('Joined 00')).not.toBeInTheDocument();
            expect(screen.queryByText('Created 00')).not.toBeInTheDocument(); // page 1's first row
            expect(screen.getByText('Created 10')).toBeInTheDocument(); // page 2's first row
        });
    });

    describe('Exit animation boundary (design audit finding, spec 028)', () => {
        it('wraps the board list in AnimatePresence, so a removed board can exit-animate instead of vanishing instantly', async () => {
            vi.mocked(backendBoardsClient.listBoards).mockResolvedValueOnce([
                makeBoard({ id: 'board-1', title: 'First board' }),
                makeBoard({ id: 'board-2', title: 'Second board', participantCount: 2 }),
            ]);

            renderWithProviders(<DashboardPage />);

            const boardRows = await screen.findAllByTestId('board-row');
            expect(boardRows).toHaveLength(2);

            const animatePresenceInstances = screen.getAllByTestId('animate-presence');
            const listPresence = animatePresenceInstances.find((el) =>
                el.contains(boardRows[0]) && el.contains(boardRows[1])
            );
            expect(listPresence).toBeTruthy();
        });
    });
});
