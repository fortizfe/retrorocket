// Types for column grouping functionality
import { LucideIcon, List, Users, Target, Sparkles } from 'lucide-react';

export type GroupingCriteria = 'none' | 'user' | 'custom' | 'suggestions';

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

// Available grouping options
export const GROUPING_OPTIONS: GroupingOption[] = [
    {
        value: 'none',
        label: 'Sin agrupación',
        icon: List,
        description: 'Vista de lista tradicional'
    },
    {
        value: 'user',
        label: 'Agrupar por usuario',
        icon: Users,
        description: 'Agrupa tarjetas por creador'
    },
    {
        value: 'custom',
        label: 'Agrupación personalizada',
        icon: Target,
        description: 'Selecciona tarjetas manualmente'
    },
    {
        value: 'suggestions',
        label: 'Agrupaciones sugeridas',
        icon: Sparkles,
        description: 'Sugerencias automáticas por similitud'
    }
];

// Store state for all columns
export interface ColumnGroupingStatesStore {
    [columnId: string]: ColumnGroupingState;
}

// Default state for any column
export const DEFAULT_GROUPING_STATE: ColumnGroupingState = {
    criteria: 'none',
    activeGroups: []
};
