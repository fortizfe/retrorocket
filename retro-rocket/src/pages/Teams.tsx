import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Crown, Users, ArrowRight, AlertTriangle, Inbox } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import AuthWrapper from '@/features/auth/components/AuthWrapper';
import Button from '@/lib/components/ui/Button';
import Modal from '@/lib/components/ui/Modal';
import TeamCreateForm, { type TeamCreateFormValues } from '@/features/teams/components/TeamCreateForm';
import { useTeamsQuery } from '@/features/teams/hooks/useTeamsQuery';
import { createTeam } from '@/features/teams/services/backendTeamsClient';

/**
 * `/teams` — teams overview (spec 054, User Story 1). Lists every team the
 * caller belongs to (`useTeamsQuery`, T016) and lets them create a new one
 * via `TeamCreateForm` (T017) inside a modal, mirroring how `Dashboard.tsx`
 * hosts `CreateBoardFlow`. `TeamCreateForm` only validates and reports a
 * payload upward (see its own file docs) — this page owns the actual
 * `createTeam` call, the post-create refetch, and the success/error toast,
 * matching `EditRetrospectiveModal`/`BoardRow`'s toast conventions.
 *
 * The zero-teams empty state (spec 054, User Story 3, T045) mirrors
 * `Dashboard.tsx`'s own zero-boards empty state structurally (icon chip, h2
 * heading, muted body copy, primary CTA) so the two list pages feel like the
 * same app (Apple HIG "Familiarity" — consistent patterns let people predict
 * what happens next). The CTA reuses this page's own `showCreateModal` state
 * and `TeamCreateForm` — no new creation flow, just a second, discoverable
 * entry point into the one that already exists.
 */

// Strong ease-out (animate skill's easing table) for occasional-tier
// entrance motion (page load, state transitions) — mirrors Dashboard.tsx's
// ENTRANCE_TRANSITION so the two list pages feel like the same app.
const ENTRANCE_TRANSITION = { duration: 0.25, ease: [0.23, 1, 0.32, 1] as const };

const TeamsPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { teams, loading, error, refetch } = useTeamsQuery();
    const [showCreateModal, setShowCreateModal] = useState(false);

    const handleCreate = async (values: TeamCreateFormValues) => {
        try {
            await createTeam(values);
            await refetch();
            toast.success(t('teams.create.successToast'));
            setShowCreateModal(false);
        } catch (err: unknown) {
            console.error('Error creating team:', err);
            const message = err instanceof Error ? err.message : undefined;
            toast.error(message || t('teams.create.errorToast'));
        }
    };

    return (
        <div className="min-h-screen">
            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={ENTRANCE_TRANSITION}
                    className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                >
                    <h1 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
                        {t('teams.list.title')}
                    </h1>
                    <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('teams.list.createButton')}
                    </Button>
                </motion.header>

                <Modal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    title={t('teams.create.modalTitle')}
                    maxWidth="md"
                >
                    <div className="p-6">
                        <TeamCreateForm onCreate={handleCreate} />
                    </div>
                </Modal>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div
                            role="status"
                            aria-label={t('common.loading')}
                            className="h-8 w-8 animate-spin rounded-full border-4 border-info-fg border-t-transparent"
                        />
                    </div>
                ) : error ? (
                    <div role="alert" className="rounded-xl border border-error-fg/30 bg-error-bg px-6 py-16 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-raised">
                            <AlertTriangle className="h-7 w-7 text-error-fg" />
                        </div>
                        <p className="text-sm text-error-fg">{t('teams.list.loadError')}</p>
                        <Button variant="outline" className="mt-6" onClick={refetch}>
                            {t('common.retry')}
                        </Button>
                    </div>
                ) : teams.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={ENTRANCE_TRANSITION}
                        className="rounded-xl border border-border-default bg-surface-raised px-6 py-16 text-center"
                    >
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface">
                            <Inbox className="h-7 w-7 text-text-muted" />
                        </div>
                        <h2 className="text-lg font-semibold text-text-secondary">{t('teams.list.emptyState')}</h2>
                        <p className="mx-auto mt-1 max-w-md text-text-muted">{t('teams.list.emptyStateHint')}</p>
                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                {t('teams.list.emptyStateCta')}
                            </Button>
                        </div>
                    </motion.div>
                ) : (
                    <ul aria-label={t('teams.list.title')} className="divide-y divide-border-default overflow-hidden rounded-xl border border-border-default bg-surface-raised">
                        <AnimatePresence initial={false}>
                            {teams.map((team, index) => (
                                <motion.li
                                    key={team.id}
                                    layout
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }}
                                    transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                                    className="px-4 py-3 transition-colors hover:bg-surface focus-within:bg-surface"
                                >
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/teams/${team.id}`)}
                                            className="-mx-1 min-w-0 flex-1 rounded-md px-1 py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                                        >
                                            <span className="block truncate text-sm font-medium text-text-primary" title={team.name}>
                                                {team.name}
                                            </span>
                                            {team.description && (
                                                <span className="block truncate text-xs text-text-muted" title={team.description}>
                                                    {team.description}
                                                </span>
                                            )}
                                        </button>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted">
                                            <span className="inline-flex items-center gap-1.5">
                                                <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                                {team.memberCount} {t('teams.list.membersLabel')}
                                            </span>
                                            <span
                                                className={clsx(
                                                    'inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                                                    team.myRole === 'owner' ? 'bg-warning-bg text-warning-fg' : 'bg-info-bg text-info-fg'
                                                )}
                                            >
                                                {team.myRole === 'owner' ? <Crown className="h-3 w-3" aria-hidden="true" /> : <Users className="h-3 w-3" aria-hidden="true" />}
                                                {team.myRole === 'owner' ? t('teams.list.ownerBadge') : t('teams.list.memberBadge')}
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => navigate(`/teams/${team.id}`)}
                                            className="shrink-0 self-end rounded-md p-1.5 text-text-muted hover:bg-action hover:text-text-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:self-auto"
                                            title={t('teams.list.viewTeam')}
                                            aria-label={t('teams.list.viewTeam')}
                                        >
                                            <ArrowRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                </motion.li>
                            ))}
                        </AnimatePresence>
                    </ul>
                )}
            </div>
        </div>
    );
};

const Teams: React.FC = () => {
    return (
        <AuthWrapper requireAuth={true}>
            <TeamsPage />
        </AuthWrapper>
    );
};

export default Teams;
