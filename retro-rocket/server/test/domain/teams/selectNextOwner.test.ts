import { describe, it, expect } from 'vitest';
import { selectNextOwner } from '../../../src/domain/teams/selectNextOwner';
import type { TeamMembershipRecord } from '../../../src/application/ports/teams';

// 054-team-management, T021 (research.md item 4 / data-model.md "State transitions" /
// FR-013):
//
//   "when the owner leaves a team that still has other members, ownership transfers to
//   the remaining member with the earliest joinedAt."
//
// Signature contract for selectNextOwner (documented here since research.md only sketches
// it as `selectNextOwner(members: TeamMembership[]): TeamMembership`):
//
//   selectNextOwner(members: TeamMembershipRecord[], departingOwnerId: string): TeamMembershipRecord
//
// `members` is the FULL current membership list for the team (including the departing
// owner's own record) — the same shape leaveTeam already has in hand after a single
// `getTeamWithMembers`/membership-list read, so it doesn't need to pre-filter before
// calling this helper. `departingOwnerId` tells selectNextOwner which record to exclude
// before picking the earliest `joinedAt` among what's left. This keeps the helper pure
// and trivially testable (no I/O), per research.md item 4.
//
// Tiebreak: when two remaining members share the exact same joinedAt, the one appearing
// EARLIER in the input array wins (stable, index-order tiebreak) — deterministic and
// simple, with no need for a secondary sort key the domain doesn't otherwise have.
//
// selectNextOwner does not exist yet — this file is expected to fail with a
// "Cannot find module" error until server/src/domain/teams/selectNextOwner.ts is
// implemented (T027).
function membership(overrides: Partial<TeamMembershipRecord> = {}): TeamMembershipRecord {
    return {
        id: 'm',
        teamId: 't1',
        userId: 'u',
        role: 'member',
        joinedAt: new Date('2026-01-01T00:00:00Z'),
        ...overrides,
    };
}

describe('selectNextOwner', () => {
    it('picks the remaining member with the earliest joinedAt among multiple candidates', () => {
        const owner = membership({ id: 'm-owner', userId: 'owner', role: 'owner', joinedAt: new Date('2025-01-01T00:00:00Z') });
        const later = membership({ id: 'm-later', userId: 'u-later', joinedAt: new Date('2026-03-01T00:00:00Z') });
        const earliest = membership({ id: 'm-earliest', userId: 'u-earliest', joinedAt: new Date('2026-01-15T00:00:00Z') });
        const middle = membership({ id: 'm-middle', userId: 'u-middle', joinedAt: new Date('2026-02-01T00:00:00Z') });

        const result = selectNextOwner([owner, later, earliest, middle], 'owner');

        expect(result.userId).toBe('u-earliest');
    });

    it('returns the sole remaining member when only one other member exists', () => {
        const owner = membership({ id: 'm-owner', userId: 'owner', role: 'owner' });
        const onlyOther = membership({ id: 'm-only', userId: 'u-only', joinedAt: new Date('2026-05-01T00:00:00Z') });

        const result = selectNextOwner([owner, onlyOther], 'owner');

        expect(result.userId).toBe('u-only');
    });

    it('breaks a joinedAt tie by picking the member appearing earlier in the input array', () => {
        const owner = membership({ id: 'm-owner', userId: 'owner', role: 'owner' });
        const sameInstant = new Date('2026-04-01T00:00:00Z');
        const first = membership({ id: 'm-first', userId: 'u-first', joinedAt: sameInstant });
        const second = membership({ id: 'm-second', userId: 'u-second', joinedAt: sameInstant });

        const result = selectNextOwner([owner, first, second], 'owner');

        expect(result.userId).toBe('u-first');

        // Order-independence check: reversing the tied pair's position in the input
        // still yields "whichever comes first in the array" — pins down that the
        // tiebreak is genuinely array-order-based, not an incidental artifact of a
        // stable sort keyed on something else (e.g. insertion id).
        const reversedResult = selectNextOwner([owner, second, first], 'owner');
        expect(reversedResult.userId).toBe('u-second');
    });

    it('excludes the departing owner even when their own joinedAt is the earliest of all', () => {
        const owner = membership({ id: 'm-owner', userId: 'owner', role: 'owner', joinedAt: new Date('2020-01-01T00:00:00Z') });
        const other = membership({ id: 'm-other', userId: 'u-other', joinedAt: new Date('2026-01-01T00:00:00Z') });

        const result = selectNextOwner([owner, other], 'owner');

        expect(result.userId).toBe('u-other');
    });

    it('throws when no remaining member exists to hand ownership to', () => {
        const owner = membership({ id: 'm-owner', userId: 'owner', role: 'owner' });

        // Callers (leaveTeam) are expected to check "sole remaining member" themselves
        // and take the FR-014 team-emptied branch instead of calling this helper in
        // that case — this assertion documents that selectNextOwner itself doesn't
        // silently return something wrong (e.g. the departing owner) when misused.
        expect(() => selectNextOwner([owner], 'owner')).toThrow();
    });
});
