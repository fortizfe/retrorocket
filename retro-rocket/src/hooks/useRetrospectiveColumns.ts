import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db, FIRESTORE_COLLECTIONS } from '../services/firebase';

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

export function useRetrospectiveColumns(retrospectiveId: string | undefined) {
    const [columns, setColumns] = useState<RetrospectiveColumn[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();

    // Convert RetrospectiveColumn to DynamicColumnConfig for compatibility with existing components
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

    useEffect(() => {
        if (!retrospectiveId || !db) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const columnsRef = collection(db, FIRESTORE_COLLECTIONS.RETROSPECTIVES, retrospectiveId, 'columns');
        const columnsQuery = query(columnsRef, orderBy('order', 'asc'));

        const unsubscribe = onSnapshot(
            columnsQuery,
            (snapshot) => {
                const columnsData: RetrospectiveColumn[] = [];

                snapshot.forEach((doc) => {
                    const data = doc.data();

                    columnsData.push({
                        id: doc.id,
                        i18nKey: data.i18nKey,
                        type: data.type || 'regular',
                        order: data.order || 0,
                        defaultColor: data.defaultColor || 'bg-slate-50 dark:bg-slate-900/40'
                    });
                });

                setColumns(columnsData);
                setLoading(false);
            },
            (error) => {
                console.error('Error fetching retrospective columns:', error);
                setError('Failed to load columns');
                setLoading(false);
            }
        );

        return () => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, [retrospectiveId]);

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
