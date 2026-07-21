import { describe, it, expect } from 'vitest';
import {
    TypingStatus,
    TypingIndicator,
    TypingStatusUpdate
} from '@/features/boards/types/typing';
import { ColumnType } from '@/features/boards/types/retrospective';

describe('Typing Types', () => {
    describe('TypingStatus interface', () => {
        it('should have correct structure with required properties', () => {
            const typingStatus: TypingStatus = {
                id: 'typing-status-1',
                userId: 'user-123',
                username: 'john_doe',
                retrospectiveId: 'retro-456',
                column: 'helped',
                timestamp: new Date(),
                isActive: true
            };

            expect(typingStatus).toHaveProperty('id');
            expect(typingStatus).toHaveProperty('userId');
            expect(typingStatus).toHaveProperty('username');
            expect(typingStatus).toHaveProperty('retrospectiveId');
            expect(typingStatus).toHaveProperty('column');
            expect(typingStatus).toHaveProperty('timestamp');
            expect(typingStatus).toHaveProperty('isActive');

            expect(typeof typingStatus.id).toBe('string');
            expect(typeof typingStatus.userId).toBe('string');
            expect(typeof typingStatus.username).toBe('string');
            expect(typeof typingStatus.retrospectiveId).toBe('string');
            expect(typeof typingStatus.column).toBe('string');
            expect(typingStatus.timestamp instanceof Date).toBe(true);
            expect(typeof typingStatus.isActive).toBe('boolean');
        });

        it('should handle different column types', () => {
            const columns: ColumnType[] = [
                'helped',
                'hindered',
                'improve',
                'actions'
            ];

            columns.forEach(column => {
                const typingStatus: TypingStatus = {
                    id: `typing-${column}-1`,
                    userId: 'user-123',
                    username: 'user_name',
                    retrospectiveId: 'retro-456',
                    column,
                    timestamp: new Date(),
                    isActive: true
                };

                expect(typingStatus.column).toBe(column);
                expect(['helped', 'hindered', 'improve', 'actions']).toContain(column);
            });
        });

        it('should handle active and inactive states', () => {
            const activeStatus: TypingStatus = {
                id: 'typing-active-1',
                userId: 'user-123',
                username: 'active_user',
                retrospectiveId: 'retro-456',
                column: 'helped',
                timestamp: new Date(),
                isActive: true
            };

            const inactiveStatus: TypingStatus = {
                id: 'typing-inactive-1',
                userId: 'user-456',
                username: 'inactive_user',
                retrospectiveId: 'retro-456',
                column: 'hindered',
                timestamp: new Date(Date.now() - 5000),
                isActive: false
            };

            expect(activeStatus.isActive).toBe(true);
            expect(inactiveStatus.isActive).toBe(false);
            expect(activeStatus.timestamp.getTime()).toBeGreaterThan(inactiveStatus.timestamp.getTime());
        });

        it('should handle different users and retrospectives', () => {
            const user1Status: TypingStatus = {
                id: 'typing-user1',
                userId: 'user-111',
                username: 'alice',
                retrospectiveId: 'retro-aaa',
                column: 'helped',
                timestamp: new Date(),
                isActive: true
            };

            const user2Status: TypingStatus = {
                id: 'typing-user2',
                userId: 'user-222',
                username: 'bob',
                retrospectiveId: 'retro-bbb',
                column: 'actions',
                timestamp: new Date(),
                isActive: false
            };

            expect(user1Status.userId).not.toBe(user2Status.userId);
            expect(user1Status.username).not.toBe(user2Status.username);
            expect(user1Status.retrospectiveId).not.toBe(user2Status.retrospectiveId);
        });

        it('should handle timestamp variations', () => {
            const now = new Date();
            const pastTime = new Date(now.getTime() - 10000);
            const futureTime = new Date(now.getTime() + 10000);

            const recentStatus: TypingStatus = {
                id: 'typing-recent',
                userId: 'user-123',
                username: 'recent_user',
                retrospectiveId: 'retro-456',
                column: 'helped',
                timestamp: now,
                isActive: true
            };

            const pastStatus: TypingStatus = {
                id: 'typing-past',
                userId: 'user-456',
                username: 'past_user',
                retrospectiveId: 'retro-456',
                column: 'hindered',
                timestamp: pastTime,
                isActive: false
            };

            const futureStatus: TypingStatus = {
                id: 'typing-future',
                userId: 'user-789',
                username: 'future_user',
                retrospectiveId: 'retro-456',
                column: 'actions',
                timestamp: futureTime,
                isActive: true
            };

            expect(recentStatus.timestamp.getTime()).toBeGreaterThan(pastStatus.timestamp.getTime());
            expect(futureStatus.timestamp.getTime()).toBeGreaterThan(recentStatus.timestamp.getTime());
        });
    });

    describe('TypingIndicator interface', () => {
        it('should have correct structure with required properties', () => {
            const indicator: TypingIndicator = {
                userId: 'user-123',
                username: 'john_doe',
                column: 'helped',
                lastActivity: new Date()
            };

            expect(indicator).toHaveProperty('userId');
            expect(indicator).toHaveProperty('username');
            expect(indicator).toHaveProperty('column');
            expect(indicator).toHaveProperty('lastActivity');

            expect(typeof indicator.userId).toBe('string');
            expect(typeof indicator.username).toBe('string');
            expect(typeof indicator.column).toBe('string');
            expect(indicator.lastActivity instanceof Date).toBe(true);
        });

        it('should handle different column types', () => {
            const columns: ColumnType[] = [
                'helped',
                'hindered',
                'improve',
                'actions'
            ];

            columns.forEach(column => {
                const indicator: TypingIndicator = {
                    userId: 'user-123',
                    username: 'test_user',
                    column,
                    lastActivity: new Date()
                };

                expect(indicator.column).toBe(column);
                expect(['helped', 'hindered', 'improve', 'actions']).toContain(column);
            });
        });

        it('should handle multiple users with different activities', () => {
            const indicator1: TypingIndicator = {
                userId: 'user-111',
                username: 'alice',
                column: 'helped',
                lastActivity: new Date(Date.now() - 1000)
            };

            const indicator2: TypingIndicator = {
                userId: 'user-222',
                username: 'bob',
                column: 'hindered',
                lastActivity: new Date(Date.now() - 2000)
            };

            const indicator3: TypingIndicator = {
                userId: 'user-333',
                username: 'charlie',
                column: 'actions',
                lastActivity: new Date()
            };

            expect(indicator1.userId).not.toBe(indicator2.userId);
            expect(indicator2.userId).not.toBe(indicator3.userId);
            expect(indicator1.lastActivity.getTime()).toBeGreaterThan(indicator2.lastActivity.getTime());
            expect(indicator3.lastActivity.getTime()).toBeGreaterThan(indicator1.lastActivity.getTime());
        });

        it('should handle activity timing scenarios', () => {
            const recentActivity = new Date();
            const oldActivity = new Date(Date.now() - 30000); // 30 seconds ago

            const recentIndicator: TypingIndicator = {
                userId: 'user-recent',
                username: 'recent_user',
                column: 'helped',
                lastActivity: recentActivity
            };

            const staleIndicator: TypingIndicator = {
                userId: 'user-stale',
                username: 'stale_user',
                column: 'hindered',
                lastActivity: oldActivity
            };

            const timeDifference = recentIndicator.lastActivity.getTime() - staleIndicator.lastActivity.getTime();
            expect(timeDifference).toBeGreaterThan(25000); // At least 25 seconds difference
        });
    });

    describe('TypingStatusUpdate interface', () => {
        it('should have correct structure with required properties', () => {
            const update: TypingStatusUpdate = {
                userId: 'user-123',
                username: 'john_doe',
                retrospectiveId: 'retro-456',
                column: 'helped',
                isActive: true
            };

            expect(update).toHaveProperty('userId');
            expect(update).toHaveProperty('username');
            expect(update).toHaveProperty('retrospectiveId');
            expect(update).toHaveProperty('column');
            expect(update).toHaveProperty('isActive');

            expect(typeof update.userId).toBe('string');
            expect(typeof update.username).toBe('string');
            expect(typeof update.retrospectiveId).toBe('string');
            expect(typeof update.column).toBe('string');
            expect(typeof update.isActive).toBe('boolean');
        });

        it('should handle start and stop typing updates', () => {
            const startTyping: TypingStatusUpdate = {
                userId: 'user-123',
                username: 'typing_user',
                retrospectiveId: 'retro-456',
                column: 'helped',
                isActive: true
            };

            const stopTyping: TypingStatusUpdate = {
                userId: 'user-123',
                username: 'typing_user',
                retrospectiveId: 'retro-456',
                column: 'helped',
                isActive: false
            };

            expect(startTyping.isActive).toBe(true);
            expect(stopTyping.isActive).toBe(false);
            expect(startTyping.userId).toBe(stopTyping.userId);
            expect(startTyping.column).toBe(stopTyping.column);
        });

        it('should handle different column updates', () => {
            const columns: ColumnType[] = [
                'helped',
                'hindered',
                'improve',
                'actions'
            ];

            columns.forEach(column => {
                const update: TypingStatusUpdate = {
                    userId: 'user-123',
                    username: 'test_user',
                    retrospectiveId: 'retro-456',
                    column,
                    isActive: true
                };

                expect(update.column).toBe(column);
                expect(['helped', 'hindered', 'improve', 'actions']).toContain(column);
            });
        });

        it('should handle multiple users in same retrospective', () => {
            const retrospectiveId = 'retro-shared';

            const user1Update: TypingStatusUpdate = {
                userId: 'user-111',
                username: 'alice',
                retrospectiveId,
                column: 'helped',
                isActive: true
            };

            const user2Update: TypingStatusUpdate = {
                userId: 'user-222',
                username: 'bob',
                retrospectiveId,
                column: 'hindered',
                isActive: true
            };

            const user3Update: TypingStatusUpdate = {
                userId: 'user-333',
                username: 'charlie',
                retrospectiveId,
                column: 'actions',
                isActive: false
            };

            expect(user1Update.retrospectiveId).toBe(retrospectiveId);
            expect(user2Update.retrospectiveId).toBe(retrospectiveId);
            expect(user3Update.retrospectiveId).toBe(retrospectiveId);

            expect(user1Update.userId).not.toBe(user2Update.userId);
            expect(user2Update.userId).not.toBe(user3Update.userId);
        });
    });

    describe('Type Utilities and Operations', () => {
        it('should work with typing status transformations', () => {
            const baseUpdate: TypingStatusUpdate = {
                userId: 'user-123',
                username: 'test_user',
                retrospectiveId: 'retro-456',
                column: 'helped',
                isActive: true
            };

            const createTypingStatus = (update: TypingStatusUpdate, id: string): TypingStatus => ({
                id,
                userId: update.userId,
                username: update.username,
                retrospectiveId: update.retrospectiveId,
                column: update.column,
                timestamp: new Date(),
                isActive: update.isActive
            });

            const status = createTypingStatus(baseUpdate, 'generated-id');

            expect(status.id).toBe('generated-id');
            expect(status.userId).toBe(baseUpdate.userId);
            expect(status.username).toBe(baseUpdate.username);
            expect(status.retrospectiveId).toBe(baseUpdate.retrospectiveId);
            expect(status.column).toBe(baseUpdate.column);
            expect(status.isActive).toBe(baseUpdate.isActive);
            expect(status.timestamp instanceof Date).toBe(true);
        });

        it('should work with indicator creation from status', () => {
            const status: TypingStatus = {
                id: 'typing-status-1',
                userId: 'user-123',
                username: 'test_user',
                retrospectiveId: 'retro-456',
                column: 'helped',
                timestamp: new Date(),
                isActive: true
            };

            const createIndicator = (status: TypingStatus): TypingIndicator => ({
                userId: status.userId,
                username: status.username,
                column: status.column,
                lastActivity: status.timestamp
            });

            const indicator = createIndicator(status);

            expect(indicator.userId).toBe(status.userId);
            expect(indicator.username).toBe(status.username);
            expect(indicator.column).toBe(status.column);
            expect(indicator.lastActivity).toBe(status.timestamp);
        });

        it('should work with typing status filtering', () => {
            const statuses: TypingStatus[] = [
                {
                    id: 'status-1',
                    userId: 'user-111',
                    username: 'alice',
                    retrospectiveId: 'retro-456',
                    column: 'helped',
                    timestamp: new Date(),
                    isActive: true
                },
                {
                    id: 'status-2',
                    userId: 'user-222',
                    username: 'bob',
                    retrospectiveId: 'retro-456',
                    column: 'hindered',
                    timestamp: new Date(),
                    isActive: false
                },
                {
                    id: 'status-3',
                    userId: 'user-111',
                    username: 'alice',
                    retrospectiveId: 'retro-789',
                    column: 'actions',
                    timestamp: new Date(),
                    isActive: true
                }
            ];

            const activeStatuses = statuses.filter(s => s.isActive);
            const aliceStatuses = statuses.filter(s => s.userId === 'user-111');
            const retro456Statuses = statuses.filter(s => s.retrospectiveId === 'retro-456');

            expect(activeStatuses).toHaveLength(2);
            expect(aliceStatuses).toHaveLength(2);
            expect(retro456Statuses).toHaveLength(2);
        });

        it('should work with typing activity validation', () => {
            const isRecentActivity = (indicator: TypingIndicator, thresholdMs: number = 5000): boolean => {
                const now = Date.now();
                const activityTime = indicator.lastActivity.getTime();
                return (now - activityTime) <= thresholdMs;
            };

            const recentIndicator: TypingIndicator = {
                userId: 'user-123',
                username: 'recent_user',
                column: 'helped',
                lastActivity: new Date(Date.now() - 2000) // 2 seconds ago
            };

            const staleIndicator: TypingIndicator = {
                userId: 'user-456',
                username: 'stale_user',
                column: 'hindered',
                lastActivity: new Date(Date.now() - 10000) // 10 seconds ago
            };

            expect(isRecentActivity(recentIndicator)).toBe(true);
            expect(isRecentActivity(staleIndicator)).toBe(false);
            expect(isRecentActivity(staleIndicator, 15000)).toBe(true); // With higher threshold
        });

        it('should work with status update batching', () => {
            const updates: TypingStatusUpdate[] = [
                {
                    userId: 'user-111',
                    username: 'alice',
                    retrospectiveId: 'retro-456',
                    column: 'helped',
                    isActive: true
                },
                {
                    userId: 'user-222',
                    username: 'bob',
                    retrospectiveId: 'retro-456',
                    column: 'hindered',
                    isActive: false
                },
                {
                    userId: 'user-111',
                    username: 'alice',
                    retrospectiveId: 'retro-456',
                    column: 'actions',
                    isActive: true
                }
            ];

            const groupByUser = (updates: TypingStatusUpdate[]): Record<string, TypingStatusUpdate[]> => {
                return updates.reduce((acc, update) => {
                    if (!acc[update.userId]) {
                        acc[update.userId] = [];
                    }
                    acc[update.userId].push(update);
                    return acc;
                }, {} as Record<string, TypingStatusUpdate[]>);
            };

            const grouped = groupByUser(updates);

            expect(Object.keys(grouped)).toHaveLength(2);
            expect(grouped['user-111']).toHaveLength(2);
            expect(grouped['user-222']).toHaveLength(1);
        });

        it('should work with column-based typing tracking', () => {
            const indicators: TypingIndicator[] = [
                {
                    userId: 'user-111',
                    username: 'alice',
                    column: 'helped',
                    lastActivity: new Date()
                },
                {
                    userId: 'user-222',
                    username: 'bob',
                    column: 'helped',
                    lastActivity: new Date()
                },
                {
                    userId: 'user-333',
                    username: 'charlie',
                    column: 'hindered',
                    lastActivity: new Date()
                }
            ];

            const getTypingCountByColumn = (indicators: TypingIndicator[]): Record<ColumnType, number> => {
                return indicators.reduce((acc, indicator) => {
                    acc[indicator.column] = (acc[indicator.column] || 0) + 1;
                    return acc;
                }, {} as Record<ColumnType, number>);
            };

            const counts = getTypingCountByColumn(indicators);

            expect(counts['helped']).toBe(2);
            expect(counts['hindered']).toBe(1);
            expect(counts['actions']).toBeUndefined();
        });
    });
});
