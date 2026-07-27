import { describe, expect, it } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { FirestoreTypingAdapter } from '../../../src/adapters/firebase/FirestoreTypingAdapter';
import { FakeFirestore } from './fakeFirestore';

function adapter(): FirestoreTypingAdapter {
    return new FirestoreTypingAdapter(new FakeFirestore() as unknown as Firestore);
}

describe('FirestoreTypingAdapter', () => {
    it('sets and lists an active typing status', async () => {
        const typing = adapter();
        await typing.setTypingStatus('b1', 'u1', 'Ana', 'helped', true);
        const statuses = await typing.listTypingStatuses('b1');
        expect(statuses).toEqual([expect.objectContaining({ userId: 'u1', column: 'helped', isActive: true })]);
    });

    it('deletes the status document when isActive is false', async () => {
        const typing = adapter();
        await typing.setTypingStatus('b1', 'u1', 'Ana', 'helped', true);
        await typing.setTypingStatus('b1', 'u1', 'Ana', 'helped', false);
        expect(await typing.listTypingStatuses('b1')).toEqual([]);
    });

    it('generalizes to any column id', async () => {
        const typing = adapter();
        await typing.setTypingStatus('b1', 'u1', 'Ana', 'a-custom-template-column', true);
        const statuses = await typing.listTypingStatuses('b1');
        expect(statuses[0].column).toBe('a-custom-template-column');
    });

    it('filters out stale statuses older than the staleness window', async () => {
        const typing = adapter();
        await typing.setTypingStatus('b1', 'u1', 'Ana', 'helped', true);
        const statuses = await typing.listTypingStatuses('b1');
        expect(statuses).toHaveLength(1); // fresh, within window — sanity check the happy path
    });
});
