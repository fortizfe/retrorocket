import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TeamMemberList from '@/features/teams/components/TeamMemberList';
import type { TeamMember } from '@/features/teams/types/team';

// 054-team-management, T037 (User Story 2 — "Owner manages team membership",
// FR-005/FR-008/FR-012).
//
// react-i18next is mocked globally in src/test/setup.ts with `t: (key) => key`
// (interpolation params like {{name}} are dropped), so per-row aria-labels/confirm
// copy collapse to the same raw key across rows — these tests distinguish rows by
// their rendered displayName/email text via `within`, not by aria-label content.
//
// window.confirm is stubbed to auto-accept so a click always reaches onRemove/onLeave;
// TeamMemberList.test's own confirm-copy behavior isn't under test here, only which
// rows expose which controls (that's this component's actual FR-005/FR-008/FR-012
// contract) and how the role badge renders.

const owner: TeamMember = {
    userId: 'u1',
    displayName: 'Owner Person',
    email: 'owner@example.com',
    photoURL: null,
    role: 'owner',
    joinedAt: new Date('2026-01-01'),
};

const memberA: TeamMember = {
    userId: 'u2',
    displayName: 'Member A',
    email: 'a@example.com',
    photoURL: null,
    role: 'member',
    joinedAt: new Date('2026-01-02'),
};

const memberB: TeamMember = {
    userId: 'u3',
    displayName: 'Member B',
    email: 'b@example.com',
    photoURL: null,
    role: 'member',
    joinedAt: new Date('2026-01-03'),
};

const members = [owner, memberA, memberB];

function rowFor(displayName: string): HTMLElement {
    const rows = screen.getAllByRole('listitem');
    const row = rows.find((r) => within(r).queryByText(displayName));
    if (!row) throw new Error(`No row found for ${displayName}`);
    return row;
}

describe('TeamMemberList', () => {
    const onRemove = vi.fn();
    const onLeave = vi.fn();

    beforeEach(() => {
        onRemove.mockReset().mockResolvedValue(undefined);
        onLeave.mockReset().mockResolvedValue(undefined);
        vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    it('lets the owner remove every other row but not their own, and shows leave only on their own row', () => {
        render(
            <TeamMemberList members={members} currentUserId="u1" onRemove={onRemove} onLeave={onLeave} />,
        );

        const ownerRow = rowFor('Owner Person');
        const memberARow = rowFor('Member A');
        const memberBRow = rowFor('Member B');

        // Owner's own row: no remove control, but a leave control.
        expect(within(ownerRow).queryByRole('button', { name: 'teams.members.removeAria' })).not.toBeInTheDocument();
        expect(within(ownerRow).getByRole('button', { name: 'teams.members.leaveAria' })).toBeInTheDocument();

        // Every other row: a remove control, no leave control.
        expect(within(memberARow).getByRole('button', { name: 'teams.members.removeAria' })).toBeInTheDocument();
        expect(within(memberARow).queryByRole('button', { name: 'teams.members.leaveAria' })).not.toBeInTheDocument();

        expect(within(memberBRow).getByRole('button', { name: 'teams.members.removeAria' })).toBeInTheDocument();
        expect(within(memberBRow).queryByRole('button', { name: 'teams.members.leaveAria' })).not.toBeInTheDocument();
    });

    it('lets a non-owner member remove nobody, and shows leave only on their own row', () => {
        render(
            <TeamMemberList members={members} currentUserId="u2" onRemove={onRemove} onLeave={onLeave} />,
        );

        const ownerRow = rowFor('Owner Person');
        const memberARow = rowFor('Member A');
        const memberBRow = rowFor('Member B');

        // No remove control anywhere for a non-owner caller.
        expect(within(ownerRow).queryByRole('button', { name: 'teams.members.removeAria' })).not.toBeInTheDocument();
        expect(within(memberARow).queryByRole('button', { name: 'teams.members.removeAria' })).not.toBeInTheDocument();
        expect(within(memberBRow).queryByRole('button', { name: 'teams.members.removeAria' })).not.toBeInTheDocument();

        // Leave control only on the caller's own row (Member A, u2).
        expect(within(memberARow).getByRole('button', { name: 'teams.members.leaveAria' })).toBeInTheDocument();
        expect(within(ownerRow).queryByRole('button', { name: 'teams.members.leaveAria' })).not.toBeInTheDocument();
        expect(within(memberBRow).queryByRole('button', { name: 'teams.members.leaveAria' })).not.toBeInTheDocument();
    });

    it('renders the owner badge on the owner row and the member badge on every other row', () => {
        render(
            <TeamMemberList members={members} currentUserId="u2" onRemove={onRemove} onLeave={onLeave} />,
        );

        const ownerRow = rowFor('Owner Person');
        const memberARow = rowFor('Member A');
        const memberBRow = rowFor('Member B');

        expect(within(ownerRow).getByText('teams.list.ownerBadge')).toBeInTheDocument();
        expect(within(ownerRow).queryByText('teams.list.memberBadge')).not.toBeInTheDocument();

        expect(within(memberARow).getByText('teams.list.memberBadge')).toBeInTheDocument();
        expect(within(memberARow).queryByText('teams.list.ownerBadge')).not.toBeInTheDocument();

        expect(within(memberBRow).getByText('teams.list.memberBadge')).toBeInTheDocument();
        expect(within(memberBRow).queryByText('teams.list.ownerBadge')).not.toBeInTheDocument();
    });

    it('calls onRemove with the target userId when the owner confirms removing another member', async () => {
        render(
            <TeamMemberList members={members} currentUserId="u1" onRemove={onRemove} onLeave={onLeave} />,
        );

        const memberARow = rowFor('Member A');
        within(memberARow).getByRole('button', { name: 'teams.members.removeAria' }).click();

        expect(window.confirm).toHaveBeenCalled();
        expect(onRemove).toHaveBeenCalledWith('u2');
    });

    it('does not call onRemove when the confirm dialog is dismissed', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        render(
            <TeamMemberList members={members} currentUserId="u1" onRemove={onRemove} onLeave={onLeave} />,
        );

        const memberARow = rowFor('Member A');
        within(memberARow).getByRole('button', { name: 'teams.members.removeAria' }).click();

        expect(onRemove).not.toHaveBeenCalled();
    });

    it('calls onLeave with the caller userId when leaving is confirmed', () => {
        render(
            <TeamMemberList members={members} currentUserId="u2" onRemove={onRemove} onLeave={onLeave} />,
        );

        const memberARow = rowFor('Member A');
        within(memberARow).getByRole('button', { name: 'teams.members.leaveAria' }).click();

        expect(onLeave).toHaveBeenCalledWith('u2');
    });
});
