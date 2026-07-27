// Server-side port of src/features/create-board/boardTemplates.ts (frontend template
// definitions retired by this refactor — board creation is now backend-only, FR-002).
// IDs/columns/colors are kept byte-for-byte identical to the original so existing boards'
// `templateId` values and rendered column colors are unaffected (FR-008).

export type TemplateId = 'default' | 'madSadGlad' | 'startStopContinue';

export interface ColumnDef {
    id: string;
    i18nKey: string;
    type: 'regular' | 'action';
    defaultColor: string;
}

export interface BoardTemplate {
    id: TemplateId;
    columns: ColumnDef[]; // does NOT include the action column
}

export const ACTION_COLUMN: ColumnDef = {
    id: 'actionItems',
    i18nKey: 'retrospective.columns.actionItems',
    type: 'action',
    defaultColor: 'bg-blue-50 dark:bg-blue-900/40',
};

export const BOARD_TEMPLATES: Record<TemplateId, BoardTemplate> = {
    default: {
        id: 'default',
        columns: [
            { id: 'helped', i18nKey: 'retrospective.columns.helped', type: 'regular', defaultColor: 'bg-green-50 dark:bg-green-900/40' },
            { id: 'hindered', i18nKey: 'retrospective.columns.hindered', type: 'regular', defaultColor: 'bg-red-50 dark:bg-red-900/40' },
            { id: 'improve', i18nKey: 'retrospective.columns.improve', type: 'regular', defaultColor: 'bg-blue-50 dark:bg-blue-900/40' },
        ],
    },
    madSadGlad: {
        id: 'madSadGlad',
        columns: [
            { id: 'mad', i18nKey: 'retrospective.columns.mad', type: 'regular', defaultColor: 'bg-red-50 dark:bg-red-900/40' },
            { id: 'sad', i18nKey: 'retrospective.columns.sad', type: 'regular', defaultColor: 'bg-gray-50 dark:bg-gray-900/40' },
            { id: 'glad', i18nKey: 'retrospective.columns.glad', type: 'regular', defaultColor: 'bg-green-50 dark:bg-green-900/40' },
        ],
    },
    startStopContinue: {
        id: 'startStopContinue',
        columns: [
            { id: 'start', i18nKey: 'retrospective.columns.start', type: 'regular', defaultColor: 'bg-green-50 dark:bg-green-900/40' },
            { id: 'stop', i18nKey: 'retrospective.columns.stop', type: 'regular', defaultColor: 'bg-red-50 dark:bg-red-900/40' },
            { id: 'continue', i18nKey: 'retrospective.columns.continue', type: 'regular', defaultColor: 'bg-blue-50 dark:bg-blue-900/40' },
        ],
    },
};

export function isValidTemplateId(templateId: string): templateId is TemplateId {
    return templateId in BOARD_TEMPLATES;
}

/** All columns for a template, including the automatic action-items column, in display order. */
export function getTemplateColumns(templateId: TemplateId): ColumnDef[] {
    return [...BOARD_TEMPLATES[templateId].columns, ACTION_COLUMN];
}
