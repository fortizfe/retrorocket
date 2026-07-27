import { describe, expect, it } from 'vitest';
import { getTemplateColumns, isValidTemplateId } from '../../../src/domain/boards/boardTemplates';

describe('boardTemplates', () => {
    it.each(['default', 'madSadGlad', 'startStopContinue'] as const)('%s is a valid template id', (id) => {
        expect(isValidTemplateId(id)).toBe(true);
    });

    it('rejects an unknown template id', () => {
        expect(isValidTemplateId('not-a-template')).toBe(false);
    });

    it('appends the automatic action-items column to every template', () => {
        for (const id of ['default', 'madSadGlad', 'startStopContinue'] as const) {
            const columns = getTemplateColumns(id);
            expect(columns.at(-1)).toMatchObject({ id: 'actionItems', type: 'action' });
        }
    });
});
