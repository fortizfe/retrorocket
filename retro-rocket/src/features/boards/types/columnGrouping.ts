// Types for column grouping functionality
import { LucideIcon, List, Users, Sparkles } from 'lucide-react';

export type GroupingCriteria = 'none' | 'user' | 'suggestions';

export interface GroupingOption {
    value: GroupingCriteria;
    label: string;
    icon: LucideIcon;
    description?: string;
}

export interface ColumnGroupingState {
    criteria: GroupingCriteria;
    activeGroups: string[]; // IDs of active groups
}

// Function to get translated grouping options. `excludeUserGrouping` (spec
// 051-anonymous-board-mode, US2, FR-004/SC-003) omits the 'user' entry entirely
// rather than merely disabling it — an anonymous board must not let a participant
// even select "group by user" from the menu.
export const getGroupingOptions = (t?: (key: string) => string, excludeUserGrouping = false): GroupingOption[] => {
    // If no translation function provided, use a fallback
    const translate = t || ((key: string) => key);

    const options: GroupingOption[] = [
        {
            value: 'none',
            label: translate('retrospective.grouping.noGrouping'),
            icon: List,
            description: translate('retrospective.grouping.traditionalListView')
        },
        {
            value: 'user',
            label: translate('retrospective.grouping.groupByUser'),
            icon: Users,
            description: translate('retrospective.grouping.groupCardsByCreator')
        },
        {
            value: 'suggestions',
            label: translate('retrospective.grouping.suggestedGroupings'),
            icon: Sparkles,
            description: translate('retrospective.grouping.automaticSuggestionsBySimilarity')
        }
    ];

    return excludeUserGrouping ? options.filter(option => option.value !== 'user') : options;
};

// Available grouping options (for backward compatibility)
export const GROUPING_OPTIONS: GroupingOption[] = getGroupingOptions();

// Store state for all columns
export interface ColumnGroupingStatesStore {
    [columnId: string]: ColumnGroupingState;
}

// Default state for any column
export const DEFAULT_GROUPING_STATE: ColumnGroupingState = {
    criteria: 'user',
    activeGroups: []
};
