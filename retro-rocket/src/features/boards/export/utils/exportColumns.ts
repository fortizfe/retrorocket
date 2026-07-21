import { BOARD_TEMPLATES, getTemplateColumns, isValidTemplateId } from '@/features/create-board/boardTemplates';
import { ColumnConfig } from '@/features/boards/types/retrospective';
import { COLUMNS as DEFAULT_COLUMNS, COLUMN_ORDER as DEFAULT_COLUMN_ORDER } from '@/lib/utils/constants';
import i18n from '@/i18n/config';

export interface DynamicColumnConfig {
    id: string;
    title: string;
    description: string;
    color: string;
    icon: string;
}

/**
 * Get column configurations for export based on template ID
 */
export const getExportColumns = (templateId?: string): Record<string, DynamicColumnConfig> => {
    // If no template ID or invalid template ID, use default columns
    if (!templateId || !isValidTemplateId(templateId)) {
        console.warn('⚠️ Invalid or missing template ID, falling back to default columns');
        return convertLegacyColumnsToExportFormat(DEFAULT_COLUMNS);
    }

    const t = i18n.getFixedT(i18n.language);
    const templateColumns = getTemplateColumns(templateId);
    const configs: Record<string, DynamicColumnConfig> = {};

    templateColumns.forEach(column => {
        // Skip action columns for regular export (they're handled separately)
        if (column.type === 'action') return;

        // Get translated title and description
        let titleKey = column.i18nKey;
        if (!titleKey.startsWith('retrospective.')) {
            titleKey = `retrospective.${titleKey}`;
        }

        const title = t(titleKey, { defaultValue: column.id });
        const descriptionKey = `${titleKey.replace('.columns.', '.columns.descriptions.')}`;
        const description = t(descriptionKey, { defaultValue: '' });

        configs[column.id] = {
            id: column.id,
            title,
            description,
            color: column.defaultColor || 'bg-slate-50 dark:bg-slate-900/40',
            icon: getColumnIcon(column.id)
        };
    });

    return configs;
};

/**
 * Get column order for export based on template ID
 */
export const getExportColumnOrder = (templateId?: string): string[] => {
    if (!templateId || !isValidTemplateId(templateId)) {
        console.warn('⚠️ Invalid or missing template ID, falling back to default column order');
        return DEFAULT_COLUMN_ORDER;
    }

    const templateColumns = getTemplateColumns(templateId);
    return templateColumns
        .filter(col => col.type === 'regular')
        .map(col => col.id);
};

/**
 * Convert legacy column format to export format
 */
const convertLegacyColumnsToExportFormat = (columns: Record<string, ColumnConfig>): Record<string, DynamicColumnConfig> => {
    const configs: Record<string, DynamicColumnConfig> = {};

    Object.values(columns).forEach(column => {
        // Skip action columns for regular export
        if (column.id === 'actions') return;

        configs[column.id] = {
            id: column.id,
            title: column.title,
            description: column.description,
            color: column.color,
            icon: column.icon
        };
    });

    return configs;
};

/**
 * Get appropriate icon for column ID
 */
const getColumnIcon = (columnId: string): string => {
    const iconMap: Record<string, string> = {
        // Default template
        helped: '👍',
        hindered: '⚠️',
        improve: '💡',

        // Mad Sad Glad template
        mad: '😡',
        sad: '😢',
        glad: '😊',

        // Start Stop Continue template
        start: '🚀',
        stop: '🛑',
        continue: '⏩',

        // Actions (fallback)
        actions: '🎯',
        actionItems: '🎯'
    };

    return iconMap[columnId] || '📝';
};

/**
 * Get template name for display purposes
 */
export const getTemplateName = (templateId?: string): string => {
    if (!templateId || !isValidTemplateId(templateId)) {
        return 'Plantilla por defecto';
    }

    const t = i18n.getFixedT(i18n.language);
    const template = BOARD_TEMPLATES[templateId];
    return t(template.i18nNameKey, { defaultValue: template.id });
};

/**
 * Validate if cards match the expected template structure
 */
export const validateCardsForTemplate = (cards: Array<{ column: string }>, templateId?: string): {
    isValid: boolean;
    issues: string[];
} => {
    const issues: string[] = [];
    const expectedColumns = getExportColumnOrder(templateId);
    const cardColumns = [...new Set(cards.map(card => card.column))];

    // Check for cards in unexpected columns
    const unexpectedColumns = cardColumns.filter(col => !expectedColumns.includes(col) && col !== 'actions');
    if (unexpectedColumns.length > 0) {
        issues.push(`Tarjetas encontradas en columnas inesperadas: ${unexpectedColumns.join(', ')}`);
    }

    return {
        isValid: issues.length === 0,
        issues
    };
};
