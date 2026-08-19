import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Inbox, SearchX, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/lib/contexts/useUserContext';
import * as backendBoardsClient from '@/features/dashboard/services/backendBoardsClient';
import type { BoardSummary } from '@/features/dashboard/services/backendBoardsClient';
import AuthWrapper from '@/features/auth/components/AuthWrapper';
import BoardRow from '@/features/dashboard/components/BoardRow';
import BoardControlsBar from '@/features/dashboard/components/BoardControlsBar';
import Pagination from '@/features/dashboard/components/Pagination';
import JoinRetrospectiveModal from '@/features/dashboard/components/JoinRetrospectiveModal';
import CreateBoardFlow from '@/features/create-board/components/CreateBoardFlow';
import Button from '@/lib/components/ui/Button';
import toast from 'react-hot-toast';
import { useBoardListQuery, type ScopeFilter, type SortKey, type SortDirection, type TeamFilter } from '@/features/dashboard/hooks/useBoardListQuery';
import { useTeamsQuery } from '@/features/teams/hooks/useTeamsQuery';

/**
 * "Mis Tableros" dashboard — spec 031's Apple HIG-inspired redesign,
 * selected Direction B ("Structured Table"): a single adaptive layout (no
 * grid/list toggle), a real segmented scope-filter control, and pagination
 * that is always rendered whenever a board list is shown — fixing the
 * pre-existing defect (spec 031 FR-012) where page 2+ was unreachable in
 * the old grid view.
 */

const ITEMS_PER_PAGE_DEFAULT = 10;

// Strong ease-out (not framer-motion's default tween easing) for entrance
// motion — occasional-tier (page load, state transitions), per the `animate`
// skill's easing table.
const ENTRANCE_TRANSITION = { duration: 0.25, ease: [0.23, 1, 0.32, 1] as const };

