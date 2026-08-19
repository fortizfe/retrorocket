import React from 'react';
import { useTranslation } from 'react-i18next';
import { Crown, Users, LogOut, UserMinus } from 'lucide-react';
import clsx from 'clsx';
import Button from '@/lib/components/ui/Button';
import type { TeamMember } from '@/features/teams/types/team';

/**
 * Team member roster (spec 054, User Story 2 — "Owner manages team membership", T037).
 * Renders every member with a role badge, and per FR-005/FR-008/FR-012:
 *
 * - The team owner sees a "remove" control on every OTHER row (never their own — the
 *   owner leaves via the "leave" control below, which carries the ownership-transfer
 *   semantics instead of a plain removal, per contracts/teams-api.md case 3).
 * - The caller sees a "leave" control on their OWN row regardless of role.
 *
 * When the owner leaves their own row and other members remain, the confirm prompt
 * names who ownership transfers to (mirroring the earliest-`joinedAt` pick the backend's
 * `selectNextOwner`, server/src/domain/teams/selectNextOwner.ts, actually makes — this is
 * presentation-only, the real decision is server-side) so the owner isn't surprised by
 * FR-013 happening silently. `window.confirm` matches this codebase's existing
 * destructive-action pattern (see `ActionItemCard.tsx`/`GroupCard.tsx`/`NotesTab.tsx`)
 * rather than introducing a new confirm-dialog component (constitution Principle V,
 * YAGNI) — per apple-design's Agency principle, a confirmation belongs on a genuinely
 * destructive/irreversible action, which "leave" and "remove" both are (membership has
 * to be re-added by the owner afterward).
 */

export interface TeamMemberListProps {
    members: TeamMember[];
    /** uid of the person viewing this list — determines which row is "your own". */
    currentUserId: string;
    /** Owner removes a different member (FR-005). Resolves/rejects; this component doesn't toast. */
    onRemove: (userId: string) => Promise<void>;
    /** The caller leaves via their own row (FR-012/FR-013/FR-014), owner or not. */
    onLeave: (userId: string) => Promise<void>;
    /** Disables every action control while a request is in flight (avoids double-submits). */
    busy?: boolean;
}

/** Earliest-joined member other than `excludeUserId` — presentation-only mirror of the
 * backend's `selectNextOwner`, used purely to name the likely next owner in the confirm
 * prompt copy; the server makes the actual, authoritative choice. */
function likelyNextOwner(members: TeamMember[], excludeUserId: string): TeamMember | null {
    const others = members.filter((member) => member.userId !== excludeUserId);
    if (others.length === 0) return null;
    return others.reduce((earliest, member) => (member.joinedAt < earliest.joinedAt ? member : earliest));
}

const TeamMemberList: React.FC<TeamMemberListProps> = ({ members, currentUserId, onRemove, onLeave, busy = false }) => {
    const { t } = useTranslation();

    const handleRemove = (member: TeamMember) => {
        if (!window.confirm(t('teams.members.removeConfirm', { name: member.displayName }))) return;
        void onRemove(member.userId);
    };

    const handleLeave = (member: TeamMember) => {
        if (member.role === 'owner') {
            const nextOwner = likelyNextOwner(members, member.userId);
            const message = nextOwner
                ? t('teams.members.leaveOwnerConfirm', { name: nextOwner.displayName })
                : t('teams.members.leaveSoleOwnerConfirm');
            if (!window.confirm(message)) return;
        } else if (!window.confirm(t('teams.members.leaveConfirm'))) {
            return;
        }
        void onLeave(member.userId);
    };

    return (
        <ul
            aria-label={t('teams.members.listLabel')}
            className="divide-y divide-border-default overflow-hidden rounded-xl border border-border-default bg-surface-raised"
        >
            {members.map((member) => {
                const isSelf = member.userId === currentUserId;
                const callerIsOwner = members.some((m) => m.userId === currentUserId && m.role === 'owner');
                const canRemove = callerIsOwner && !isSelf;
                const canLeave = isSelf;

                return (
                    <li
                        key={member.userId}
                        className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            {member.photoURL ? (
                                <img
                                    src={member.photoURL}
                                    alt=""
                                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                                />
                            ) : (
                                <div
                                    aria-hidden="true"
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-medium text-text-secondary"
                                >
                                    {member.displayName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-text-primary" title={member.displayName}>
                                    {member.displayName}
                                    {isSelf && (
                                        <span className="ml-1.5 text-xs font-normal text-text-muted">
                                            {t('teams.members.you')}
                                        </span>
                                    )}
                                </p>
                                <p className="truncate text-xs text-text-muted" title={member.email}>
                                    {member.email}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <span
                                className={clsx(
                                    'inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                                    member.role === 'owner' ? 'bg-warning-bg text-warning-fg' : 'bg-info-bg text-info-fg',
                                )}
                            >
                                {member.role === 'owner' ? (
                                    <Crown className="h-3 w-3" aria-hidden="true" />
                                ) : (
                                    <Users className="h-3 w-3" aria-hidden="true" />
                                )}
                                {member.role === 'owner' ? t('teams.list.ownerBadge') : t('teams.list.memberBadge')}
                            </span>

                            {canRemove && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={busy}
                                    onClick={() => handleRemove(member)}
                                    aria-label={t('teams.members.removeAria', { name: member.displayName })}
                                >
                                    <UserMinus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                                    {t('teams.members.remove')}
                                </Button>
                            )}

                            {canLeave && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={busy}
                                    onClick={() => handleLeave(member)}
                                    aria-label={t('teams.members.leaveAria')}
                                >
                                    <LogOut className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                                    {t('teams.members.leave')}
                                </Button>
                            )}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
};

export default TeamMemberList;
