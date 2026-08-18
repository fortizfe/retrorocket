import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '@/lib/components/ui/Button';
import Loading from '@/lib/components/ui/Loading';
import RetrospectiveBoard from '@/features/boards/retrospective/components/RetrospectiveBoard';
import AuthWrapper from '@/features/auth/components/AuthWrapper';
import { useRetrospectiveRealtimeSync } from '@/features/boards/retrospective/hooks/useRetrospectiveRealtimeSync';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { Card, CardGroup } from '@/features/boards/types/card';
import { ActionItem } from '@/features/boards/types/actionItem';
import { Retrospective } from '@/features/boards/types/retrospective';
// ...existing code...

const RetrospectivePageContent: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useLanguage();

    const {
        board,
        loading: retroLoading,
        error: retroError,
        notFound,
        typingStatuses,
        connectionLost,
        retryConnection,
    } = useRetrospectiveRealtimeSync(id);
    const { fullName, isReady } = useCurrentUser();

    // Board/participant/columns state now comes from the backend-mediated
    // useRetrospectiveRealtimeSync hook (US1) — join is performed internally by that
    // hook (backendRetrospectiveClient.joinBoard()) on every (re)connect, so there is
    // no separate auto-join effect, localStorage participant-id cache, or "joining"
    // state to manage here anymore.
    const retrospective: Retrospective | null = board
        ? {
              id: board.id,
              title: board.title,
              description: board.description,
              templateId: board.templateId,
              createdBy: board.createdBy,
              createdAt: board.createdAt,
              updatedAt: board.updatedAt,
              participantCount: board.participantCount,
              isActive: board.isActive,
              isAnonymous: board.isAnonymous,
          }
        : null;
    const participants = board?.participants ?? [];

    // Note: Sentiment analysis is now handled entirely within RetrospectiveBoard
    // to avoid double initialization and model loading

    // Loading state — covers both the initial board load and the join call, since
    // useRetrospectiveRealtimeSync performs both before resolving (FR-006).
    if (retroLoading || !isReady) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 flex items-center justify-center">
                <Loading />
            </div>
        );
    }

    // Board-deleted-mid-session state (US1 Acceptance Scenario 4) — distinct from a
    // transient load error so the copy is accurate about what happened.
    if (notFound) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 flex items-center justify-center">
                <div className="bg-surface-raised rounded-lg shadow-lg p-8 max-w-md text-center">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">
                        {t('retrospectivePage.boardDeleted.title')}
                    </h2>
                    <p className="text-text-secondary mb-6">
                        {t('retrospectivePage.boardDeleted.message')}
                    </p>
                    <Button onClick={() => navigate('/dashboard')}>
                        {t('retrospectivePage.backToDashboard')}
                    </Button>
                </div>
            </div>
        );
    }

    // 045-idle-connection-cleanup, US2/FR-004: the automatic retry budget was
    // exhausted and the board never loaded successfully — distinct from `notFound`
    // (the board is presumably fine, just unreachable right now) and from a one-off
    // load error, so it gets its own retry action instead of "back to dashboard".
    if (connectionLost && !retrospective) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 flex items-center justify-center">
                <div className="bg-surface-raised rounded-lg shadow-lg p-8 max-w-md text-center">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">
                        {t('errors.network')}
                    </h2>
                    <Button onClick={retryConnection}>{t('common.retry')}</Button>
                </div>
            </div>
        );
    }

    // Error state (load failure)
    if (retroError || !retrospective) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 flex items-center justify-center">
                <div className="bg-surface-raised rounded-lg shadow-lg p-8 max-w-md text-center">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">
                        {t('retrospectivePage.notFound.title')}
                    </h2>
                    <p className="text-text-secondary mb-6">
                        {t('retrospectivePage.notFound.message')}
                    </p>
                    <Button onClick={() => navigate('/dashboard')}>
                        {t('retrospectivePage.backToDashboard')}
                    </Button>
                </div>
            </div>
        );
    }

    // Main retrospective view
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
            {/* Header moved to top-level Header to keep a single unified sticky bar */}
            <div className="pt-4" />

            {/* Main Content Area */}
            <div className="container mx-auto px-2 pt-6 pb-6">
                {/* 045-idle-connection-cleanup, US2/FR-004: cached board data stays
                    visible while the connection is lost — this banner persists (no
                    auto-dismiss) since re-establishing live updates requires the
                    explicit action it offers, per WCAG 2.1 AA guidance against relying
                    on a transient toast for a required action. */}
                {connectionLost && (
                    <div
                        role="alert"
                        className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
                    >
                        <span>{t('errors.network')}</span>
                        <Button onClick={retryConnection}>{t('common.retry')}</Button>
                    </div>
                )}
                {/* Main Board */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <RetrospectiveBoard
                        retrospective={retrospective}
                        currentUser={fullName}
                        participants={participants || []}
                        cards={(board?.cards ?? []) as unknown as Card[]}
                        typingStatuses={typingStatuses}
                        groups={(board?.groups ?? []) as unknown as CardGroup[]}
                        columns={board?.columns ?? []}
                        columnGroupingStates={board?.columnGroupingStates}
                        timer={board?.timer ?? null}
                        myFacilitatorNotes={board?.myFacilitatorNotes ?? []}
                        actionItems={(board?.actionItems ?? []) as unknown as ActionItem[]}
                        sentimentResults={board?.sentimentResults ?? []}
                    />
                </motion.div>
            </div>
        </div>
    );
};

const RetrospectivePage: React.FC = () => {
    return (
        <AuthWrapper requireAuth={true}>
            <RetrospectivePageContent />
        </AuthWrapper>
    );
};

export default RetrospectivePage;