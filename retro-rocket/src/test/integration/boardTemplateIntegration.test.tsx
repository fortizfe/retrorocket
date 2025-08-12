import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BOARD_TEMPLATES, getTemplateColumns, isValidTemplateId } from '../../templates/boardTemplates';
import { getSuggestedColorForColumn, getAvailableColors, isValidColor } from '../../utils/cardColors';

describe('Board Template System Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Template and Color System Integration', () => {
        it('should assign appropriate colors to each template columns', () => {
            // Test default template with suggested colors
            const helpedColor = getSuggestedColorForColumn('', 'helped');
            const hinderedColor = getSuggestedColorForColumn('', 'hindered');
            const improveColor = getSuggestedColorForColumn('', 'improve');
            const actionColor = getSuggestedColorForColumn('', 'actionItems');

            expect(helpedColor).toBe('pastelGreen'); // Positive feedback
            expect(hinderedColor).toBe('pastelRed'); // Negative feedback
            expect(improveColor).toBe('pastelYellow'); // Action-oriented
            expect(actionColor).toBe('pastelYellow'); // Action items

            // Verify all suggested colors are valid
            expect(isValidColor(helpedColor)).toBe(true);
            expect(isValidColor(hinderedColor)).toBe(true);
            expect(isValidColor(improveColor)).toBe(true);
            expect(isValidColor(actionColor)).toBe(true);
        });

        it('should assign emotionally appropriate colors to madSadGlad template', () => {
            const madColor = getSuggestedColorForColumn('', 'mad');
            const sadColor = getSuggestedColorForColumn('', 'sad');
            const gladColor = getSuggestedColorForColumn('', 'glad');

            expect(madColor).toBe('pastelOrange'); // Frustration - warm but not too aggressive
            expect(sadColor).toBe('pastelGray'); // Sadness - neutral, subdued
            expect(gladColor).toBe('pastelGreen'); // Happiness - positive, bright

            // Verify emotional color differentiation
            expect(madColor).not.toBe(sadColor);
            expect(sadColor).not.toBe(gladColor);
            expect(madColor).not.toBe(gladColor);
        });

        it('should assign action-oriented colors to startStopContinue template', () => {
            const startColor = getSuggestedColorForColumn('', 'start');
            const stopColor = getSuggestedColorForColumn('', 'stop');
            const continueColor = getSuggestedColorForColumn('', 'continue');

            expect(startColor).toBe('pastelTeal'); // New beginnings - innovation
            expect(stopColor).toBe('pastelRed'); // Stopping - alert/warning
            expect(continueColor).toBe('pastelBlue'); // Continuity - stability

            // Verify action color differentiation
            expect(startColor).not.toBe(stopColor);
            expect(stopColor).not.toBe(continueColor);
            expect(startColor).not.toBe(continueColor);
        });
    });

    describe('Template Completeness and Consistency', () => {
        it('should ensure all templates have complete structure', () => {
            Object.entries(BOARD_TEMPLATES).forEach(([templateId, template]) => {
                expect(template.id).toBe(templateId);
                expect(template.i18nNameKey).toBeTruthy();
                expect(template.i18nDescriptionKey).toBeTruthy();
                expect(template.columns).toBeInstanceOf(Array);
                expect(template.columns.length).toBeGreaterThanOrEqual(3);

                // Verify all template IDs are valid
                expect(isValidTemplateId(templateId)).toBe(true);
            });
        });

        it('should ensure all template columns have required properties', () => {
            const templates = Object.values(BOARD_TEMPLATES);
            for (const template of templates) {
                for (const column of template.columns) {
                    expect(column.id).toBeTruthy();
                    expect(typeof column.id).toBe('string');
                    expect(column.i18nKey).toBeTruthy();
                    expect(typeof column.i18nKey).toBe('string');
                    expect(column.type).toBeTruthy();
                    expect(column.type && ['regular', 'action', 'feedback'].includes(column.type)).toBe(true);
                }
            }
        });

        it('should ensure template-generated columns include action column', () => {
            const templateIds = Object.keys(BOARD_TEMPLATES);
            for (const templateId of templateIds) {
                const columns = getTemplateColumns(templateId as keyof typeof BOARD_TEMPLATES);
                const actionColumn = columns.find(col => col.type === 'action');

                expect(actionColumn).toBeDefined();
                expect(actionColumn?.id).toBe('actionItems');
                expect(actionColumn?.i18nKey).toBe('retrospective.columns.actionItems');
            }
        });

        it('should have unique column IDs within each template', () => {
            const templates = Object.values(BOARD_TEMPLATES);
            for (const template of templates) {
                const columnIds = template.columns.map(col => col.id);
                const uniqueIds = [...new Set(columnIds)];
                expect(columnIds).toHaveLength(uniqueIds.length);
            }
        });
    });

    describe('Color Palette Coverage for Templates', () => {
        it('should use colors from expanded 30-color palette appropriately', () => {
            const availableColors = getAvailableColors();
            expect(availableColors).toHaveLength(30);

            // Collect all colors suggested by templates
            const allTemplateColors = new Set<string>();

            const templateIds = Object.keys(BOARD_TEMPLATES);
            for (const templateId of templateIds) {
                const columns = getTemplateColumns(templateId as keyof typeof BOARD_TEMPLATES);
                for (const column of columns) {
                    const suggestedColor = getSuggestedColorForColumn('', column.id);
                    allTemplateColors.add(suggestedColor);
                }
            }

            // Verify all suggested colors are from our palette
            for (const color of allTemplateColors) {
                expect(availableColors.includes(color as any)).toBe(true);
            }

            // Should use a reasonable variety of colors (not just 2-3)
            expect(allTemplateColors.size).toBeGreaterThanOrEqual(5);
        });

        it('should provide fallback colors for unknown template columns', () => {
            const unknownColor = getSuggestedColorForColumn('Unknown Column Type');
            expect(unknownColor).toBe('pastelWhite');
            expect(isValidColor(unknownColor)).toBe(true);
        });

        it('should handle title-based fallback for custom columns', () => {
            // Test Spanish titles
            expect(getSuggestedColorForColumn('Qué funcionó bien')).toBe('pastelGreen');
            expect(getSuggestedColorForColumn('Problemas encontrados')).toBe('pastelRed');
            expect(getSuggestedColorForColumn('Acciones a tomar')).toBe('pastelYellow');

            // Test English titles
            expect(getSuggestedColorForColumn('What went well')).toBe('pastelGreen');
            expect(getSuggestedColorForColumn('What hindered us')).toBe('pastelRed');
            expect(getSuggestedColorForColumn('Action items')).toBe('pastelYellow');
        });
    });

    describe('Template System Scalability', () => {
        it('should support different column counts across templates', () => {
            const templateColumnCounts = Object.values(BOARD_TEMPLATES).map(
                template => template.columns.length
            );

            // All templates should have at least 3 columns
            for (const count of templateColumnCounts) {
                expect(count).toBeGreaterThanOrEqual(3);
            }

            // When action column is added, should be consistent
            const templateIds = Object.keys(BOARD_TEMPLATES);
            for (const templateId of templateIds) {
                const columns = getTemplateColumns(templateId as keyof typeof BOARD_TEMPLATES);
                const originalTemplate = BOARD_TEMPLATES[templateId as keyof typeof BOARD_TEMPLATES];
                expect(columns.length).toBe(originalTemplate.columns.length + 1); // +1 for action column
            }
        });

        it('should maintain consistent action column across all templates', () => {
            const templateIds = Object.keys(BOARD_TEMPLATES);
            const actionColumns = templateIds.map(templateId => {
                const columns = getTemplateColumns(templateId as keyof typeof BOARD_TEMPLATES);
                return columns.find(col => col.type === 'action');
            });

            // All action columns should be identical
            for (const actionColumn of actionColumns) {
                expect(actionColumn?.id).toBe('actionItems');
                expect(actionColumn?.i18nKey).toBe('retrospective.columns.actionItems');
                expect(actionColumn?.type).toBe('action');
            }
        });
    });

    describe('Template Data Integrity', () => {
        it('should have consistent i18n key patterns', () => {
            const templates = Object.values(BOARD_TEMPLATES);
            for (const template of templates) {
                // Template name keys should follow pattern
                expect(template.i18nNameKey).toMatch(/^boardTemplates\.\w+\.name$/);
                expect(template.i18nDescriptionKey).toMatch(/^boardTemplates\.\w+\.description$/);

                // Column i18n keys should follow pattern
                for (const column of template.columns) {
                    expect(column.i18nKey).toMatch(/^retrospective\.columns\.\w+$/);
                }
            }
        });

        it('should have valid template IDs that match object keys', () => {
            Object.entries(BOARD_TEMPLATES).forEach(([key, template]) => {
                expect(template.id).toBe(key);
                expect(isValidTemplateId(key)).toBe(true);
            });
        });

        it('should maintain referential integrity with color system', () => {
            // Test that all column IDs that have specific color mappings
            // actually exist in at least one template
            const allColumnIds = new Set<string>();

            const templates = Object.values(BOARD_TEMPLATES);
            for (const template of templates) {
                for (const column of template.columns) {
                    allColumnIds.add(column.id);
                }
            }

            // Known specific mappings should exist
            const expectedColumns = ['helped', 'hindered', 'improve', 'mad', 'sad', 'glad', 'start', 'stop', 'continue'];
            for (const expectedColumn of expectedColumns) {
                expect(allColumnIds.has(expectedColumn)).toBe(true);
            }
        });
    });

    describe('Performance and Memory Considerations', () => {
        it('should not create excessive objects during template generation', () => {
            const startMemory = process.memoryUsage().heapUsed;

            // Generate columns for all templates multiple times
            for (let i = 0; i < 100; i++) {
                const templateIds = Object.keys(BOARD_TEMPLATES);
                for (const templateId of templateIds) {
                    getTemplateColumns(templateId as keyof typeof BOARD_TEMPLATES);
                }
            }

            const endMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = endMemory - startMemory;

            // Should not increase memory by more than 10MB for 100 iterations
            expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
        });

        it('should generate template columns efficiently', () => {
            const start = performance.now();

            // Generate columns for all templates 1000 times
            for (let i = 0; i < 1000; i++) {
                const templateIds = Object.keys(BOARD_TEMPLATES);
                for (const templateId of templateIds) {
                    getTemplateColumns(templateId as keyof typeof BOARD_TEMPLATES);
                }
            }

            const end = performance.now();
            const duration = end - start;

            // Should complete in reasonable time (less than 100ms for 1000 iterations)
            expect(duration).toBeLessThan(100);
        });
    });
});
