import { describe, it, expect } from 'vitest';
import { createCard, editCard, deleteCard } from '../../../../src/application/use-cases/retrospective/CardLifecycle';
import { createRetrospectiveFakeStore } from './retrospectiveFakes';
import { AppError, ForbiddenError } from '../../../../src/domain/errors';

function seededCard() {
    return { id: 'c1', content: 'x', column: 'col1', createdBy: 'owner-uid', createdAt: new Date(), updatedAt: new Date(), retrospectiveId: 'r1', votes: 0, likes: [], reactions: [], order: 0 };
}

describe('createCard', () => {
    it('creates a card with the given content/column/color', async () => {
        const store = createRetrospectiveFakeStore();
        const card = await createCard({ ...store }, { retrospectiveId: 'r1', content: 'hello', column: 'col1', createdBy: 'u1', createdByName: 'Jane Smith', color: 'pastelBlue' });
        expect(card).toMatchObject({ content: 'hello', column: 'col1', createdBy: 'u1', color: 'pastelBlue', votes: 0 });
    });

    it('400s on empty content', async () => {
        const store = createRetrospectiveFakeStore();
        await expect(createCard({ ...store }, { retrospectiveId: 'r1', content: '   ', column: 'col1', createdBy: 'u1', createdByName: 'Jane Smith' })).rejects.toThrow(AppError);
    });

    it('forwards createdByName to cardPort.createCard so the author display name is captured at creation time', async () => {
        const store = createRetrospectiveFakeStore();
        const card = await createCard({ ...store }, { retrospectiveId: 'r1', content: 'hello', column: 'col1', createdBy: 'u1', createdByName: 'Jane Smith' });
        expect(card.createdByName).toBe('Jane Smith');
    });
});

describe('editCard', () => {
    it('edits content/color when the caller owns the card', async () => {
        const store = createRetrospectiveFakeStore({ cards: [seededCard()] });
        const card = await editCard({ ...store }, { cardId: 'c1', uid: 'owner-uid', content: 'updated' });
        expect(card.content).toBe('updated');
    });

    it('throws ForbiddenError for a non-owner', async () => {
        const store = createRetrospectiveFakeStore({ cards: [seededCard()] });
        await expect(editCard({ ...store }, { cardId: 'c1', uid: 'someone-else', content: 'hijack' })).rejects.toThrow(ForbiddenError);
    });
});

describe('deleteCard', () => {
    it('deletes a card the caller owns', async () => {
        const store = createRetrospectiveFakeStore({ cards: [seededCard()] });
        await deleteCard({ ...store }, { cardId: 'c1', uid: 'owner-uid' });
        expect(await store.cardPort.getCard('c1')).toBeNull();
    });

    it('throws ForbiddenError for a non-owner', async () => {
        const store = createRetrospectiveFakeStore({ cards: [seededCard()] });
        await expect(deleteCard({ ...store }, { cardId: 'c1', uid: 'someone-else' })).rejects.toThrow(ForbiddenError);
    });
});
