import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRetrospectiveColumns, type RetrospectiveColumn } from '@/features/boards/retrospective/hooks/useRetrospectiveColumns';
import { useTranslation } from 'react-i18next';

// 021, research.md §2: columns are already part of the board state fetched once via
// useRetrospectiveRealtimeSync (GET /api/retrospectives/:id) and passed down as a prop —
// this hook is now a pure, synchronous derivation with no Firestore subscription of its own.
vi.mock('react-i18next', () => ({
    useTranslation: vi.fn(),
}));

describe('useRetrospectiveColumns (021 — pure derivation, no Firestore)', () => {
    const mockT = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useTranslation as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ t: mockT });

        mockT.mockImplementation((key: string) => {
            const translations: Record<string, string> = {
                'retrospective.columns.helped': 'Qué ayudó',
                'retrospective.columns.hindered': 'Qué retrasó',
                'retrospective.columns.actionItems': 'Elementos de acción',
                'retrospective.columns.descriptions.helped': 'Cosas que ayudaron al equipo',
                'retrospective.columns.descriptions.hindered': 'Obstáculos que nos retrasaron',
                'retrospective.columns.descriptions.actionItems': 'Tareas y compromisos específicos',
            };
            return translations[key] || key;
        });
    });

    it('returns empty state synchronously when given no columns, with no loading/error concept', () => {
        const { result } = renderHook(() => useRetrospectiveColumns([]));
        expect(result.current.columns).toEqual([]);
        expect(result.current.columnConfigs).toEqual({});
        expect(result.current.columnOrder).toEqual([]);
        expect(result.current.actionColumn).toBeNull();
    });

    it('also accepts undefined (no board loaded yet) and returns the same empty state', () => {
        const { result } = renderHook(() => useRetrospectiveColumns(undefined));
        expect(result.current.columns).toEqual([]);
        expect(result.current.columnConfigs).toEqual({});
    });

    it('generates correct columnConfigs from the provided columns, synchronously — no subscription/callback needed', () => {
        const columns: RetrospectiveColumn[] = [
            { id: 'helped', i18nKey: 'retrospective.columns.helped', type: 'regular', order: 1, defaultColor: 'pastelGreen' },
            { id: 'hindered', i18nKey: 'retrospective.columns.hindered', type: 'regular', order: 2, defaultColor: 'pastelRed' },
        ];

        const { result } = renderHook(() => useRetrospectiveColumns(columns));

        expect(result.current.columnConfigs['helped']).toEqual({
            id: 'helped',
            title: 'Qué ayudó',
            description: 'Cosas que ayudaron al equipo',
            color: 'pastelGreen',
            icon: '👍',
            role: 'positive',
        });
    });

    it('handles legacy i18n keys without the retrospective prefix', () => {
        const columns: RetrospectiveColumn[] = [
            { id: 'helped', i18nKey: 'columns.helped', type: 'regular', order: 1, defaultColor: 'pastelGreen' },
        ];

        renderHook(() => useRetrospectiveColumns(columns));

        expect(mockT).toHaveBeenCalledWith('retrospective.columns.helped');
        expect(mockT).toHaveBeenCalledWith('retrospective.columns.descriptions.helped', { defaultValue: '' });
    });

    it('separates the action column from regular columns', () => {
        const columns: RetrospectiveColumn[] = [
            { id: 'helped', i18nKey: 'retrospective.columns.helped', type: 'regular', order: 1, defaultColor: 'pastelGreen' },
            { id: 'actionItems', i18nKey: 'retrospective.columns.actionItems', type: 'action', order: 2, defaultColor: 'pastelYellow' },
        ];

        const { result } = renderHook(() => useRetrospectiveColumns(columns));

        expect(result.current.columns).toHaveLength(2);
        expect(result.current.actionColumn).toBeDefined();
        expect(result.current.actionColumn?.id).toBe('actionItems');
        expect(result.current.columnOrder).toEqual(['helped']);
    });

    it('maintains correct column order regardless of input order', () => {
        const columns: RetrospectiveColumn[] = [
            { id: 'improve', i18nKey: 'retrospective.columns.helped', type: 'regular', order: 3, defaultColor: 'pastelYellow' },
            { id: 'helped', i18nKey: 'retrospective.columns.helped', type: 'regular', order: 1, defaultColor: 'pastelGreen' },
            { id: 'hindered', i18nKey: 'retrospective.columns.hindered', type: 'regular', order: 2, defaultColor: 'pastelRed' },
        ];

        const { result } = renderHook(() => useRetrospectiveColumns(columns));

        expect(result.current.columnOrder).toEqual(['helped', 'hindered', 'improve']);
    });

    it('recomputes when the columns argument changes (e.g. a fresh board-state fetch)', () => {
        const initial: RetrospectiveColumn[] = [
            { id: 'helped', i18nKey: 'retrospective.columns.helped', type: 'regular', order: 1, defaultColor: 'pastelGreen' },
        ];
        const { result, rerender } = renderHook(({ columns }) => useRetrospectiveColumns(columns), {
            initialProps: { columns: initial },
        });
        expect(result.current.columnOrder).toEqual(['helped']);

        const updated: RetrospectiveColumn[] = [
            ...initial,
            { id: 'hindered', i18nKey: 'retrospective.columns.hindered', type: 'regular', order: 2, defaultColor: 'pastelRed' },
        ];
        rerender({ columns: updated });

        expect(result.current.columnOrder).toEqual(['helped', 'hindered']);
    });
});
