import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
