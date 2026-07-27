import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useBoardEventsContext } from '@/features/boards/retrospective/contexts/BoardEventsProvider';

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
 * Backend-mediated replacement for the direct-Firestore version of this hook (feature 017
 * US2). Columns are static once a board is created, so no real-time subscription is
 * needed — this reads the `columns` field already delivered by the board's shared SSE
 * snapshot (BoardEventsProvider) instead of a separate Firestore subcollection listener.
 */
export function useRetrospectiveColumns(retrospectiveId: string | undefined) {
    const [loading, setLoading] = useState(true);
    const [error] = useState<string | null>(null);
    const { t } = useTranslation();
    const { snapshot } = useBoardEventsContext();

    const columns: RetrospectiveColumn[] = useMemo(() => {
        const board = snapshot?.board as { columns?: RetrospectiveColumn[] } | null | undefined;
        return board?.columns ?? [];
    }, [snapshot]);

    useEffect(() => {
        if (!retrospectiveId) {
            setLoading(false);
            return;
        }
        if (snapshot) setLoading(false);
    }, [retrospectiveId, snapshot]);

    const columnConfigs = useMemo((): Record<string, DynamicColumnConfig> => {
        const configs: Record<string, DynamicColumnConfig> = {};

        columns.forEach(column => {
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
    }, [columns, t]);

    const columnOrder = useMemo((): string[] => {
        return columns
            .filter(col => col.type === 'regular')
            .sort((a, b) => a.order - b.order)
            .map(col => col.id);
    }, [columns]);

    const actionColumn = useMemo((): RetrospectiveColumn | null => {
        return columns.find(col => col.type === 'action') || null;
    }, [columns]);

    return {
        columns,
        columnConfigs,
        columnOrder,
        actionColumn,
        loading,
        error
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
