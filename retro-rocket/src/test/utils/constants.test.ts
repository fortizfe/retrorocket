import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getColumns, getRetrospectiveColumns, COLUMN_ORDER } from '../../utils/constants';

// Mock i18n
const mockT = vi.fn((key: string) => key);
vi.mock('../../i18n/config', () => ({
    default: {
        getFixedT: vi.fn(() => mockT),
        language: 'es'
    }
}));

describe('constants utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockT.mockImplementation((key: string) => key);
    });

    describe('getColumns', () => {
        it('should return column configuration object', () => {
            const columns = getColumns();

            expect(columns).toHaveProperty('helped');
            expect(columns).toHaveProperty('hindered');
            expect(columns).toHaveProperty('improve');
            expect(columns).toHaveProperty('actions');
        });

        it('should have correct structure for each column', () => {
            const columns = getColumns();

            Object.values(columns).forEach(column => {
                expect(column).toHaveProperty('id');
                expect(column).toHaveProperty('title');
                expect(column).toHaveProperty('description');
                expect(column).toHaveProperty('color');
                expect(column).toHaveProperty('icon');
            });
        });

        it('should have correct IDs for columns', () => {
            const columns = getColumns();

            expect(columns.helped.id).toBe('helped');
            expect(columns.hindered.id).toBe('hindered');
            expect(columns.improve.id).toBe('improve');
            expect(columns.actions.id).toBe('actions');
        });
    });

    describe('getRetrospectiveColumns', () => {
        it('should return array of column objects', () => {
            const columns = getRetrospectiveColumns();

            expect(Array.isArray(columns)).toBe(true);
            expect(columns).toHaveLength(4);
        });

        it('should have correct column IDs in order', () => {
            const columns = getRetrospectiveColumns();

            expect(columns[0].id).toBe('helped');
            expect(columns[1].id).toBe('hindered');
            expect(columns[2].id).toBe('improve');
            expect(columns[3].id).toBe('actions');
        });

        it('should call translation function for titles', () => {
            getRetrospectiveColumns();

            expect(mockT).toHaveBeenCalledWith('retrospective.columns.titles.whatHelped');
            expect(mockT).toHaveBeenCalledWith('retrospective.columns.titles.whatHindered');
            expect(mockT).toHaveBeenCalledWith('retrospective.columns.titles.whatToImprove');
            expect(mockT).toHaveBeenCalledWith('retrospective.actionItems.title');
        });
    });

    describe('COLUMN_ORDER', () => {
        it('should contain correct column order', () => {
            expect(COLUMN_ORDER).toEqual(['helped', 'hindered', 'improve']);
        });

        it('should not include actions column in order', () => {
            expect(COLUMN_ORDER).not.toContain('actions');
        });

        it('should have length of 3', () => {
            expect(COLUMN_ORDER).toHaveLength(3);
        });
    });

    describe('color schemes', () => {
        it('should have appropriate colors for each column', () => {
            const columns = getColumns();

            expect(columns.helped.color).toContain('green');
            expect(columns.hindered.color).toContain('red');
            expect(columns.improve.color).toContain('blue');
            expect(columns.actions.color).toContain('amber');
        });
    });

    describe('icons', () => {
        it('should have appropriate icons for each column', () => {
            const columns = getColumns();

            expect(columns.helped.icon).toBe('👍');
            expect(columns.hindered.icon).toBe('⚠️');
            expect(columns.improve.icon).toBe('💡');
            expect(columns.actions.icon).toBe('🎯');
        });
    });
});
