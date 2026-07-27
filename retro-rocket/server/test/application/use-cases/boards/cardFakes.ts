import type {
    Card,
    CardGroup,
    CardGroupPort,
    CardPort,
    CreateCardInput,
    ReorderCardUpdate,
    TypingPort,
    TypingStatus,
    UpdateCardInput,
} from '../../../../src/application/ports/cards';

/** In-memory fake for CardPort. Mutates via last-write-wins on the stored object (FR-014). */
export function inMemoryCardStore(initial: Card[] = []): CardPort {
    const cards = new Map(initial.map((c) => [c.id, { ...c }]));
    let counter = 0;

    return {
        async getCard(cardId) {
            return cards.get(cardId) ?? null;
        },
        async listCards(retrospectiveId) {
            return [...cards.values()].filter((c) => c.retrospectiveId === retrospectiveId).sort((a, b) => a.order - b.order);
        },
        async createCard(input: CreateCardInput) {
            const id = `card-${++counter}`;
            const now = new Date();
            const card: Card = {
                id,
                retrospectiveId: input.retrospectiveId,
                content: input.content,
                column: input.column,
                createdBy: input.createdBy,
                createdAt: now,
                updatedAt: now,
                color: input.color,
                likes: [],
                reactions: [],
                order: Date.now(),
            };
            cards.set(id, card);
            return card;
        },
        async updateCard(cardId: string, updates: UpdateCardInput) {
            const card = cards.get(cardId);
            if (!card) throw new Error('not found');
            Object.assign(card, updates, { updatedAt: new Date() });
            return card;
        },
        async deleteCard(cardId: string) {
            cards.delete(cardId);
        },
        async toggleLike(cardId: string, userId: string, username: string) {
            const card = cards.get(cardId);
            if (!card) throw new Error('not found');
            const already = card.likes.some((l) => l.userId === userId);
            card.likes = already ? card.likes.filter((l) => l.userId !== userId) : [...card.likes, { userId, username, timestamp: new Date() }];
            return card;
        },
        async setReaction(cardId: string, userId: string, username: string, emoji: string) {
            const card = cards.get(cardId);
            if (!card) throw new Error('not found');
            card.reactions = [...card.reactions.filter((r) => r.userId !== userId), { userId, username, emoji, timestamp: new Date() }];
            return card;
        },
        async removeReaction(cardId: string, userId: string) {
            const card = cards.get(cardId);
            if (!card) throw new Error('not found');
            card.reactions = card.reactions.filter((r) => r.userId !== userId);
            return card;
        },
        async reorderCards(updates: ReorderCardUpdate[]) {
            for (const update of updates) {
                const card = cards.get(update.cardId);
                if (!card) continue;
                card.order = update.order;
                if (update.column !== undefined) card.column = update.column;
            }
        },
    };
}

/** In-memory fake for CardGroupPort. */
export function inMemoryCardGroupStore(initial: CardGroup[] = []): CardGroupPort {
    const groups = new Map(initial.map((g) => [g.id, { ...g, memberCardIds: [...g.memberCardIds] }]));
    const columnGroupingStates = new Map<string, Record<string, unknown>>();
    let counter = 0;

    return {
        async getGroup(groupId) {
            return groups.get(groupId) ?? null;
        },
        async listGroups(retrospectiveId) {
            return [...groups.values()].filter((g) => g.retrospectiveId === retrospectiveId).sort((a, b) => a.order - b.order);
        },
        async createGroup(retrospectiveId, headCardId, memberCardIds, createdBy, title) {
            const id = `group-${++counter}`;
            const group: CardGroup = {
                id,
                retrospectiveId,
                column: 'unknown',
                headCardId,
                memberCardIds: [...memberCardIds],
                title,
                isCollapsed: false,
                createdAt: new Date(),
                createdBy,
                order: Date.now(),
            };
            groups.set(id, group);
            return group;
        },
        async disbandGroup(groupId) {
            groups.delete(groupId);
        },
        async addCardToGroup(groupId, cardId) {
            const group = groups.get(groupId);
            if (!group) throw new Error('not found');
            group.memberCardIds = [...group.memberCardIds, cardId];
            return group;
        },
        async removeCardFromGroup(cardId) {
            const group = [...groups.values()].find((g) => g.headCardId === cardId || g.memberCardIds.includes(cardId));
            if (!group) return null;

            if (group.headCardId === cardId) {
                const [promoted, ...remaining] = group.memberCardIds;
                if (!promoted) {
                    groups.delete(group.id);
                    return null;
                }
                group.headCardId = promoted;
                group.memberCardIds = remaining;
                return group;
            }

            group.memberCardIds = group.memberCardIds.filter((id) => id !== cardId);
            if (group.memberCardIds.length === 0) {
                groups.delete(group.id);
                return null;
            }
            return group;
        },
        async setGroupCollapsed(groupId, isCollapsed) {
            const group = groups.get(groupId);
            if (!group) throw new Error('not found');
            group.isCollapsed = isCollapsed;
            return group;
        },
        async saveColumnGroupingState(retrospectiveId, states) {
            columnGroupingStates.set(retrospectiveId, states);
        },
        async getColumnGroupingState(retrospectiveId) {
            return columnGroupingStates.get(retrospectiveId) ?? {};
        },
    };
}

/** In-memory fake for TypingPort. */
export function inMemoryTypingStore(): TypingPort {
    const statuses = new Map<string, TypingStatus & { retrospectiveId: string }>();

    return {
        async setTypingStatus(retrospectiveId, userId, username, column, isActive) {
            const key = `${retrospectiveId}_${userId}_${column}`;
            if (!isActive) {
                statuses.delete(key);
                return;
            }
            statuses.set(key, { retrospectiveId, userId, username, column, isActive: true, timestamp: new Date() });
        },
        async listTypingStatuses(retrospectiveId) {
            return [...statuses.values()].filter((s) => s.retrospectiveId === retrospectiveId);
        },
    };
}