const DashboardPage: React.FC = () => {
    const { user } = useUser();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [boards, setBoards] = useState<BoardSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [showCreateFlow, setShowCreateFlow] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
    const [teamFilter, setTeamFilter] = useState<TeamFilter>('all');
    const [sortKey, setSortKey] = useState<SortKey>('createdAt');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE_DEFAULT);

    // 055-retro-team-association (US2): the viewing user's teams, used to
    // populate BoardControlsBar's team-filter <select>. Reused as-is from
    // feature 054 — not modified here.
    const { teams } = useTeamsQuery();

    const loadUserBoards = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setLoadError(false);
        try {
            const userBoards = await backendBoardsClient.listBoards();
            setBoards(userBoards);
        } catch (error) {
            console.error('Error loading user boards:', error);
            setLoadError(true);
            // `t` is deliberately excluded from the dependency array below: it is
            // read at call-time only, and including it re-creates this callback
            // (and re-fires the effect that calls it) on every render whenever the
            // active i18next instance doesn't hand back a referentially-stable `t`
            // — a regression class this component already has a dedicated test
            // for ("loads user boards exactly once on mount"), per research.md §6.
            toast.error(t('dashboard.error.loadMessage'));
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    useEffect(() => {
        loadUserBoards();
    }, [loadUserBoards]);

    // Reset to page 1 whenever the view of the data changes shape.
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, scopeFilter, teamFilter, sortKey, sortDirection]);

    const { boards: sortedBoards, counts, isEmpty, isNoResults } = useBoardListQuery({
        boards,
        searchText: searchQuery,
        scopeFilter,
        teamFilter,
        sortKey,
        sortDirection,
    });

    const totalPages = Math.max(1, Math.ceil(sortedBoards.length / itemsPerPage));
    const paginatedBoards = sortedBoards.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleSortChange = (newSortKey: SortKey, newSortDirection: SortDirection) => {
        setSortKey(newSortKey);
        setSortDirection(newSortDirection);
    };

    const handleBoardCreated = (boardId: string) => {
        loadUserBoards();
        navigate(`/retro/${boardId}`);
    };

    const handleBoardUpdated = (boardId: string, updates: { title: string }) => {
        setBoards((prev) => prev.map((board) => (board.id === boardId ? { ...board, ...updates } : board)));
    };

    const handleBoardDeleted = (boardId: string) => {
        setBoards((prev) => prev.filter((board) => board.id !== boardId));
    };

    const handleClearSearchAndFilters = () => {
        setSearchQuery('');
        setScopeFilter('all');
        setTeamFilter('all');
    };

    const handleItemsPerPageChange = (value: number) => {
        setItemsPerPage(value);
        setCurrentPage(1);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 flex items-center justify-center transition-colors duration-300">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-info-fg border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-text-secondary">{t('dashboard.loadingBoards')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={ENTRANCE_TRANSITION}
                    className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
                >
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
                            {t('dashboard.title')}
                        </h1>
                        <p className="mt-1 text-sm text-text-secondary sm:text-base">{t('dashboard.subtitle')}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => setShowJoinModal(true)}>
                            <Users className="mr-2 h-4 w-4" />
                            {t('dashboard.joinRetro')}
                        </Button>
                        <Button variant="primary" onClick={() => setShowCreateFlow(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('dashboard.newBoard')}
                        </Button>
                    </div>
                </motion.header>

                <CreateBoardFlow
                    isOpen={showCreateFlow}
                    onClose={() => setShowCreateFlow(false)}
                    onSuccess={handleBoardCreated}
                />
                <JoinRetrospectiveModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} />

                {loadError ? (
                    <div role="alert" className="rounded-xl border border-error-fg/30 bg-error-bg px-6 py-16 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-raised">
                            <AlertTriangle className="h-7 w-7 text-error-fg" />
                        </div>
                        <h2 className="text-lg font-semibold text-error-fg">{t('dashboard.error.title')}</h2>
                        <p className="mt-1 text-sm text-error-fg">{t('dashboard.error.loadMessage')}</p>
                        <Button variant="outline" className="mt-6" onClick={loadUserBoards}>
                            {t('common.retry')}
                        </Button>
                    </div>
                ) : isEmpty ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={ENTRANCE_TRANSITION}
                        className="rounded-xl border border-border-default bg-surface-raised px-6 py-16 text-center"
                    >
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface">
                            <Inbox className="h-7 w-7 text-text-muted" />
                        </div>
                        <h2 className="text-lg font-semibold text-text-secondary">{t('dashboard.noBoards')}</h2>
                        <p className="mx-auto mt-1 max-w-md text-text-muted">{t('dashboard.createFirst')}</p>
                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                            <Button variant="outline" onClick={() => setShowJoinModal(true)}>
                                <Users className="mr-2 h-4 w-4" />
                                {t('dashboard.joinRetro')}
                            </Button>
                            <Button variant="primary" onClick={() => setShowCreateFlow(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                {t('dashboard.createFirst_button')}
                            </Button>
                        </div>
                    </motion.div>
                ) : (
                    <>
                        <BoardControlsBar
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            scopeFilter={scopeFilter}
                            onScopeFilterChange={setScopeFilter}
                            sortKey={sortKey}
                            sortDirection={sortDirection}
                            onSortChange={handleSortChange}
                            counts={counts}
                            teams={teams}
                            teamFilter={teamFilter}
                            onTeamFilterChange={setTeamFilter}
                        />

                        {isNoResults ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={ENTRANCE_TRANSITION}
                                className="rounded-xl border border-border-default bg-surface-raised px-6 py-16 text-center"
                            >
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface">
                                    <SearchX className="h-7 w-7 text-text-muted" />
                                </div>
                                <h2 className="text-lg font-semibold text-text-secondary">{t('dashboard.controls.noResults')}</h2>
                                <Button variant="outline" className="mt-6" onClick={handleClearSearchAndFilters}>
                                    {t('dashboard.controls.clearFilter')}
                                </Button>
                            </motion.div>
                        ) : (
                            <>
                                <div className="overflow-hidden rounded-xl border border-border-default bg-surface-raised">
                                    {/* Column header — wide viewports only; the mobile
                                        stacked layout already labels itself via icons
                                        + role badge. */}
                                    <div className="hidden items-center gap-4 border-b border-border-default bg-surface/60 px-4 py-2 text-xs font-medium uppercase tracking-wide text-text-muted backdrop-blur-sm md:flex">
                                        <span className="min-w-0 flex-1">{t('dashboard.table.columnTitle')}</span>
                                        <span className="w-28 shrink-0">{t('dashboard.table.columnDate')}</span>
                                        <span className="w-24 shrink-0">{t('dashboard.table.columnParticipants')}</span>
                                        <span className="w-28 shrink-0">{t('dashboard.table.columnRole')}</span>
                                        <span className="w-32 shrink-0 text-right">
                                            <span className="sr-only">{t('dashboard.table.columnActions')}</span>
                                        </span>
                                    </div>

                                    {/* AnimatePresence must directly wrap the animated list
                                        for a removed board to exit-animate instead of
                                        vanishing instantly (design audit finding, spec
                                        028: same AnimatePresence-boundary bug class as
                                        DAF-001). Stagger capped at 50ms/item. */}
                                    <ul aria-label={t('dashboard.title')} className="divide-y divide-border-default">
                                        <AnimatePresence initial={false}>
                                            {paginatedBoards.map((board, index) => (
                                                <BoardRow
                                                    key={board.id}
                                                    board={board}
                                                    index={index}
                                                    currentUserId={user?.uid ?? ''}
                                                    onUpdated={handleBoardUpdated}
                                                    onDeleted={handleBoardDeleted}
                                                />
                                            ))}
                                        </AnimatePresence>
                                    </ul>
                                </div>

                                {/* Pagination — structurally always rendered whenever a
                                    board list is shown (single layout, no view-mode
                                    gate), fixing the pre-existing FR-012 defect where it
                                    only appeared in list view. */}
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    itemsPerPage={itemsPerPage}
                                    totalItems={sortedBoards.length}
                                    onPageChange={setCurrentPage}
                                    onItemsPerPageChange={handleItemsPerPageChange}
                                />
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const Dashboard: React.FC = () => {
    return (
        <AuthWrapper requireAuth={true}>
            <DashboardPage />
        </AuthWrapper>
    );
};

export default Dashboard;
