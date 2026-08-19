import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, Users, ArrowRight, Crown, UserPlus, Building2, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Button from '@/lib/components/ui/Button';
import EditRetrospectiveModal from '@/features/dashboard/components/EditRetrospectiveModal';
import { deleteBoard } from '@/features/dashboard/services/backendBoardsClient';
import type { BoardSummary } from '@/features/dashboard/services/backendBoardsClient';
import { formatLocalizedDate } from '@/lib/utils/localeDate';

/**
 * A single board row in the "Mis Tableros" dashboard's Structured Table
 * layout (spec 031, selected Direction B). Replaces the pre-redesign
 * BoardCard.tsx/BoardListItem.tsx pair — Direction B has one single adaptive
 * layout (no grid/list toggle), so one row component now covers what used
 * to be two.
 *
 * Rename/delete controls for owned boards are a persistent, always-visible
 * icon-button cluster — never hover-gated (fixes the pre-existing FR-015
 * defect; see research.md §4).
 */

export interface BoardRowProps {
    board: BoardSummary;
    index: number;
    currentUserId: string;
    onUpdated: (boardId: string, updates: { title: string }) => void;
    onDeleted: (boardId: string) => void;
}

// Strong ease-out (animate skill's easing table) for entering/exiting motion —
// the row's true first-mount entrance and its exit when removed by a
// filter/sort/page change.
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
// Strong ease-in-out for movement already on screen — a row's `layout` FLIP
// reflow when sibling rows are added/removed is repositioning, not
// entering/exiting, so it takes the "moving/morphing on screen" curve
// instead of the entrance/exit ease-out (spec 032 research.md R2).
const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;

