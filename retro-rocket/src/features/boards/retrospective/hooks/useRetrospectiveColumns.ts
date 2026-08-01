import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export interface RetrospectiveColumn {
    id: string;
    i18nKey: string;
    type: 'regular' | 'action';
    order: number;
    defaultColor: string;
}

export type ColumnRole = 'positive' | 'negative' | 'neutral' | 'action';

// Extended ColumnConfig that doesn't rely on the hardcoded ColumnType
export interface DynamicColumnConfig {
    id: string;
    title: string;
    description: string;
    color: string;
    icon: string;
    role: ColumnRole;
}

const POSITIVE_COLUMN_IDS = new Set(['helped', 'glad', 'start', 'went_well']);
const NEGATIVE_COLUMN_IDS = new Set(['hindered', 'mad', 'sad', 'stop', 'not_went_well']);
const ACTION_COLUMN_IDS = new Set(['actions', 'actionItems', 'action_items']);

export function getColumnRole(columnId: string): ColumnRole {
    if (ACTION_COLUMN_IDS.has(columnId)) return 'action';
    if (POSITIVE_COLUMN_IDS.has(columnId)) return 'positive';
    if (NEGATIVE_COLUMN_IDS.has(columnId)) return 'negative';
    return 'neutral';
}

/**
 * Derives the board's column configuration/order/action-column from the `columns` already
 * present in the board state fetched once by useRetrospectiveRealtimeSync
 * (GET /api/retrospectives/:id) and passed down as a prop (021, research.md §2). Columns are
 * static after board creation (019 already made this observation when scoping the prior
 * live-listener out), so a pure, synchronous derivation replaces what used to be this hook's
 * own standing Firestore `onSnapshot` connection — the reason a "channel" request stayed open
 * for the entire time a board was open in a browser tab.
 */
export function useRetrospectiveColumns(columns: RetrospectiveColumn[] | undefined) {
    const { t } = useTranslation();
    const cols = columns ?? [];

    // Convert RetrospectiveColumn to DynamicColumnConfig for compatibility with existing components
    const columnConfigs = useMemo((): Record<string, DynamicColumnConfig> => {
        const configs: Record<string, DynamicColumnConfig> = {};

        cols.forEach(column => {
            // Migration compatibility: handle old i18n keys without 'retrospective.' prefix
            let i18nKey = column.i18nKey;
            if (i18nKey.startsWith('columns.')) {
                i18nKey = `retrospective.${i18nKey}`;
            }

            const title = t(i18nKey);
            const descriptionKey = `retrospective.columns.descriptions.${column.id}`;
            const description = t(descriptionKey, { defaultValue: '' });

            configs[column.id] = {
                id: column.id,
                title,
                description,
                color: column.defaultColor,
                icon: getColumnIcon(column.id),
                role: getColumnRole(column.id)
            };
        });

        return configs;
    }, [cols, t]);

    const columnOrder = useMemo((): string[] => {
        return cols
            .filter(col => col.type === 'regular')
            .sort((a, b) => a.order - b.order)
            .map(col => col.id);
    }, [cols]);

    const actionColumn = useMemo((): RetrospectiveColumn | null => {
        return cols.find(col => col.type === 'action') || null;
    }, [cols]);

    return {
        columns: cols,
        columnConfigs,
        columnOrder,
        actionColumn,
    };
}

// Helper function to get icon for column
function getColumnIcon(columnId: string): string {
    const iconMap: Record<string, string> = {
        helped: '👍',
        hindered: '⚠️',
        improve: '💡',
        mad: '😠',
        sad: '😢',
        glad: '😊',
        start: '▶️',
        stop: '⏹️',
        continue: '🔄',
        actionItems: '🎯'
    };

    return iconMap[columnId] || '📝';
}
