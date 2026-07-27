import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRetrospectiveColumns } from '@/features/boards/retrospective/hooks/useRetrospectiveColumns';
import { useTranslation } from 'react-i18next';

vi.mock('react-i18next', () => ({
    useTranslation: vi.fn()
}));

let mockSnapshot: { board: { columns: unknown[] } } | null = null;

vi.mock('@/features/boards/retrospective/contexts/BoardEventsProvider', () => ({
    useBoardEventsContext: () => ({ snapshot: mockSnapshot, connectionState: 'connected' }),
}));

describe('useRetrospectiveColumns', () => {
    const mockT = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockSnapshot = null;

        (useTranslation as any).mockReturnValue({ t: mockT });

        mockT.mockImplementation((key: string) => {
            const translations: Record<string, string> = {
                'retrospective.columns.helped': 'Qué ayudó',
                'retrospective.columns.hindered': 'Qué retrasó',
                'retrospective.columns.improve': 'Qué mejorar',
                'retrospective.columns.actionItems': 'Elementos de acción',
                'retrospective.columns.descriptions.helped': 'Cosas que ayudaron al equipo',
                'retrospective.columns.descriptions.hindered': 'Obstáculos que nos retrasaron',
                'retrospective.columns.descriptions.improve': 'Áreas de mejora identificadas',
                'retrospective.columns.descriptions.actionItems': 'Tareas y compromisos específicos'
            };
            return translations[key] || key;
        });
    });

    describe('Hook Initialization', () => {
        it('should return loading state initially', () => {
            const { result } = renderHook(() => useRetrospectiveColumns('test-retro-id'));

            expect(result.current.loading).toBe(true);
            expect(result.current.error).toBe(null);
            expect(result.current.columns).toEqual([]);
        });

        it('should not be loading when retrospectiveId is undefined', () => {
            const { result } = renderHook(() => useRetrospectiveColumns(undefined));
            expect(result.current.loading).toBe(false);
        });
    });

    describe('Column Configuration Generation', () => {
        it('should generate correct columnConfigs from the board snapshot', () => {
            mockSnapshot = {
                board: {
                    columns: [
                        { id: 'helped', i18nKey: 'retrospective.columns.helped', type: 'regular', order: 1, defaultColor: 'pastelGreen' },
                        { id: 'hindered', i18nKey: 'retrospective.columns.hindered', type: 'regular', order: 2, defaultColor: 'pastelRed' },
                    ],
                },
            };

            const { result } = renderHook(() => useRetrospectiveColumns('test-retro-id'));

            expect(result.current.columnConfigs).toBeDefined();
            expect(result.current.columnConfigs['helped']).toEqual({
                id: 'helped',
                title: 'Qué ayudó',
                description: 'Cosas que ayudaron al equipo',
                color: 'pastelGreen',
                icon: '👍',
                role: 'positive'
            });
        });

        it('should handle legacy i18n keys without retrospective prefix', () => {
            mockSnapshot = { board: { columns: [{ id: 'helped', i18nKey: 'columns.helped', type: 'regular', order: 1, defaultColor: 'pastelGreen' }] } };

            renderHook(() => useRetrospectiveColumns('test-retro-id'));

            expect(mockT).toHaveBeenCalledWith('retrospective.columns.helped');
            expect(mockT).toHaveBeenCalledWith('retrospective.columns.descriptions.helped', { defaultValue: '' });
        });
    });

    describe('Column Order and Filtering', () => {
        it('should separate action columns from regular columns', () => {
            mockSnapshot = {
                board: {
                    columns: [
                        { id: 'helped', i18nKey: 'retrospective.columns.helped', type: 'regular', order: 1, defaultColor: 'pastelGreen' },
                        { id: 'actionItems', i18nKey: 'retrospective.columns.actionItems', type: 'action', order: 2, defaultColor: 'pastelYellow' },
                    ],
                },
            };

            const { result } = renderHook(() => useRetrospectiveColumns('test-retro-id'));

            expect(result.current.columns).toHaveLength(2);
            expect(result.current.actionColumn).toBeDefined();
            expect(result.current.actionColumn?.id).toBe('actionItems');
        });

        it('should maintain correct column order', async () => {
            mockSnapshot = {
                board: {
                    columns: [
                        { id: 'improve', i18nKey: 'retrospective.columns.improve', type: 'regular', order: 3, defaultColor: 'pastelYellow' },
                        { id: 'helped', i18nKey: 'retrospective.columns.helped', type: 'regular', order: 1, defaultColor: 'pastelGreen' },
                        { id: 'hindered', i18nKey: 'retrospective.columns.hindered', type: 'regular', order: 2, defaultColor: 'pastelRed' },
                    ],
                },
            };

            const { result } = renderHook(() => useRetrospectiveColumns('retro-123'));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.columnOrder).toEqual(['helped', 'hindered', 'improve']);
        });
    });
});
