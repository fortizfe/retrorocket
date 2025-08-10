import { describe, it, expect } from 'vitest';
import {
    Retrospective,
    RetrospectiveCard,
    ColumnType,
    ColumnConfig
} from '../../types/retrospective';

describe('Retrospective Types', () => {
    describe('ColumnType', () => {
        it('should have correct literal types', () => {
            const columns: ColumnType[] = ['helped', 'hindered', 'improve', 'actions'];

            expect(columns).toContain('helped');
            expect(columns).toContain('hindered');
            expect(columns).toContain('improve');
            expect(columns).toContain('actions');
            expect(columns).toHaveLength(4);
        });

        it('should work with type validation', () => {
            const isValidColumn = (column: string): column is ColumnType => {
                return ['helped', 'hindered', 'improve', 'actions'].includes(column);
            };

            expect(isValidColumn('helped')).toBe(true);
            expect(isValidColumn('hindered')).toBe(true);
            expect(isValidColumn('improve')).toBe(true);
            expect(isValidColumn('actions')).toBe(true);
            expect(isValidColumn('invalid')).toBe(false);
            expect(isValidColumn('')).toBe(false);
        });

        it('should handle column operations', () => {
            const getColumnDisplay = (column: ColumnType): string => {
                switch (column) {
                    case 'helped': return 'What Helped';
                    case 'hindered': return 'What Hindered';
                    case 'improve': return 'Improvements';
                    case 'actions': return 'Action Items';
                }
            };

            expect(getColumnDisplay('helped')).toBe('What Helped');
            expect(getColumnDisplay('hindered')).toBe('What Hindered');
            expect(getColumnDisplay('improve')).toBe('Improvements');
            expect(getColumnDisplay('actions')).toBe('Action Items');
        });
    });

    describe('ColumnConfig interface', () => {
        it('should have correct structure with required properties', () => {
            const columnConfig: ColumnConfig = {
                id: 'helped',
                title: 'What Helped',
                description: 'Things that went well',
                color: '#4CAF50',
                icon: 'thumbs-up'
            };

            expect(typeof columnConfig.id).toBe('string');
            expect(typeof columnConfig.title).toBe('string');
            expect(typeof columnConfig.description).toBe('string');
            expect(typeof columnConfig.color).toBe('string');
            expect(typeof columnConfig.icon).toBe('string');

            // Required properties
            expect(columnConfig).toHaveProperty('id');
            expect(columnConfig).toHaveProperty('title');
            expect(columnConfig).toHaveProperty('description');
            expect(columnConfig).toHaveProperty('color');
            expect(columnConfig).toHaveProperty('icon');
        });

        it('should handle different column configurations', () => {
            const helpedConfig: ColumnConfig = {
                id: 'helped',
                title: 'What Helped',
                description: 'Things that went well and should continue',
                color: '#4CAF50',
                icon: 'check-circle'
            };

            const hinderedConfig: ColumnConfig = {
                id: 'hindered',
                title: 'What Hindered',
                description: 'Things that blocked or slowed us down',
                color: '#F44336',
                icon: 'warning'
            };

            const improveConfig: ColumnConfig = {
                id: 'improve',
                title: 'Improvements',
                description: 'Things we can do better next time',
                color: '#FF9800',
                icon: 'trending-up'
            };

            const actionsConfig: ColumnConfig = {
                id: 'actions',
                title: 'Action Items',
                description: 'Specific tasks to implement improvements',
                color: '#2196F3',
                icon: 'play'
            };

            expect(helpedConfig.id).toBe('helped');
            expect(helpedConfig.color).toBe('#4CAF50');

            expect(hinderedConfig.id).toBe('hindered');
            expect(hinderedConfig.color).toBe('#F44336');

            expect(improveConfig.id).toBe('improve');
            expect(improveConfig.color).toBe('#FF9800');

            expect(actionsConfig.id).toBe('actions');
            expect(actionsConfig.color).toBe('#2196F3');
        });

        it('should validate column config consistency', () => {
            const configs: ColumnConfig[] = [
                {
                    id: 'helped',
                    title: 'What Helped',
                    description: 'Positive aspects',
                    color: '#4CAF50',
                    icon: 'check'
                },
                {
                    id: 'hindered',
                    title: 'What Hindered',
                    description: 'Negative aspects',
                    color: '#F44336',
                    icon: 'warning'
                }
            ];

            const uniqueIds = new Set(configs.map(c => c.id));
            const uniqueColors = new Set(configs.map(c => c.color));

            expect(uniqueIds.size).toBe(configs.length); // All IDs unique
            expect(uniqueColors.size).toBe(configs.length); // All colors unique
        });
    });

    describe('RetrospectiveCard interface', () => {
        it('should have correct structure with required properties', () => {
            const card: RetrospectiveCard = {
                id: 'card123',
                content: 'This is a retrospective card',
                column: 'helped',
                createdBy: 'user456',
                createdAt: new Date(),
                retrospectiveId: 'retro789'
            };

            expect(typeof card.id).toBe('string');
            expect(typeof card.content).toBe('string');
            expect(typeof card.column).toBe('string');
            expect(typeof card.createdBy).toBe('string');
            expect(card.createdAt).toBeInstanceOf(Date);
            expect(typeof card.retrospectiveId).toBe('string');

            // Required properties
            expect(card).toHaveProperty('id');
            expect(card).toHaveProperty('content');
            expect(card).toHaveProperty('column');
            expect(card).toHaveProperty('createdBy');
            expect(card).toHaveProperty('createdAt');
            expect(card).toHaveProperty('retrospectiveId');
        });

        it('should handle optional votes property', () => {
            const cardWithVotes: RetrospectiveCard = {
                id: 'card456',
                content: 'Card with votes',
                column: 'hindered',
                createdBy: 'user789',
                createdAt: new Date(),
                retrospectiveId: 'retro101',
                votes: 5
            };

            const cardWithoutVotes: RetrospectiveCard = {
                id: 'card789',
                content: 'Card without votes',
                column: 'improve',
                createdBy: 'user101',
                createdAt: new Date(),
                retrospectiveId: 'retro202'
            };

            const cardWithZeroVotes: RetrospectiveCard = {
                id: 'card101',
                content: 'Card with zero votes',
                column: 'actions',
                createdBy: 'user202',
                createdAt: new Date(),
                retrospectiveId: 'retro303',
                votes: 0
            };

            expect(cardWithVotes.votes).toBe(5);
            expect(cardWithoutVotes.votes).toBeUndefined();
            expect(cardWithZeroVotes.votes).toBe(0);
        });

        it('should handle different column types', () => {
            const cards: RetrospectiveCard[] = [
                {
                    id: 'c1',
                    content: 'Good teamwork',
                    column: 'helped',
                    createdBy: 'user1',
                    createdAt: new Date(),
                    retrospectiveId: 'retro1',
                    votes: 3
                },
                {
                    id: 'c2',
                    content: 'Technical debt',
                    column: 'hindered',
                    createdBy: 'user2',
                    createdAt: new Date(),
                    retrospectiveId: 'retro1',
                    votes: 2
                },
                {
                    id: 'c3',
                    content: 'Better communication',
                    column: 'improve',
                    createdBy: 'user3',
                    createdAt: new Date(),
                    retrospectiveId: 'retro1',
                    votes: 4
                },
                {
                    id: 'c4',
                    content: 'Refactor payment module',
                    column: 'actions',
                    createdBy: 'user4',
                    createdAt: new Date(),
                    retrospectiveId: 'retro1',
                    votes: 1
                }
            ];

            const cardsByColumn = cards.reduce((acc, card) => {
                if (!acc[card.column]) {
                    acc[card.column] = [];
                }
                acc[card.column].push(card);
                return acc;
            }, {} as Record<ColumnType, RetrospectiveCard[]>);

            expect(cardsByColumn['helped']).toHaveLength(1);
            expect(cardsByColumn['hindered']).toHaveLength(1);
            expect(cardsByColumn['improve']).toHaveLength(1);
            expect(cardsByColumn['actions']).toHaveLength(1);
        });

        it('should handle vote sorting', () => {
            const cards: RetrospectiveCard[] = [
                {
                    id: 'c1',
                    content: 'Low votes',
                    column: 'helped',
                    createdBy: 'user1',
                    createdAt: new Date(),
                    retrospectiveId: 'retro1',
                    votes: 1
                },
                {
                    id: 'c2',
                    content: 'High votes',
                    column: 'helped',
                    createdBy: 'user2',
                    createdAt: new Date(),
                    retrospectiveId: 'retro1',
                    votes: 10
                },
                {
                    id: 'c3',
                    content: 'No votes',
                    column: 'helped',
                    createdBy: 'user3',
                    createdAt: new Date(),
                    retrospectiveId: 'retro1'
                },
                {
                    id: 'c4',
                    content: 'Medium votes',
                    column: 'helped',
                    createdBy: 'user4',
                    createdAt: new Date(),
                    retrospectiveId: 'retro1',
                    votes: 5
                }
            ];

            const sortedByVotes = [...cards].sort((a, b) =>
                (b.votes || 0) - (a.votes || 0)
            );

            expect(sortedByVotes[0].content).toBe('High votes');
            expect(sortedByVotes[1].content).toBe('Medium votes');
            expect(sortedByVotes[2].content).toBe('Low votes');
            expect(sortedByVotes[3].content).toBe('No votes');
        });
    });

    describe('Retrospective interface', () => {
        it('should have correct structure with all properties', () => {
            const retrospective: Retrospective = {
                id: 'retro123',
                title: 'Sprint 15 Retrospective',
                description: 'End of sprint retrospective',
                createdBy: 'user456',
                createdAt: new Date('2024-01-15T10:00:00Z'),
                updatedAt: new Date('2024-01-15T12:00:00Z'),
                participantCount: 8,
                isActive: true
            };

            expect(typeof retrospective.id).toBe('string');
            expect(typeof retrospective.title).toBe('string');
            expect(typeof retrospective.description).toBe('string');
            expect(typeof retrospective.createdBy).toBe('string');
            expect(retrospective.createdAt).toBeInstanceOf(Date);
            expect(retrospective.updatedAt).toBeInstanceOf(Date);
            expect(typeof retrospective.participantCount).toBe('number');
            expect(typeof retrospective.isActive).toBe('boolean');
        });

        it('should handle optional description', () => {
            const retroWithDescription: Retrospective = {
                id: 'retro456',
                title: 'Sprint Retrospective',
                description: 'Detailed description of the retrospective',
                createdBy: 'facilitator123',
                createdAt: new Date(),
                updatedAt: new Date(),
                participantCount: 5,
                isActive: true
            };

            const retroWithoutDescription: Retrospective = {
                id: 'retro789',
                title: 'Quick Retro',
                createdBy: 'facilitator456',
                createdAt: new Date(),
                updatedAt: new Date(),
                participantCount: 3,
                isActive: false
            };

            expect(retroWithDescription.description).toBe('Detailed description of the retrospective');
            expect(retroWithoutDescription.description).toBeUndefined();
        });

        it('should handle active and inactive retrospectives', () => {
            const activeRetro: Retrospective = {
                id: 'active123',
                title: 'Active Retrospective',
                createdBy: 'user123',
                createdAt: new Date(),
                updatedAt: new Date(),
                participantCount: 10,
                isActive: true
            };

            const inactiveRetro: Retrospective = {
                id: 'inactive456',
                title: 'Completed Retrospective',
                createdBy: 'user456',
                createdAt: new Date(),
                updatedAt: new Date(),
                participantCount: 7,
                isActive: false
            };

            expect(activeRetro.isActive).toBe(true);
            expect(inactiveRetro.isActive).toBe(false);
        });

        it('should handle participant count variations', () => {
            const smallRetro: Retrospective = {
                id: 'small123',
                title: 'Small Team Retro',
                createdBy: 'user123',
                createdAt: new Date(),
                updatedAt: new Date(),
                participantCount: 2,
                isActive: true
            };

            const largeRetro: Retrospective = {
                id: 'large456',
                title: 'Large Team Retro',
                createdBy: 'user456',
                createdAt: new Date(),
                updatedAt: new Date(),
                participantCount: 25,
                isActive: true
            };

            const emptyRetro: Retrospective = {
                id: 'empty789',
                title: 'Empty Retro',
                createdBy: 'user789',
                createdAt: new Date(),
                updatedAt: new Date(),
                participantCount: 0,
                isActive: false
            };

            expect(smallRetro.participantCount).toBe(2);
            expect(largeRetro.participantCount).toBe(25);
            expect(emptyRetro.participantCount).toBe(0);
        });

        it('should handle date operations', () => {
            const createdDate = new Date('2024-01-01T09:00:00Z');
            const updatedDate = new Date('2024-01-01T15:30:00Z');

            const retrospective: Retrospective = {
                id: 'date-test',
                title: 'Date Test Retro',
                description: 'Testing date handling',
                createdBy: 'facilitator789',
                createdAt: createdDate,
                updatedAt: updatedDate,
                participantCount: 12,
                isActive: true
            };

            expect(retrospective.createdAt.getTime()).toBe(createdDate.getTime());
            expect(retrospective.updatedAt.getTime()).toBe(updatedDate.getTime());
            expect(retrospective.updatedAt.getTime()).toBeGreaterThan(retrospective.createdAt.getTime());

            // Calculate duration
            const durationMs = retrospective.updatedAt.getTime() - retrospective.createdAt.getTime();
            const durationHours = durationMs / (1000 * 60 * 60);
            expect(durationHours).toBe(6.5);
        });
    });

    describe('Type Utilities and Operations', () => {
        it('should work with retrospective filtering', () => {
            const retrospectives: Retrospective[] = [
                {
                    id: 'r1',
                    title: 'Active Retro 1',
                    description: 'First active retrospective',
                    createdBy: 'f1',
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-01'),
                    participantCount: 10,
                    isActive: true
                },
                {
                    id: 'r2',
                    title: 'Inactive Retro',
                    description: 'Completed retrospective',
                    createdBy: 'f2',
                    createdAt: new Date('2024-01-02'),
                    updatedAt: new Date('2024-01-02'),
                    participantCount: 8,
                    isActive: false
                },
                {
                    id: 'r3',
                    title: 'Small Active Retro',
                    createdBy: 'f3',
                    createdAt: new Date('2024-01-03'),
                    updatedAt: new Date('2024-01-03'),
                    participantCount: 3,
                    isActive: true
                }
            ];

            const activeRetros = retrospectives.filter(r => r.isActive);
            const largeRetros = retrospectives.filter(r => r.participantCount >= 8);
            const retrosWithDescription = retrospectives.filter(r => r.description);

            expect(activeRetros).toHaveLength(2);
            expect(activeRetros.map(r => r.title)).toEqual(['Active Retro 1', 'Small Active Retro']);

            expect(largeRetros).toHaveLength(2);
            expect(largeRetros.map(r => r.participantCount)).toEqual([10, 8]);

            expect(retrosWithDescription).toHaveLength(2);
            expect(retrosWithDescription.map(r => r.title)).toEqual(['Active Retro 1', 'Inactive Retro']);
        });

        it('should handle card aggregation by retrospective', () => {
            const cards: RetrospectiveCard[] = [
                {
                    id: 'c1',
                    content: 'Card 1',
                    column: 'helped',
                    createdBy: 'user1',
                    createdAt: new Date(),
                    retrospectiveId: 'retro1',
                    votes: 5
                },
                {
                    id: 'c2',
                    content: 'Card 2',
                    column: 'hindered',
                    createdBy: 'user2',
                    createdAt: new Date(),
                    retrospectiveId: 'retro1',
                    votes: 3
                },
                {
                    id: 'c3',
                    content: 'Card 3',
                    column: 'helped',
                    createdBy: 'user3',
                    createdAt: new Date(),
                    retrospectiveId: 'retro2',
                    votes: 2
                }
            ];

            // Group cards by retrospective
            const cardsByRetro = cards.reduce((acc, card) => {
                if (!acc[card.retrospectiveId]) {
                    acc[card.retrospectiveId] = [];
                }
                acc[card.retrospectiveId].push(card);
                return acc;
            }, {} as Record<string, RetrospectiveCard[]>);

            // Calculate total votes per retrospective
            const votesByRetro = Object.entries(cardsByRetro).reduce((acc, [retroId, retroCards]) => {
                acc[retroId] = retroCards.reduce((sum, card) => sum + (card.votes || 0), 0);
                return acc;
            }, {} as Record<string, number>);

            expect(Object.keys(cardsByRetro)).toEqual(['retro1', 'retro2']);
            expect(cardsByRetro['retro1']).toHaveLength(2);
            expect(cardsByRetro['retro2']).toHaveLength(1);

            expect(votesByRetro['retro1']).toBe(8); // 5 + 3
            expect(votesByRetro['retro2']).toBe(2);
        });

        it('should handle retrospective statistics', () => {
            const retrospectives: Retrospective[] = [
                {
                    id: 'r1',
                    title: 'Retro 1',
                    createdBy: 'f1',
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-01'),
                    participantCount: 5,
                    isActive: true
                },
                {
                    id: 'r2',
                    title: 'Retro 2',
                    createdBy: 'f2',
                    createdAt: new Date('2024-01-02'),
                    updatedAt: new Date('2024-01-02'),
                    participantCount: 10,
                    isActive: false
                },
                {
                    id: 'r3',
                    title: 'Retro 3',
                    createdBy: 'f3',
                    createdAt: new Date('2024-01-03'),
                    updatedAt: new Date('2024-01-03'),
                    participantCount: 7,
                    isActive: true
                }
            ];

            const stats = {
                total: retrospectives.length,
                active: retrospectives.filter(r => r.isActive).length,
                inactive: retrospectives.filter(r => !r.isActive).length,
                totalParticipants: retrospectives.reduce((sum, r) => sum + r.participantCount, 0),
                averageParticipants: retrospectives.reduce((sum, r) => sum + r.participantCount, 0) / retrospectives.length
            };

            expect(stats.total).toBe(3);
            expect(stats.active).toBe(2);
            expect(stats.inactive).toBe(1);
            expect(stats.totalParticipants).toBe(22);
            expect(stats.averageParticipants).toBeCloseTo(7.33, 2);
            expect(stats.active + stats.inactive).toBe(stats.total);
        });
    });
});
