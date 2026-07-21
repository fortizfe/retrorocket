export type TemplateId = 'default' | 'madSadGlad' | 'startStopContinue';

export type ColumnDef = {
    id: string;            // uid estable (ej. 'mad', 'sad', 'glad', 'actionItems')
    i18nKey: string;       // ej. 'columns.mad'
    type?: 'regular' | 'action'; // 'action' para Elementos de acción
    defaultColor?: string; // tailwind token opcional
};

export interface BoardTemplate {
    id: TemplateId;
    i18nNameKey: string;
    i18nDescriptionKey: string;
    columns: ColumnDef[];  // NO incluir la de acción aquí
}

export const ACTION_COLUMN: ColumnDef = {
    id: 'actionItems',
    i18nKey: 'retrospective.columns.actionItems',
    type: 'action',
    defaultColor: 'bg-blue-50 dark:bg-blue-900/40'
};

export const BOARD_TEMPLATES: Record<TemplateId, BoardTemplate> = {
    default: {
        id: 'default',
        i18nNameKey: 'boardTemplates.default.name',
        i18nDescriptionKey: 'boardTemplates.default.description',
        columns: [
            {
                id: 'helped',
                i18nKey: 'retrospective.columns.helped',
                type: 'regular',
                defaultColor: 'bg-green-50 dark:bg-green-900/40'
            },
            {
                id: 'hindered',
                i18nKey: 'retrospective.columns.hindered',
                type: 'regular',
                defaultColor: 'bg-red-50 dark:bg-red-900/40'
            },
            {
                id: 'improve',
                i18nKey: 'retrospective.columns.improve',
                type: 'regular',
                defaultColor: 'bg-blue-50 dark:bg-blue-900/40'
            }
        ]
    },
    madSadGlad: {
        id: 'madSadGlad',
        i18nNameKey: 'boardTemplates.madSadGlad.name',
        i18nDescriptionKey: 'boardTemplates.madSadGlad.description',
        columns: [
            {
                id: 'mad',
                i18nKey: 'retrospective.columns.mad',
                type: 'regular',
                defaultColor: 'bg-red-50 dark:bg-red-900/40'
            },
            {
                id: 'sad',
                i18nKey: 'retrospective.columns.sad',
                type: 'regular',
                defaultColor: 'bg-gray-50 dark:bg-gray-900/40'
            },
            {
                id: 'glad',
                i18nKey: 'retrospective.columns.glad',
                type: 'regular',
                defaultColor: 'bg-green-50 dark:bg-green-900/40'
            }
        ]
    },
    startStopContinue: {
        id: 'startStopContinue',
        i18nNameKey: 'boardTemplates.startStopContinue.name',
        i18nDescriptionKey: 'boardTemplates.startStopContinue.description',
        columns: [
            {
                id: 'start',
                i18nKey: 'retrospective.columns.start',
                type: 'regular',
                defaultColor: 'bg-green-50 dark:bg-green-900/40'
            },
            {
                id: 'stop',
                i18nKey: 'retrospective.columns.stop',
                type: 'regular',
                defaultColor: 'bg-red-50 dark:bg-red-900/40'
            },
            {
                id: 'continue',
                i18nKey: 'retrospective.columns.continue',
                type: 'regular',
                defaultColor: 'bg-blue-50 dark:bg-blue-900/40'
            }
        ]
    }
};

// Función auxiliar para obtener todas las columnas de una plantilla (incluyendo actions)
export const getTemplateColumns = (templateId: TemplateId): ColumnDef[] => {
    const template = BOARD_TEMPLATES[templateId];
    return [...template.columns, ACTION_COLUMN];
};

// Función auxiliar para verificar si un template existe
export const isValidTemplateId = (templateId: string): templateId is TemplateId => {
    return templateId in BOARD_TEMPLATES;
};
