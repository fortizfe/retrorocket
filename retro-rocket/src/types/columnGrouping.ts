// Types for column grouping functionality
import { LucideIcon, List, Users, Sparkles } from 'lucide-react';
import i18n from '../i18n/config';

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
export const getGroupingOptions = (): GroupingOption[] => {
    const t = i18n.getFixedT(i18n.language);

    return [
        {
            value: 'none',
            label: t('retrospective.grouping.noGrouping'),
            icon: List,
            description: t('retrospective.grouping.traditionalListView')
        },
        {
            value: 'user',
            label: t('retrospective.grouping.groupByUser'),
            icon: Users,
            description: t('retrospective.grouping.groupCardsByCreator')
        },
        {
            value: 'suggestions',
            label: t('retrospective.grouping.suggestedGroupings'),
            icon: Sparkles,
            description: t('retrospective.grouping.automaticSuggestionsBySimilarity')
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
