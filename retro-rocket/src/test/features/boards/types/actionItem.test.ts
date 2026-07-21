import { describe, it, expect } from 'vitest';
import {
    ActionItem,
    ActionItemsState,
    CreateActionItemInput
} from '@/features/boards/types/actionItem';

describe('ActionItem Types', () => {
    describe('ActionItem interface', () => {
        it('should have correct structure with required properties', () => {
            const actionItem: ActionItem = {
                id: 'action123',
                content: 'Implement new feature',
                retrospectiveId: 'retro456',
                createdBy: 'facilitator123',
                createdAt: new Date(),
                updatedAt: new Date(),
                assignedTo: null,
                assignedToName: null
            };

            expect(typeof actionItem.id).toBe('string');
            expect(typeof actionItem.content).toBe('string');
            expect(typeof actionItem.retrospectiveId).toBe('string');
            expect(typeof actionItem.createdBy).toBe('string');
            expect(actionItem.createdAt).toBeInstanceOf(Date);
            expect(actionItem.updatedAt).toBeInstanceOf(Date);

            // Required properties
            expect(actionItem).toHaveProperty('id');
            expect(actionItem).toHaveProperty('content');
            expect(actionItem).toHaveProperty('retrospectiveId');
            expect(actionItem).toHaveProperty('createdBy');
            expect(actionItem).toHaveProperty('createdAt');
            expect(actionItem).toHaveProperty('updatedAt');
            expect(actionItem).toHaveProperty('assignedTo');
            expect(actionItem).toHaveProperty('assignedToName');
        });

        it('should handle assigned user properties', () => {
            const assignedActionItem: ActionItem = {
                id: 'action456',
                content: 'Fix bug in login',
                retrospectiveId: 'retro789',
                createdBy: 'facilitator456',
                createdAt: new Date(),
                updatedAt: new Date(),
                assignedTo: 'user123',
                assignedToName: 'John Doe'
            };

            const unassignedActionItem: ActionItem = {
                id: 'action789',
                content: 'Research new tools',
                retrospectiveId: 'retro101',
                createdBy: 'facilitator789',
                createdAt: new Date(),
                updatedAt: new Date(),
                assignedTo: null,
                assignedToName: null
            };

            expect(assignedActionItem.assignedTo).toBe('user123');
            expect(assignedActionItem.assignedToName).toBe('John Doe');

            expect(unassignedActionItem.assignedTo).toBeNull();
            expect(unassignedActionItem.assignedToName).toBeNull();
        });

        it('should handle optional order property', () => {
            const withOrder: ActionItem = {
                id: 'action111',
                content: 'Test with order',
                retrospectiveId: 'retro222',
                createdBy: 'facilitator111',
                createdAt: new Date(),
                updatedAt: new Date(),
                assignedTo: null,
                assignedToName: null,
                order: 5
            };

            const withoutOrder: ActionItem = {
                id: 'action222',
                content: 'Test without order',
                retrospectiveId: 'retro333',
                createdBy: 'facilitator222',
                createdAt: new Date(),
                updatedAt: new Date(),
                assignedTo: null,
                assignedToName: null
            };

            expect(withOrder.order).toBe(5);
            expect(withoutOrder.order).toBeUndefined();
        });

        it('should validate dates are properly set', () => {
            const now = new Date();
            const actionItem: ActionItem = {
                id: 'test',
                content: 'Test content',
                retrospectiveId: 'retro',
                createdBy: 'user',
                createdAt: now,
                updatedAt: now,
                assignedTo: null,
                assignedToName: null
            };

            expect(actionItem.createdAt.getTime()).toBe(now.getTime());
            expect(actionItem.updatedAt.getTime()).toBe(now.getTime());
            expect(actionItem.updatedAt.getTime()).toBeGreaterThanOrEqual(actionItem.createdAt.getTime());
        });
    });

    describe('CreateActionItemInput interface', () => {
        it('should have correct structure with required properties', () => {
            const createInput: CreateActionItemInput = {
                content: 'New action item',
                retrospectiveId: 'retro123',
                createdBy: 'facilitator123'
            };

            expect(typeof createInput.content).toBe('string');
            expect(typeof createInput.retrospectiveId).toBe('string');
            expect(typeof createInput.createdBy).toBe('string');

            // Required properties
            expect(createInput).toHaveProperty('content');
            expect(createInput).toHaveProperty('retrospectiveId');
            expect(createInput).toHaveProperty('createdBy');
        });

        it('should handle optional assignment properties', () => {
            const withAssignment: CreateActionItemInput = {
                content: 'Action with assignment',
                retrospectiveId: 'retro456',
                createdBy: 'facilitator456',
                assignedTo: 'user789',
                assignedToName: 'Jane Smith'
            };

            const withoutAssignment: CreateActionItemInput = {
                content: 'Action without assignment',
                retrospectiveId: 'retro789',
                createdBy: 'facilitator789'
            };

            expect(withAssignment.assignedTo).toBe('user789');
            expect(withAssignment.assignedToName).toBe('Jane Smith');

            expect(withoutAssignment.assignedTo).toBeUndefined();
            expect(withoutAssignment.assignedToName).toBeUndefined();
        });

        it('should handle partial assignment (only ID or only name)', () => {
            const onlyId: CreateActionItemInput = {
                content: 'Action with only ID',
                retrospectiveId: 'retro111',
                createdBy: 'facilitator111',
                assignedTo: 'user111',
                assignedToName: null
            };

            const onlyName: CreateActionItemInput = {
                content: 'Action with only name',
                retrospectiveId: 'retro222',
                createdBy: 'facilitator222',
                assignedTo: null,
                assignedToName: 'Anonymous User'
            };

            expect(onlyId.assignedTo).toBe('user111');
            expect(onlyId.assignedToName).toBeNull();

            expect(onlyName.assignedTo).toBeNull();
            expect(onlyName.assignedToName).toBe('Anonymous User');
        });

        it('should be compatible with ActionItem creation', () => {
            const input: CreateActionItemInput = {
                content: 'Create new test',
                retrospectiveId: 'retro999',
                createdBy: 'facilitator999',
                assignedTo: 'user999',
                assignedToName: 'Test User'
            };

            // Simulate ActionItem creation from input
            const actionItem: ActionItem = {
                id: 'generated-id',
                content: input.content,
                retrospectiveId: input.retrospectiveId,
                createdBy: input.createdBy,
                assignedTo: input.assignedTo || null,
                assignedToName: input.assignedToName || null,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            expect(actionItem.content).toBe(input.content);
            expect(actionItem.retrospectiveId).toBe(input.retrospectiveId);
            expect(actionItem.createdBy).toBe(input.createdBy);
            expect(actionItem.assignedTo).toBe(input.assignedTo);
            expect(actionItem.assignedToName).toBe(input.assignedToName);
            expect(actionItem).toHaveProperty('id');
            expect(actionItem).toHaveProperty('createdAt');
            expect(actionItem).toHaveProperty('updatedAt');
        });
    });

    describe('ActionItemsState interface', () => {
        it('should have correct structure', () => {
            const state: ActionItemsState = {
                actionItems: [],
                loading: false,
                error: null
            };

            expect(Array.isArray(state.actionItems)).toBe(true);
            expect(typeof state.loading).toBe('boolean');
            expect(state.error).toBeNull();

            // Required properties
            expect(state).toHaveProperty('actionItems');
            expect(state).toHaveProperty('loading');
            expect(state).toHaveProperty('error');
        });

        it('should handle populated action items array', () => {
            const actionItems: ActionItem[] = [
                {
                    id: 'action1',
                    content: 'First action',
                    retrospectiveId: 'retro1',
                    createdBy: 'user1',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    assignedTo: null,
                    assignedToName: null
                },
                {
                    id: 'action2',
                    content: 'Second action',
                    retrospectiveId: 'retro1',
                    createdBy: 'user1',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    assignedTo: 'user2',
                    assignedToName: 'Assigned User'
                }
            ];

            const state: ActionItemsState = {
                actionItems,
                loading: true,
                error: null
            };

            expect(state.actionItems).toHaveLength(2);
            expect(state.actionItems[0].content).toBe('First action');
            expect(state.actionItems[1].assignedTo).toBe('user2');
            expect(state.loading).toBe(true);
        });

        it('should handle error states', () => {
            const errorState: ActionItemsState = {
                actionItems: [],
                loading: false,
                error: 'Failed to load action items'
            };

            const noErrorState: ActionItemsState = {
                actionItems: [],
                loading: false,
                error: null
            };

            expect(errorState.error).toBe('Failed to load action items');
            expect(noErrorState.error).toBeNull();
        });

        it('should handle different loading states', () => {
            const loadingState: ActionItemsState = {
                actionItems: [],
                loading: true,
                error: null
            };

            const loadedState: ActionItemsState = {
                actionItems: [
                    {
                        id: 'test',
                        content: 'test',
                        retrospectiveId: 'retro',
                        createdBy: 'user',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        assignedTo: null,
                        assignedToName: null
                    }
                ],
                loading: false,
                error: null
            };

            expect(loadingState.loading).toBe(true);
            expect(loadingState.actionItems).toHaveLength(0);

            expect(loadedState.loading).toBe(false);
            expect(loadedState.actionItems).toHaveLength(1);
        });
    });

    describe('Type Compatibility and Utilities', () => {
        it('should work with type guards', () => {
            const isActionItemAssigned = (item: ActionItem): boolean => {
                return item.assignedTo !== null && item.assignedToName !== null;
            };

            const assignedItem: ActionItem = {
                id: 'test1',
                content: 'Assigned item',
                retrospectiveId: 'retro',
                createdBy: 'user',
                createdAt: new Date(),
                updatedAt: new Date(),
                assignedTo: 'user123',
                assignedToName: 'Test User'
            };

            const unassignedItem: ActionItem = {
                id: 'test2',
                content: 'Unassigned item',
                retrospectiveId: 'retro',
                createdBy: 'user',
                createdAt: new Date(),
                updatedAt: new Date(),
                assignedTo: null,
                assignedToName: null
            };

            expect(isActionItemAssigned(assignedItem)).toBe(true);
            expect(isActionItemAssigned(unassignedItem)).toBe(false);
        });

        it('should work with array operations', () => {
            const actionItems: ActionItem[] = [
                {
                    id: 'action1',
                    content: 'First action',
                    retrospectiveId: 'retro1',
                    createdBy: 'user1',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    assignedTo: 'user2',
                    assignedToName: 'User Two'
                },
                {
                    id: 'action2',
                    content: 'Second action',
                    retrospectiveId: 'retro1',
                    createdBy: 'user1',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    assignedTo: null,
                    assignedToName: null
                }
            ];

            const assignedItems = actionItems.filter(item => item.assignedTo !== null);
            const itemContents = actionItems.map(item => item.content);

            expect(assignedItems).toHaveLength(1);
            expect(assignedItems[0].assignedToName).toBe('User Two');
            expect(itemContents).toEqual(['First action', 'Second action']);
        });

        it('should handle state transformations', () => {
            const getActionItemSummary = (state: ActionItemsState): string => {
                if (state.loading) return 'Loading...';
                if (state.error) return `Error: ${state.error}`;
                return `${state.actionItems.length} action items`;
            };

            const loadingState: ActionItemsState = {
                actionItems: [],
                loading: true,
                error: null
            };

            const errorState: ActionItemsState = {
                actionItems: [],
                loading: false,
                error: 'Network error'
            };

            const loadedState: ActionItemsState = {
                actionItems: [
                    {
                        id: 'test',
                        content: 'test',
                        retrospectiveId: 'retro',
                        createdBy: 'user',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        assignedTo: null,
                        assignedToName: null
                    }
                ],
                loading: false,
                error: null
            };

            expect(getActionItemSummary(loadingState)).toBe('Loading...');
            expect(getActionItemSummary(errorState)).toBe('Error: Network error');
            expect(getActionItemSummary(loadedState)).toBe('1 action items');
        });
    });
});
