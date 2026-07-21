import { describe, it, expect } from 'vitest';
import { getExportColumns, getExportColumnOrder, getTemplateName, validateCardsForTemplate } from '@/features/boards/export/utils/exportColumns';

describe('Export Columns Utilities', () => {
    describe('getExportColumns', () => {
        it('should return default columns for invalid template ID', () => {
            const columns = getExportColumns('invalid');

            expect(columns).toBeDefined();
            expect(Object.keys(columns)).toContain('helped');
            expect(Object.keys(columns)).toContain('hindered');
            expect(Object.keys(columns)).toContain('improve');
            expect(Object.keys(columns)).not.toContain('actions'); // Actions are handled separately
        });

        it('should return Mad Sad Glad columns for madSadGlad template', () => {
            const columns = getExportColumns('madSadGlad');

            expect(columns).toBeDefined();
            expect(Object.keys(columns)).toContain('mad');
            expect(Object.keys(columns)).toContain('sad');
            expect(Object.keys(columns)).toContain('glad');
            expect(Object.keys(columns)).not.toContain('helped');

            // Check that columns have required properties
            expect(columns.mad).toEqual({
                id: 'mad',
                title: expect.any(String),
                description: expect.any(String),
                color: expect.any(String),
                icon: expect.any(String)
            });
        });

        it('should return Start Stop Continue columns for startStopContinue template', () => {
            const columns = getExportColumns('startStopContinue');

            expect(columns).toBeDefined();
            expect(Object.keys(columns)).toContain('start');
            expect(Object.keys(columns)).toContain('stop');
            expect(Object.keys(columns)).toContain('continue');
            expect(Object.keys(columns)).not.toContain('helped');

            // Check that columns have required properties
            expect(columns.start).toEqual({
                id: 'start',
                title: expect.any(String),
                description: expect.any(String),
                color: expect.any(String),
                icon: expect.any(String)
            });
        });

        it('should return default template columns for default template', () => {
            const columns = getExportColumns('default');

            expect(columns).toBeDefined();
            expect(Object.keys(columns)).toContain('helped');
            expect(Object.keys(columns)).toContain('hindered');
            expect(Object.keys(columns)).toContain('improve');
            expect(Object.keys(columns)).not.toContain('actions');
        });
    });

    describe('getExportColumnOrder', () => {
        it('should return default column order for invalid template ID', () => {
            const order = getExportColumnOrder('invalid');

            expect(order).toEqual(['helped', 'hindered', 'improve']);
        });

        it('should return Mad Sad Glad order for madSadGlad template', () => {
            const order = getExportColumnOrder('madSadGlad');

            expect(order).toEqual(['mad', 'sad', 'glad']);
        });

        it('should return Start Stop Continue order for startStopContinue template', () => {
            const order = getExportColumnOrder('startStopContinue');

            expect(order).toEqual(['start', 'stop', 'continue']);
        });
    });

    describe('getTemplateName', () => {
        it('should return default template name for invalid template ID', () => {
            const name = getTemplateName('invalid');

            expect(name).toBe('Plantilla por defecto');
        });

        it('should return localized template name for valid template ID', () => {
            const name = getTemplateName('madSadGlad');

            expect(name).toBeDefined();
            expect(typeof name).toBe('string');
            expect(name).not.toBe('Plantilla por defecto');
        });
    });

    describe('validateCardsForTemplate', () => {
        it('should validate cards correctly for matching template', () => {
            const cards = [
                { column: 'mad' },
                { column: 'sad' },
                { column: 'glad' }
            ];

            const result = validateCardsForTemplate(cards, 'madSadGlad');

            expect(result.isValid).toBe(true);
            expect(result.issues).toHaveLength(0);
        });

        it('should detect issues with cards from wrong template', () => {
            const cards = [
                { column: 'helped' }, // Wrong column for madSadGlad template
                { column: 'sad' },
                { column: 'glad' }
            ];

            const result = validateCardsForTemplate(cards, 'madSadGlad');

            expect(result.isValid).toBe(false);
            expect(result.issues).toContain('Tarjetas encontradas en columnas inesperadas: helped');
        });

        it('should allow action column in any template', () => {
            const cards = [
                { column: 'mad' },
                { column: 'actions' } // Action column should be allowed
            ];

            const result = validateCardsForTemplate(cards, 'madSadGlad');

            expect(result.isValid).toBe(true);
            expect(result.issues).toHaveLength(0);
        });

        it('should handle invalid template ID gracefully', () => {
            const cards = [
                { column: 'helped' },
                { column: 'hindered' }
            ];

            const result = validateCardsForTemplate(cards, 'invalid');

            expect(result.isValid).toBe(true);
            expect(result.issues).toHaveLength(0);
        });
    });
});
