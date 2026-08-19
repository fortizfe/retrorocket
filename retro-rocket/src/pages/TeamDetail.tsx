import React from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, AlertTriangle, Users, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthWrapper from '@/features/auth/components/AuthWrapper';
import { useAuth } from '@/features/auth/hooks/useAuth';
import Button from '@/lib/components/ui/Button';
import { useTeamQuery } from '@/features/teams/hooks/useTeamQuery';
import { useTeamMembershipActions } from '@/features/teams/hooks/useTeamMembershipActions';
import AddMemberByEmailForm from '@/features/teams/components/AddMemberByEmailForm';
import TeamMemberList from '@/features/teams/components/TeamMemberList';
import TeamMetricsPanel from '@/features/teams/metrics/components/TeamMetricsPanel';

/**
 * `/teams/:id` — single team detail (spec 054, User Story 2, T038). Fetches the team +
 * roster via `useTeamQuery` (T034), renders `TeamMemberList` (T037) for every caller,
 * and `AddMemberByEmailForm` (T036) only when the caller's own `role` in the fetched
 * roster is `'owner'` — the backend enforces the same owner-only rule server-side
 * (FR-008), this is purely UI gating so a non-owner never even sees the control.
 *
 * For a non-owner caller, the space where the add-member section would sit instead
 * shows an explicit read-only notice (spec 054, User Story 3, T044/T046 —
 * `teams.detail.readOnlyNotice`) rather than silently rendering nothing there. This
 * isn't a WCAG requirement by itself (the missing controls are exactly as absent to
 * assistive tech as to anyone else), but it does the same job `TeamMemberList`'s
 * per-row remove/leave gating already does one level up: state the caller's
 * permissions in text rather than leaving them to infer "no controls" from an
 * otherwise-unexplained empty area.
 *
 * Membership actions go through `useTeamMembershipActions` (T035), which already
 * refetches the team on success. On top of that this page owns:
 * - success/error toasts (mirrors `Teams.tsx`'s `handleCreate` convention: error toast
 *   prefers the thrown error's own message, e.g. a `TeamApiError`'s backend-provided
 *   text, falling back to a translated generic one);
 * - navigation back to `/teams` whenever the *caller's own* membership goes away.
 *
 * That last point deliberately covers more than "when `teamEmptied` is true": per
 * `GetTeamWithMembers.ts` (server/src/application/use-cases/teams/GetTeamWithMembers.ts),
 * `GET /api/teams/:id` 403s for anyone who isn't a *current* member — which, after any
 * self-leave (a plain member leaving, or an owner leaving with others remaining and
 * transferring ownership away), is now true of the caller regardless of whether the team
 * itself was emptied. Only gating the navigate on `teamEmptied` would leave the caller
 * staring at an error state after an ordinary voluntary leave. Removing someone ELSE
 * (`handleRemove`) never triggers this — the caller (always the owner in that path)
 * remains a member, so that case stays on this page and simply refetches.
 */
const TeamDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { team, loading, error, refetch } = useTeamQuery(id);
    const actions = useTeamMembershipActions(id ?? '', refetch);

    const currentUserId = user?.uid ?? '';
    const callerRole = team?.members.find((member) => member.userId === currentUserId)?.role;

    const handleAdd = async (email: string) => {
        const member = await actions.addMember(email);
        toast.success(t('teams.members.addSuccessToast'));
        return member;
    };

    const handleRemove = async (userId: string) => {
        try {
            await actions.removeMember(userId);
            toast.success(t('teams.members.removeSuccessToast'));
        } catch (err: unknown) {
            console.error('Error removing team member:', err);
            const message = err instanceof Error ? err.message : undefined;
            toast.error(message || t('teams.members.removeErrorToast'));
        }
    };

    const handleLeave = async (userId: string) => {
        try {
            const result = await actions.leave(userId);
            toast.success(result.teamEmptied ? t('teams.members.teamEmptiedToast') : t('teams.members.leaveSuccessToast'));
            // See file doc comment: any successful self-leave takes the caller back to
            // the overview, not just the `teamEmptied` case — they're no longer a
            // member either way, so this page can't legitimately keep showing them
            // the roster.
            navigate('/teams');
        } catch (err: unknown) {
            console.error('Error leaving team:', err);
            const message = err instanceof Error ? err.message : undefined;
            toast.error(message || t('teams.members.leaveErrorToast'));
        }
    };

    return (
        <div className="min-h-screen">
            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
                <Link
                    to="/teams"
                    className="mb-4 inline-flex items-center gap-1.5 rounded-md text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    {t('teams.detail.backToTeams')}
                </Link>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div
                            role="status"
                            aria-label={t('common.loading')}
                            className="h-8 w-8 animate-spin rounded-full border-4 border-info-fg border-t-transparent"
                        />
                    </div>
                ) : error || !team ? (
                    <div role="alert" className="rounded-xl border border-error-fg/30 bg-error-bg px-6 py-16 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-raised">
                            <AlertTriangle className="h-7 w-7 text-error-fg" />
                        </div>
                        <p className="text-sm text-error-fg">{t('teams.detail.loadError')}</p>
                        <Button variant="outline" className="mt-6" onClick={refetch}>
                            {t('common.retry')}
                        </Button>
                    </div>
                ) : (
                    <>
                        <motion.header
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                            className="mb-6"
                        >
                            <h1 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
                                {team.name}
                            </h1>
                            {team.description && (
                                <p className="mt-1 text-sm text-text-secondary">{team.description}</p>
                            )}
                        </motion.header>

                        <TeamMetricsPanel teamId={id ?? ''} />

                        {callerRole === 'owner' ? (
                            <section className="mb-6 rounded-xl border border-border-default bg-surface-raised p-4">
                                <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-text-primary">
                                    <Users className="h-4 w-4" aria-hidden="true" />
                                    {t('teams.members.addSectionTitle')}
                                </h2>
                                <AddMemberByEmailForm onAdd={handleAdd} />
                            </section>
                        ) : (
                            <div className="mb-6 flex items-start gap-2 rounded-lg border border-info-fg bg-info-bg p-3 text-info-fg">
                                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                <p className="text-xs">{t('teams.detail.readOnlyNotice')}</p>
                            </div>
                        )}

                        <TeamMemberList
                            members={team.members}
                            currentUserId={currentUserId}
                            onRemove={handleRemove}
                            onLeave={handleLeave}
                            busy={actions.submitting}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

const TeamDetail: React.FC = () => {
    return (
        <AuthWrapper requireAuth={true}>
            <TeamDetailPage />
        </AuthWrapper>
    );
};

export default TeamDetail;
