import { describe, it, expect } from 'vitest';
import {
    GroupingCriteria,
    GroupingOption,
    ColumnGroupingState,
    ColumnGroupingStatesStore,
    DEFAULT_GROUPING_STATE
} from '../../types/columnGrouping';
import { List, Users, Sparkles } from 'lucide-react';

describe('Column Grouping Types', () => {
    describe('GroupingCriteria type', () => {
        it('should accept valid grouping criteria values', () => {
            const criteria1: GroupingCriteria = 'none';
            const criteria2: GroupingCriteria = 'user';
            const criteria3: GroupingCriteria = 'suggestions';

            expect(criteria1).toBe('none');
            expect(criteria2).toBe('user');
            expect(criteria3).toBe('suggestions');
        });

        it('should work with type guards', () => {
            const isValidCriteria = (value: string): value is GroupingCriteria => {
                return ['none', 'user', 'suggestions'].includes(value);
            };

            expect(isValidCriteria('none')).toBe(true);
            expect(isValidCriteria('user')).toBe(true);
            expect(isValidCriteria('suggestions')).toBe(true);
            expect(isValidCriteria('invalid')).toBe(false);
        });
    });

    describe('GroupingOption interface', () => {
        it('should have correct structure with required properties', () => {
            const option: GroupingOption = {
                value: 'user',
                label: 'Group by user',
                icon: Users
            };

            expect(option).toHaveProperty('value');
            expect(option).toHaveProperty('label');
            expect(option).toHaveProperty('icon');
            expect(typeof option.value).toBe('string');
            expect(typeof option.label).toBe('string');
            expect(typeof option.icon).toBe('object');
        });

        it('should handle optional description property', () => {
            const optionWithDescription: GroupingOption = {
                value: 'suggestions',
                label: 'Suggested groupings',
                icon: Sparkles,
                description: 'Automatic suggestions by similarity'
            };

            const optionWithoutDescription: GroupingOption = {
                value: 'none',
                label: 'No grouping',
                icon: List
            };

            expect(optionWithDescription.description).toBe('Automatic suggestions by similarity');
            expect(optionWithoutDescription.description).toBeUndefined();
        });

        it('should work with different icons', () => {
            const listOption: GroupingOption = {
                value: 'none',
                label: 'List view',
                icon: List
            };

            const usersOption: GroupingOption = {
                value: 'user',
                label: 'User grouping',
                icon: Users
            };

            const sparklesOption: GroupingOption = {
                value: 'suggestions',
                label: 'Smart suggestions',
                icon: Sparkles
            };

            expect(listOption.icon).toBe(List);
            expect(usersOption.icon).toBe(Users);
            expect(sparklesOption.icon).toBe(Sparkles);
        });
    });

    describe('ColumnGroupingState interface', () => {
        it('should have correct structure with required properties', () => {
            const state: ColumnGroupingState = {
                criteria: 'user',
                activeGroups: ['group1', 'group2']
            };

            expect(state).toHaveProperty('criteria');
            expect(state).toHaveProperty('activeGroups');
            expect(typeof state.criteria).toBe('string');
            expect(Array.isArray(state.activeGroups)).toBe(true);
        });

        it('should handle different criteria values', () => {
            const noneState: ColumnGroupingState = {
                criteria: 'none',
                activeGroups: []
            };

            const userState: ColumnGroupingState = {
                criteria: 'user',
                activeGroups: ['user1', 'user2']
            };

            const suggestionsState: ColumnGroupingState = {
                criteria: 'suggestions',
                activeGroups: ['similar-group-1', 'similar-group-2']
            };

            expect(noneState.criteria).toBe('none');
            expect(userState.criteria).toBe('user');
            expect(suggestionsState.criteria).toBe('suggestions');
        });

        it('should handle empty and populated activeGroups', () => {
            const emptyState: ColumnGroupingState = {
                criteria: 'none',
                activeGroups: []
            };

            const populatedState: ColumnGroupingState = {
                criteria: 'user',
                activeGroups: ['group1', 'group2', 'group3']
            };

            expect(emptyState.activeGroups).toHaveLength(0);
            expect(populatedState.activeGroups).toHaveLength(3);
            expect(populatedState.activeGroups).toContain('group1');
            expect(populatedState.activeGroups).toContain('group2');
            expect(populatedState.activeGroups).toContain('group3');
        });
    });

    describe('ColumnGroupingStatesStore interface', () => {
        it('should work as a record of column states', () => {
            const store: ColumnGroupingStatesStore = {
                'column1': {
                    criteria: 'user',
                    activeGroups: ['user1', 'user2']
                },
                'column2': {
                    criteria: 'suggestions',
                    activeGroups: ['group1']
                },
                'column3': {
                    criteria: 'none',
                    activeGroups: []
                }
            };

            expect(store['column1'].criteria).toBe('user');
            expect(store['column2'].criteria).toBe('suggestions');
            expect(store['column3'].criteria).toBe('none');
            expect(store['column1'].activeGroups).toHaveLength(2);
            expect(store['column2'].activeGroups).toHaveLength(1);
            expect(store['column3'].activeGroups).toHaveLength(0);
        });

        it('should handle dynamic column additions', () => {
            const store: ColumnGroupingStatesStore = {};

            store['new-column'] = {
                criteria: 'user',
                activeGroups: ['dynamic-group']
            };

            expect(store['new-column']).toBeDefined();
            expect(store['new-column'].criteria).toBe('user');
            expect(store['new-column'].activeGroups).toContain('dynamic-group');
        });

        it('should handle multiple column operations', () => {
            const store: ColumnGroupingStatesStore = {
                'col1': { criteria: 'none', activeGroups: [] },
                'col2': { criteria: 'user', activeGroups: ['u1'] }
            };

            // Add column
            store['col3'] = { criteria: 'suggestions', activeGroups: ['s1', 's2'] };

            // Update column
            store['col1'] = { criteria: 'user', activeGroups: ['new-user'] };

            // Delete column
            delete store['col2'];

            expect(Object.keys(store)).toHaveLength(2);
            expect(store['col1'].criteria).toBe('user');
            expect(store['col3'].activeGroups).toHaveLength(2);
            expect(store['col2']).toBeUndefined();
        });
    });

    describe('DEFAULT_GROUPING_STATE constant', () => {
        it('should have correct default values', () => {
            expect(DEFAULT_GROUPING_STATE.criteria).toBe('user');
            expect(DEFAULT_GROUPING_STATE.activeGroups).toEqual([]);
        });

        it('should be a valid ColumnGroupingState', () => {
            const state: ColumnGroupingState = DEFAULT_GROUPING_STATE;

            expect(state).toHaveProperty('criteria');
            expect(state).toHaveProperty('activeGroups');
            expect(['none', 'user', 'suggestions']).toContain(state.criteria);
            expect(Array.isArray(state.activeGroups)).toBe(true);
        });

        it('should be usable for initialization', () => {
            const store: ColumnGroupingStatesStore = {
                'column1': DEFAULT_GROUPING_STATE,
                'column2': { ...DEFAULT_GROUPING_STATE, criteria: 'suggestions' }
            };

            expect(store['column1'].criteria).toBe('user');
            expect(store['column1'].activeGroups).toEqual([]);
            expect(store['column2'].criteria).toBe('suggestions');
            expect(store['column2'].activeGroups).toEqual([]);
        });
    });

    describe('Type Utilities and Operations', () => {
        it('should work with grouping state transformations', () => {
            const initialState: ColumnGroupingState = {
                criteria: 'none',
                activeGroups: []
            };

            const updatedState: ColumnGroupingState = {
                ...initialState,
                criteria: 'user',
                activeGroups: ['user1', 'user2']
            };

            expect(initialState.criteria).toBe('none');
            expect(updatedState.criteria).toBe('user');
            expect(updatedState.activeGroups).toHaveLength(2);
        });

        it('should work with store operations', () => {
            const store: ColumnGroupingStatesStore = {};

            // Add columns
            const addColumn = (id: string, state: ColumnGroupingState) => {
                store[id] = state;
            };

            // Update column criteria
            const updateCriteria = (id: string, criteria: GroupingCriteria) => {
                if (store[id]) {
                    store[id] = { ...store[id], criteria };
                }
            };

            // Add active group
            const addActiveGroup = (id: string, groupId: string) => {
                if (store[id] && !store[id].activeGroups.includes(groupId)) {
                    store[id] = {
                        ...store[id],
                        activeGroups: [...store[id].activeGroups, groupId]
                    };
                }
            };

            addColumn('col1', DEFAULT_GROUPING_STATE);
            updateCriteria('col1', 'suggestions');
            addActiveGroup('col1', 'group1');

            expect(store['col1'].criteria).toBe('suggestions');
            expect(store['col1'].activeGroups).toContain('group1');
        });

        it('should work with state validation', () => {
            const isValidState = (state: any): state is ColumnGroupingState => {
                return (
                    typeof state === 'object' &&
                    state !== null &&
                    'criteria' in state &&
                    'activeGroups' in state &&
                    ['none', 'user', 'suggestions'].includes(state.criteria) &&
                    Array.isArray(state.activeGroups)
                );
            };

            const validState = { criteria: 'user', activeGroups: ['group1'] };
            const invalidState1 = { criteria: 'invalid', activeGroups: [] };
            const invalidState2 = { criteria: 'user', activeGroups: 'not-array' };

            expect(isValidState(validState)).toBe(true);
            expect(isValidState(invalidState1)).toBe(false);
            expect(isValidState(invalidState2)).toBe(false);
        });

        it('should work with grouping option creation', () => {
            const createOption = (
                value: GroupingCriteria,
                label: string,
                icon: any,
                description?: string
            ): GroupingOption => ({
                value,
                label,
                icon,
                description
            });

            const noneOption = createOption('none', 'No Grouping', List, 'Display all cards in a list');
            const userOption = createOption('user', 'Group by User', Users);

            expect(noneOption.value).toBe('none');
            expect(noneOption.description).toBe('Display all cards in a list');
            expect(userOption.description).toBeUndefined();
        });

        it('should work with criteria validation and mapping', () => {
            const criteriaLabels: Record<GroupingCriteria, string> = {
                'none': 'No Grouping',
                'user': 'Group by User',
                'suggestions': 'Smart Suggestions'
            };

            const getLabel = (criteria: GroupingCriteria): string => {
                return criteriaLabels[criteria];
            };

            expect(getLabel('none')).toBe('No Grouping');
            expect(getLabel('user')).toBe('Group by User');
            expect(getLabel('suggestions')).toBe('Smart Suggestions');
        });
    });
});
