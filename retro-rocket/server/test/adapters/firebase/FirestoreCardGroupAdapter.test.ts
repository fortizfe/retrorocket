import { describe, it, expect } from 'vitest';
import { toCardGroup } from '../../../src/adapters/firebase/FirestoreCardGroupAdapter';

describe('toCardGroup', () => {
    const data = {
        retrospectiveId: 'r1',
        column: 'col1',
        headCardId: 'c1',
        memberCardIds: ['c2', 'c3'],
        isCollapsed: false,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        createdBy: 'u1',
        order: 2,
    };

    it('maps a Firestore document into a CardGroupDTO', () => {
        expect(toCardGroup('g1', data)).toMatchObject({ id: 'g1', headCardId: 'c1', memberCardIds: ['c2', 'c3'] });
    });

    it('omits title when absent rather than setting it to undefined', () => {
        const group = toCardGroup('g1', data);
        expect(group.title).toBeUndefined();
    });

    it('preserves a present title', () => {
        expect(toCardGroup('g1', { ...data, title: 'Custom Title' }).title).toBe('Custom Title');
    });

    it('defaults memberCardIds to [] and isCollapsed to false when absent', () => {
        const { memberCardIds: _m, isCollapsed: _c, ...rest } = data;
        void _m;
        void _c;
        expect(toCardGroup('g1', rest)).toMatchObject({ memberCardIds: [], isCollapsed: false });
    });
});
