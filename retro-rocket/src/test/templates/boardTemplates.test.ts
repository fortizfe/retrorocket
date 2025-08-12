import { describe, it, expect } from 'vitest';
import { BOARD_TEMPLATES, getTemplateColumns, isValidTemplateId, ACTION_COLUMN } from '../../templates/boardTemplates';

describe('Board Templates', () => {
    describe('Template Definitions', () => {
        it('should have all required templates', () => {
            expect(BOARD_TEMPLATES.default).toBeDefined();
            expect(BOARD_TEMPLATES.madSadGlad).toBeDefined();
            expect(BOARD_TEMPLATES.startStopContinue).toBeDefined();
        });

        it('should have correct structure for default template', () => {
            const template = BOARD_TEMPLATES.default;

            expect(template.id).toBe('default');
            expect(template.i18nNameKey).toBe('boardTemplates.default.name');
            expect(template.i18nDescriptionKey).toBe('boardTemplates.default.description');
            expect(template.columns).toHaveLength(3);

            // Check specific columns
            expect(template.columns[0].id).toBe('helped');
            expect(template.columns[1].id).toBe('hindered');
            expect(template.columns[2].id).toBe('improve');
        });

        it('should have correct structure for madSadGlad template', () => {
            const template = BOARD_TEMPLATES.madSadGlad;

            expect(template.id).toBe('madSadGlad');
            expect(template.columns).toHaveLength(3);

            // Check specific columns
            expect(template.columns[0].id).toBe('mad');
            expect(template.columns[1].id).toBe('sad');
            expect(template.columns[2].id).toBe('glad');
        });

        it('should have correct structure for startStopContinue template', () => {
            const template = BOARD_TEMPLATES.startStopContinue;

            expect(template.id).toBe('startStopContinue');
            expect(template.columns).toHaveLength(3);

            // Check specific columns
            expect(template.columns[0].id).toBe('start');
            expect(template.columns[1].id).toBe('stop');
            expect(template.columns[2].id).toBe('continue');
        });
    });

    describe('Action Column', () => {
        it('should have correct structure', () => {
            expect(ACTION_COLUMN.id).toBe('actionItems');
            expect(ACTION_COLUMN.i18nKey).toBe('retrospective.columns.actionItems');
            expect(ACTION_COLUMN.type).toBe('action');
        });
    });

    describe('getTemplateColumns', () => {
        it('should return all columns including action column for default template', () => {
            const columns = getTemplateColumns('default');

            expect(columns).toHaveLength(4); // 3 regular + 1 action
            expect(columns[3]).toEqual(ACTION_COLUMN);
        });

        it('should return all columns including action column for madSadGlad template', () => {
            const columns = getTemplateColumns('madSadGlad');

            expect(columns).toHaveLength(4); // 3 regular + 1 action
            expect(columns[0].id).toBe('mad');
            expect(columns[1].id).toBe('sad');
            expect(columns[2].id).toBe('glad');
            expect(columns[3]).toEqual(ACTION_COLUMN);
        });

        it('should return all columns including action column for startStopContinue template', () => {
            const columns = getTemplateColumns('startStopContinue');

            expect(columns).toHaveLength(4); // 3 regular + 1 action
            expect(columns[0].id).toBe('start');
            expect(columns[1].id).toBe('stop');
            expect(columns[2].id).toBe('continue');
            expect(columns[3]).toEqual(ACTION_COLUMN);
        });
    });

    describe('isValidTemplateId', () => {
        it('should return true for valid template ids', () => {
            expect(isValidTemplateId('default')).toBe(true);
            expect(isValidTemplateId('madSadGlad')).toBe(true);
            expect(isValidTemplateId('startStopContinue')).toBe(true);
        });

        it('should return false for invalid template ids', () => {
            expect(isValidTemplateId('invalid')).toBe(false);
            expect(isValidTemplateId('')).toBe(false);
            expect(isValidTemplateId('undefined')).toBe(false);
        });
    });
});
