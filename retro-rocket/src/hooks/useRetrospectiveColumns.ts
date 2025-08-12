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

// Extended ColumnConfig that doesn't rely on the hardcoded ColumnType
export interface DynamicColumnConfig {
    id: string;
    title: string;
    description: string;
    color: string;
    icon: string;
}

export function useRetrospectiveColumns(retrospectiveId: string | undefined) {
    const [columns, setColumns] = useState<RetrospectiveColumn[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();

    // Convert RetrospectiveColumn to DynamicColumnConfig for compatibility with existing components
    const columnConfigs = useMemo((): Record<string, DynamicColumnConfig> => {
        const configs: Record<string, DynamicColumnConfig> = {};

        console.log(`🔍 DEBUG columnConfigs useMemo for columns:`, columns);

        columns.forEach(column => {
            // Migration compatibility: handle old i18n keys without 'retrospective.' prefix
            let i18nKey = column.i18nKey;
            if (i18nKey.startsWith('columns.')) {
                i18nKey = `retrospective.${i18nKey}`;
            }

            const title = t(i18nKey);
            console.log(`🔍 DEBUG Column ${column.id}: i18nKey="${i18nKey}" → title="${title}"`);

            configs[column.id] = {
                id: column.id,
                title,
                description: '', // We can expand this later if needed
                color: column.defaultColor,
                icon: getColumnIcon(column.id)
            };
        });

        console.log(`🔍 DEBUG Final columnConfigs:`, configs);
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

                console.log(`🔍 DEBUG useRetrospectiveColumns snapshot for ${retrospectiveId}:`, {
                    snapshotSize: snapshot.size,
                    isEmpty: snapshot.empty
                });

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    console.log(`🔍 DEBUG Column document ${doc.id}:`, data);

                    columnsData.push({
                        id: doc.id,
                        i18nKey: data.i18nKey,
                        type: data.type || 'regular',
                        order: data.order || 0,
                        defaultColor: data.defaultColor || 'bg-slate-50 dark:bg-slate-900/40'
                    });
                });

                console.log(`🔍 DEBUG Final columnsData for ${retrospectiveId}:`, columnsData);
                setColumns(columnsData);
                setLoading(false);
            },
            (error) => {
                console.error('Error fetching retrospective columns:', error);
                setError('Failed to load columns');
                setLoading(false);
            }
        );

        return () => unsubscribe();
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
