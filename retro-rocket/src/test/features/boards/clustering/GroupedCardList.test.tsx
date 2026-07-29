import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GroupedCardList from '@/features/boards/clustering/components/GroupedCardList';
import { Card as CardType, CardColor } from '@/features/boards/types/card';
import { Participant } from '@/features/boards/types/participant';

vi.mock('framer-motion', () => ({
    motion: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('lucide-react', () => ({
    Users: () => <span data-testid="users-icon" />,
    Hash: () => <span data-testid="hash-icon" />,
}));

vi.mock('@/features/boards/retrospective/components/DragDropColumn', () => ({
    default: ({ cards }: any) => <div data-testid="drag-drop-column">{cards.length} cards</div>,
}));

function makeCard(overrides: Partial<CardType> = {}): CardType {
    return {
        id: 'c1',
        content: 'x',
        column: 'col1',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        retrospectiveId: 'r1',
        color: 'pastelBlue' as CardColor,
        ...overrides,
    };
}

const noopAsync = async () => { };

const requiredProps = {
    onCardUpdate: noopAsync,
    onCardDelete: noopAsync,
    onCardVote: noopAsync,
    onCardLike: noopAsync,
    onCardReaction: noopAsync,
    onCardReactionRemove: noopAsync,
    onCardsReorder: noopAsync,
};

describe('GroupedCardList — user grouping headers (spec 020-user-display-name-fix)', () => {
    it('renders the resolved display name (from createdByName) as the group header, not the raw uid', () => {
        const card = makeCard({ createdBy: 'user-1', createdByName: 'Jane Smith' });
        render(
            <GroupedCardList
                {...requiredProps}
                groupedCards={{ 'user-1': [card] }}
                groupBy="user"
            />
        );

        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.queryByText('user-1')).not.toBeInTheDocument();
    });

    it('falls back to a live participant match by userId when createdByName is absent (legacy card)', () => {
        const card = makeCard({ createdBy: 'user-1', createdByName: undefined });
        const participants: Participant[] = [
            { id: 'p1', userId: 'user-1', name: 'Alex Chen', retrospectiveId: 'r1', joinedAt: new Date() },
        ];
        render(
            <GroupedCardList
                {...requiredProps}
                groupedCards={{ 'user-1': [card] }}
                groupBy="user"
                participants={participants}
            />
        );

        expect(screen.getByText('Alex Chen')).toBeInTheDocument();
    });

    it('shows the localized fallback label when no name can be resolved at all', () => {
        const card = makeCard({ createdBy: 'user-departed', createdByName: undefined });
        render(
            <GroupedCardList
                {...requiredProps}
                groupedCards={{ 'user-departed': [card] }}
                groupBy="user"
                participants={[]}
            />
        );

        expect(screen.getByText('retrospective.grouping.unknownAuthor')).toBeInTheDocument();
        expect(screen.queryByText('user-departed')).not.toBeInTheDocument();
    });

    it('renders the raw group name for non-user grouping criteria (unaffected by this fix)', () => {
        const card = makeCard();
        render(
            <GroupedCardList
                {...requiredProps}
                groupedCards={{ 'Suggested group 1': [card] }}
                groupBy="suggestions"
            />
        );

        expect(screen.getByText('Suggested group 1')).toBeInTheDocument();
    });
});