const BoardRow: React.FC<BoardRowProps> = ({ board, index, currentUserId, onUpdated, onDeleted }) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const isOwner = board.createdBy === currentUserId;
    const dateLabel = formatLocalizedDate(board.createdAt, i18n.language, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

    const handleOpen = () => navigate(`/retro/${board.id}`);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteBoard(board.id);
            toast.success(t('dashboard.boardCard.deleteSuccess'));
            onDeleted(board.id);
        } catch (error: unknown) {
            console.error('Error deleting board:', error);
            const message = error instanceof Error ? error.message : undefined;
            toast.error(message || t('dashboard.boardCard.deleteError'));
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <motion.li
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            // Own transition, undelayed and faster than the mount entrance —
            // a row leaving no longer inherits the entrance stagger (the
            // root cause of the "crude" exit lag; research.md R1/R2).
            exit={{ opacity: 0, transition: { duration: 0.15, ease: EASE_OUT } }}
            transition={{
                // Applies to initial→animate (the true first-mount entrance)
                // only — `layout` below overrides this for FLIP reflows.
                default: { delay: Math.min(index * 0.05, 0.3), duration: 0.2, ease: EASE_OUT },
                // Undelayed: a row reflowing into a new slot after a
                // filter/sort/page change is one coordinated move, not a
                // sequence of individually-staggered reveals.
                layout: { duration: 0.18, ease: EASE_IN_OUT },
            }}
            className="px-4 py-3 transition-colors hover:bg-surface focus-within:bg-surface"
        >
            {showDeleteConfirm ? (
                <div className="flex w-full flex-col gap-3 rounded-lg bg-error-bg px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-2 text-sm text-error-fg">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0">
                            <strong className="break-words">&ldquo;{board.title}&rdquo;</strong> &mdash;{' '}
                            {t('dashboard.boardCard.deleteConfirmation')}
                        </span>
                    </div>
                    <div className="flex shrink-0 gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                            {t('common.cancel')}
                        </Button>
                        <Button variant="danger" size="sm" onClick={handleDelete} loading={isDeleting}>
                            <Trash2 className="mr-1.5 h-4 w-4" />
                            {t('dashboard.boardCard.deleteButton')}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                    {/* Title + description — the primary, keyboard-reachable open action */}
                    <button
                        type="button"
                        onClick={handleOpen}
                        title={t('dashboard.boardCard.openBoard')}
                        className="-mx-1 min-w-0 flex-1 rounded-md px-1 py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                        <span
                            className="block truncate text-sm font-medium text-text-primary md:text-[0.925rem]"
                            title={board.title}
                        >
                            {board.title}
                        </span>
                        {board.description && (
                            <span className="block truncate text-xs text-text-muted" title={board.description}>
                                {board.description}
                            </span>
                        )}
                    </button>

                    {/* Metadata columns — reflow into one wrapped row on mobile via
                        `md:contents`: at md+ each child becomes its own flex item in
                        the row above (real columns); below md they stay grouped under
                        the title as a single wrapped line. Same markup, CSS-only. */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted md:contents">
                        <span
                            data-testid="board-date"
                            className="inline-flex items-center gap-1.5 md:w-28 md:shrink-0"
                            title={dateLabel}
                        >
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            {dateLabel}
                        </span>
                        <span className="inline-flex items-center gap-1.5 md:w-24 md:shrink-0">
                            <Users className="h-3.5 w-3.5 shrink-0" />
                            {board.participantCount} <span className="md:hidden">{t('dashboard.boardCard.participants')}</span>
                        </span>
                        <span
                            className={clsx(
                                'inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium md:w-28 md:shrink-0 md:justify-center',
                                board.isCreator ? 'bg-warning-bg text-warning-fg' : 'bg-info-bg text-info-fg'
                            )}
                        >
                            {board.isCreator ? <Crown className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                            {board.isCreator ? t('dashboard.boardCard.creator') : t('dashboard.boardCard.joined')}
                        </span>
                        {/* 055-retro-team-association: dashboard-only team indicator (never shown
                            inside an open session — see backendBoardsClient.ts's teamName comment).
                            Uses the `success` token pair (already used app-wide for a "linked/
                            connected" status, e.g. LinkedProvidersCard) and a distinct Building2
                            icon so it's never confusable with the warning/info role badge next to
                            it. Icon + visible text — never color alone (WCAG 2.1 AA). Rendered only
                            when a team name is present, matching the locked BoardRow.test.tsx spec. */}
                        {board.teamName && (
                            <span
                                data-testid="board-team-badge"
                                title={t('dashboard.boardCard.team', { name: board.teamName })}
                                aria-label={t('dashboard.boardCard.team', { name: board.teamName })}
                                className="inline-flex w-fit max-w-[9rem] items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success-fg md:max-w-[8rem] md:shrink-0"
                            >
                                <Building2 className="h-3 w-3 shrink-0" />
                                <span className="truncate">{board.teamName}</span>
                            </span>
                        )}
                    </div>

                    {/* Always-visible action cluster — never hover-gated (FR-015). */}
                    <div className="flex shrink-0 items-center justify-end gap-1 md:w-32">
                        {isOwner && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(true)}
                                    className="rounded-md p-1.5 text-text-muted hover:bg-info-bg hover:text-info-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                                    title={t('dashboard.boardCard.editTitle')}
                                    aria-label={t('dashboard.boardCard.editTitle')}
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="rounded-md p-1.5 text-text-muted hover:bg-error-bg hover:text-error-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                                    title={t('dashboard.boardCard.deleteTitle')}
                                    aria-label={t('dashboard.boardCard.deleteTitle')}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </>
                        )}
                        <button
                            type="button"
                            onClick={handleOpen}
                            className="rounded-md p-1.5 text-text-muted hover:bg-action hover:text-text-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                            title={t('dashboard.boardCard.openBoard')}
                            aria-label={t('dashboard.boardCard.openBoard')}
                        >
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            <EditRetrospectiveModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                board={board}
                onBoardUpdated={(boardId, updates) => {
                    onUpdated(boardId, updates);
                    setShowEditModal(false);
                }}
            />
        </motion.li>
    );
};

export default BoardRow;
