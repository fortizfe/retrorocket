import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRetrospectiveColumns } from '../../hooks/useRetrospectiveColumns';
import { useTranslation } from 'react-i18next';
import * as firestore from 'firebase/firestore';

// Mock react-i18next
vi.mock('react-i18next', () => ({
    useTranslation: vi.fn()
}));

// Mock Firebase
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    onSnapshot: vi.fn(),
    query: vi.fn(),
    orderBy: vi.fn()
}));

vi.mock('../../services/firebase', () => ({
    db: {},
    FIRESTORE_COLLECTIONS: {
        RETROSPECTIVES: 'retrospectives'
    }
}));

describe('useRetrospectiveColumns', () => {
    const mockT = vi.fn();
    const mockOnSnapshot = vi.fn();

    // Helper function to create a proper Firebase QuerySnapshot mock
    const createMockSnapshot = (mockColumns: any[]) => {
        const docs = mockColumns.map(col => ({
            id: col.id,
            data: () => col
        }));

        return {
            docs,
            empty: docs.length === 0,
            forEach: (callback: any) => docs.forEach(callback)
        };
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default translation mock
        (useTranslation as any).mockReturnValue({
            t: mockT
        });

        // Mock Firebase onSnapshot properly
        vi.mocked(firestore.onSnapshot).mockImplementation(mockOnSnapshot);

        // Default translation responses
        mockT.mockImplementation((key: string) => {
            const translations: Record<string, string> = {
                'retrospective.columns.helped': 'Qué ayudó',
                'retrospective.columns.hindered': 'Qué retrasó',
                'retrospective.columns.improve': 'Qué mejorar',
                'retrospective.columns.mad': 'Enfadado',
                'retrospective.columns.sad': 'Triste',
                'retrospective.columns.glad': 'Contento',
                'retrospective.columns.start': 'Empezar a hacer',
                'retrospective.columns.stop': 'Dejar de hacer',
                'retrospective.columns.continue': 'Continuar haciendo',
                'retrospective.columns.actionItems': 'Elementos de acción',
                'retrospective.columns.descriptions.helped': 'Cosas que ayudaron al equipo',
                'retrospective.columns.descriptions.hindered': 'Obstáculos que nos retrasaron',
                'retrospective.columns.descriptions.improve': 'Áreas de mejora identificadas',
                'retrospective.columns.descriptions.mad': 'Aspectos que generaron frustración',
                'retrospective.columns.descriptions.sad': 'Situaciones que causaron tristeza',
                'retrospective.columns.descriptions.glad': 'Logros que nos alegraron',
                'retrospective.columns.descriptions.start': 'Nuevas prácticas a implementar',
                'retrospective.columns.descriptions.stop': 'Prácticas a abandonar',
                'retrospective.columns.descriptions.continue': 'Buenas prácticas a mantener',
                'retrospective.columns.descriptions.actionItems': 'Tareas y compromisos específicos'
            };
            return translations[key] || key;
        });
    });

    describe('Hook Initialization', () => {
        it('should return loading state initially', () => {
            mockOnSnapshot.mockImplementation(() => vi.fn()); // Mock unsubscribe function

            const { result } = renderHook(() =>
                useRetrospectiveColumns('test-retro-id')
            );

            expect(result.current.loading).toBe(true);
            expect(result.current.error).toBe(null);
            expect(result.current.columns).toEqual([]);
        });

        it('should not subscribe when retrospectiveId is undefined', () => {
            const { result } = renderHook(() =>
                useRetrospectiveColumns(undefined)
            );

            expect(mockOnSnapshot).not.toHaveBeenCalled();
            expect(result.current.loading).toBe(false);
        });
    });

    describe('Column Configuration Generation', () => {
        it('should generate correct columnConfigs from retrospective columns', () => {
            const mockColumns = [
                {
                    id: 'helped',
                    i18nKey: 'retrospective.columns.helped',
                    type: 'regular' as const,
                    order: 1,
                    defaultColor: 'pastelGreen'
                },
                {
                    id: 'hindered',
                    i18nKey: 'retrospective.columns.hindered',
                    type: 'regular' as const,
                    order: 2,
                    defaultColor: 'pastelRed'
                }
            ];

            // Mock the onSnapshot to immediately call callback with mock data
            mockOnSnapshot.mockImplementation((query, callback) => {
                const mockSnapshot = createMockSnapshot(mockColumns);
                callback(mockSnapshot);
                return vi.fn(); // unsubscribe function
            });

            const { result } = renderHook(() =>
                useRetrospectiveColumns('test-retro-id')
            );

            expect(result.current.columnConfigs).toBeDefined();
            expect(result.current.columnConfigs['helped']).toEqual({
                id: 'helped',
                title: 'Qué ayudó',
                description: 'Cosas que ayudaron al equipo',
                color: 'pastelGreen',
                icon: '👍'
            });
        });

        it('should handle legacy i18n keys without retrospective prefix', () => {
            const mockColumns = [
                {
                    id: 'helped',
                    i18nKey: 'columns.helped', // Legacy format
                    type: 'regular' as const,
                    order: 1,
                    defaultColor: 'pastelGreen'
                }
            ];

            mockOnSnapshot.mockImplementation((query, callback) => {
                const mockSnapshot = createMockSnapshot(mockColumns);
                callback(mockSnapshot);
                return vi.fn();
            });

            renderHook(() => useRetrospectiveColumns('test-retro-id'));

            // Should call translation with updated key
            expect(mockT).toHaveBeenCalledWith('retrospective.columns.helped');
            expect(mockT).toHaveBeenCalledWith('retrospective.columns.descriptions.helped', { defaultValue: '' });
        });
    });

    describe('Column Order and Filtering', () => {
        it('should separate action columns from regular columns', () => {
            const mockColumns = [
                {
                    id: 'helped',
                    i18nKey: 'retrospective.columns.helped',
                    type: 'regular' as const,
                    order: 1,
                    defaultColor: 'pastelGreen'
                },
                {
                    id: 'actionItems',
                    i18nKey: 'retrospective.columns.actionItems',
                    type: 'action' as const,
                    order: 2,
                    defaultColor: 'pastelYellow'
                }
            ];

            mockOnSnapshot.mockImplementation((query, callback) => {
                const mockSnapshot = createMockSnapshot(mockColumns);
                callback(mockSnapshot);
                return vi.fn();
            });

            const { result } = renderHook(() =>
                useRetrospectiveColumns('test-retro-id')
            );

            expect(result.current.columns).toHaveLength(2); // Regular + action columns
            expect(result.current.actionColumn).toBeDefined();
            expect(result.current.actionColumn?.id).toBe('actionItems');
        });

        it('should maintain correct column order', async () => {
            const mockColumns = [
                {
                    id: 'improve',
                    i18nKey: 'retrospective.columns.improve',
                    type: 'regular' as const,
                    order: 3,
                    defaultColor: 'pastelYellow'
                },
                {
                    id: 'helped',
                    i18nKey: 'retrospective.columns.helped',
                    type: 'regular' as const,
                    order: 1,
                    defaultColor: 'pastelGreen'
                },
                {
                    id: 'hindered',
                    i18nKey: 'retrospective.columns.hindered',
                    type: 'regular' as const,
                    order: 2,
                    defaultColor: 'pastelRed'
                }
            ];

            mockOnSnapshot.mockImplementation((query, callback) => {
                const mockSnapshot = createMockSnapshot(mockColumns);
                callback(mockSnapshot);
                return vi.fn(); // Return unsubscribe function
            });

            const { result } = renderHook(() => useRetrospectiveColumns('retro-123'));

            await waitFor(() => {
                expect(result.current.loading).toBe(false);
            });

            expect(result.current.columnOrder).toEqual(['helped', 'hindered', 'improve']);
        });
    });
});
