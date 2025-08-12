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

// Function to get translated grouping options
export const getGroupingOptions = (t?: (key: string) => string): GroupingOption[] => {
    // If no translation function provided, use a fallback
    const translate = t || ((key: string) => key);

    return [
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
