import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TxtExportService, TxtExportOptions, RetrospectiveTxtData, exportRetrospectiveToTxt } from '@/features/boards/export/services/txtExportService';
import { saveAs } from 'file-saver';

// Mock file-saver
vi.mock('file-saver', () => ({
    saveAs: vi.fn(),
}));

// Mock console methods
vi.spyOn(console, 'log').mockImplementation(() => { });
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => { });

describe('TxtExportService', () => {
    let service: TxtExportService;
    let mockData: RetrospectiveTxtData;

    beforeEach(() => {
        service = new TxtExportService();
        vi.clearAllMocks();

        // Mock data
        mockData = {
            retrospective: {
                id: 'retro-1',
                title: 'Test Retrospective',
                description: 'A test retrospective',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
                createdBy: 'user-1',
                participantCount: 2,
                isActive: true,
            },
            cards: [
                {
                    id: 'card-1',
                    retrospectiveId: 'retro-1',
                    column: 'helped',
                    content: 'Test card content',
                    createdBy: 'user-1',
                    createdByName: 'User 1',
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-01'),
                    votes: 3,
                    likes: [
                        { userId: 'user-1', username: 'User 1', timestamp: new Date('2024-01-01') },
                        { userId: 'user-2', username: 'User 2', timestamp: new Date('2024-01-01') },
                    ],
                    reactions: [
                        { userId: 'user-1', username: 'User 1', emoji: '👍', timestamp: new Date('2024-01-01') },
                        { userId: 'user-2', username: 'User 2', emoji: '🎉', timestamp: new Date('2024-01-01') },
                    ],
                },
                {
                    id: 'card-2',
                    retrospectiveId: 'retro-1',
                    column: 'hindered',
                    content: 'Another test card',
                    createdBy: 'user-2',
                    createdByName: 'User 2',
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-01'),
                    votes: 1,
                    likes: [
                        { userId: 'user-1', username: 'User 1', timestamp: new Date('2024-01-01') },
                    ],
                    reactions: [
                        { userId: 'user-1', username: 'User 1', emoji: '👍', timestamp: new Date('2024-01-01') },
                    ],
                },
            ],
            groups: [
                {
                    id: 'group-1',
                    retrospectiveId: 'retro-1',
                    column: 'helped',
                    title: 'Test Group',
                    headCardId: 'card-1',
                    memberCardIds: ['card-2'],
                    isCollapsed: false,
                    createdAt: new Date('2024-01-01'),
                    createdBy: 'user-1',
                    order: 1,
                },
            ],
            participants: [
                { id: 'p1', userId: 'user-1', name: 'User 1', retrospectiveId: 'retro-1', joinedAt: new Date('2024-01-01') },
                { id: 'p2', userId: 'user-2', name: 'User 2', retrospectiveId: 'retro-1', joinedAt: new Date('2024-01-01') },
            ],
            facilitatorNotes: [
                {
                    id: 'note-1',
                    retrospectiveId: 'retro-1',
                    content: 'Test facilitator note',
                    timestamp: new Date('2024-01-01'),
                    facilitatorId: 'facilitator-1',
                },
            ],
            actionItems: [
                {
                    id: 'action-1',
                    retrospectiveId: 'retro-1',
                    content: 'Test action item',
                    assignedTo: 'user-1',
                    assignedToName: 'User 1',
                    createdBy: 'facilitator-1',
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-01'),
                    dueDate: new Date('2024-01-15'),
                },
            ],
        };
    });

    describe('exportRetrospective', () => {
        it('should export retrospective with basic options', async () => {
            const options: TxtExportOptions = {
                includeParticipants: true,
                includeStatistics: true,
            };

            await service.exportRetrospective(mockData, options);

            expect(saveAs).toHaveBeenCalledTimes(1);
            expect(saveAs).toHaveBeenCalledWith(
                expect.any(Blob),
                'test_retrospective.txt'
            );

            const saveAsCall = vi.mocked(saveAs).mock.calls[0];
            const blob = saveAsCall[0] as Blob;
            expect(blob.type).toBe('text/plain;charset=utf-8');

            // Read blob content
            const content = await blob.text();
            expect(content).toContain('RETROSPECTIVA: TEST RETROSPECTIVE');
            expect(content).toContain('👥 PARTICIPANTES');
            expect(content).toContain('📊 RESUMEN ESTADÍSTICO');
            expect(content).toContain('User 1');
            expect(content).toContain('User 2');
        });

        it('should include card authors when option is enabled', async () => {
            const options: TxtExportOptions = {
                includeCardAuthors: true,
            };

            await service.exportRetrospective(mockData, options);

            const saveAsCall = vi.mocked(saveAs).mock.calls[0];
            const blob = saveAsCall[0] as Blob;
            const content = await blob.text();

            expect(content).toContain('Autor: User 1');
            expect(content).toContain('Autor: User 2');
        });

        it('resolves the author via the live participant match, never rendering the raw createdBy uid (022, FR-005)', async () => {
            const dataWithRenamedAuthor = {
                ...mockData,
                cards: [
                    { ...mockData.cards[0], createdBy: 'user-1', createdByName: 'Old Captured Name' },
                ],
                participants: [
                    { ...mockData.participants[0], userId: 'user-1', name: 'New Current Name' },
                ],
            };
            const options: TxtExportOptions = { includeCardAuthors: true };

            await service.exportRetrospective(dataWithRenamedAuthor, options);

            const saveAsCall = vi.mocked(saveAs).mock.calls[0];
            const blob = saveAsCall[0] as Blob;
            const content = await blob.text();

            expect(content).toContain('Autor: New Current Name');
            expect(content).not.toContain('Autor: Old Captured Name');
            expect(content).not.toContain('user-1');
        });

        it('falls back to the captured createdByName when the author has no matching participant (022, FR-003, deleted account)', async () => {
            const dataWithDeletedAuthor = {
                ...mockData,
                cards: [
                    { ...mockData.cards[0], createdBy: 'departed-uid', createdByName: 'Old Name' },
                ],
                participants: [],
            };
            const options: TxtExportOptions = { includeCardAuthors: true };

            await service.exportRetrospective(dataWithDeletedAuthor, options);

            const saveAsCall = vi.mocked(saveAs).mock.calls[0];
            const blob = saveAsCall[0] as Blob;
            const content = await blob.text();

            expect(content).toContain('Autor: Old Name');
            expect(content).not.toContain('departed-uid');
        });

        it('falls back to a generic label, never the raw uid, when neither a participant match nor a captured name exists (022, FR-004)', async () => {
            const dataWithUnresolvableAuthor = {
                ...mockData,
                cards: [
                    { ...mockData.cards[0], createdBy: 'departed-uid', createdByName: undefined },
                ],
                participants: [],
            };
            const options: TxtExportOptions = { includeCardAuthors: true };

            await service.exportRetrospective(dataWithUnresolvableAuthor, options);

            const saveAsCall = vi.mocked(saveAs).mock.calls[0];
            const blob = saveAsCall[0] as Blob;
            const content = await blob.text();

            expect(content).toContain('Autor: Sin autor');
            expect(content).not.toContain('departed-uid');
        });

        it('should include group details when option is enabled', async () => {
            const options: TxtExportOptions = {
                includeGroupDetails: true,
            };

            await service.exportRetrospective(mockData, options);

            const saveAsCall = vi.mocked(saveAs).mock.calls[0];
            const blob = saveAsCall[0] as Blob;
            const content = await blob.text();

            expect(content).toContain('🔗 AGRUPACIONES DE TARJETAS');
            expect(content).toContain('TEST GROUP');
            expect(content).toContain('⭐ TARJETA PRINCIPAL:');
        });

        it('should include facilitator notes when option is enabled', async () => {
            const options: TxtExportOptions = {
                includeFacilitatorNotes: true,
            };

            await service.exportRetrospective(mockData, options);

            const saveAsCall = vi.mocked(saveAs).mock.calls[0];
            const blob = saveAsCall[0] as Blob;
            const content = await blob.text();

            expect(content).toContain('📋 NOTAS DEL FACILITADOR');
            expect(content).toContain('Test facilitator note');
        });

        it('should include action items when option is enabled', async () => {
            const options: TxtExportOptions = {
                includeActionItems: true,
            };

            await service.exportRetrospective(mockData, options);

            const saveAsCall = vi.mocked(saveAs).mock.calls[0];
            const blob = saveAsCall[0] as Blob;
            const content = await blob.text();

            expect(content).toContain('🎯 ELEMENTOS DE ACCIÓN');
            expect(content).toContain('Test action item');
            expect(content).toContain('👤 Responsable: User 1');
        });

        it('should handle cards without content', async () => {
            const dataWithEmptyCard = {
                ...mockData,
                cards: [
                    {
                        ...mockData.cards[0],
                        content: '',
                    },
                ],
            };

            await service.exportRetrospective(dataWithEmptyCard);

            const saveAsCall = vi.mocked(saveAs).mock.calls[0];
            const blob = saveAsCall[0] as Blob;
            const content = await blob.text();

            expect(content).toContain('[Sin contenido]');
        });

        it('should sanitize filename correctly', async () => {
            const dataWithSpecialChars = {
                ...mockData,
                retrospective: {
                    ...mockData.retrospective,
                    title: 'Test: Retro/Name <Special> Chars?',
                },
            };

            await service.exportRetrospective(dataWithSpecialChars);

            expect(saveAs).toHaveBeenCalledWith(
                expect.any(Blob),
                'test__retro_name__special__chars_.txt'
            );
        });

        it('should handle errors during export', async () => {
            // Store original implementation
            const originalImplementation = vi.mocked(saveAs).getMockImplementation();

            // Create a temporary mock for this test only
            vi.mocked(saveAs).mockImplementation(() => {
                throw new Error('Export failed');
            });

            await expect(service.exportRetrospective(mockData)).rejects.toThrow('Export failed');
            expect(mockConsoleError).toHaveBeenCalledWith('Error exporting to TXT:', expect.any(Error));

            // Restore the original implementation
            if (originalImplementation) {
                vi.mocked(saveAs).mockImplementation(originalImplementation);
            } else {
                vi.mocked(saveAs).mockRestore();
            }
        });

        it('should include all statistics in statistics section', async () => {
            const options: TxtExportOptions = {
                includeStatistics: true,
                includeActionItems: true,
            };

            await service.exportRetrospective(mockData, options);

            const saveAsCall = vi.mocked(saveAs).mock.calls[0];
            const blob = saveAsCall[0] as Blob;
            const content = await blob.text();

            expect(content).toContain('📝 Total de tarjetas     ·············');
            expect(content).toContain('🗳️ Total de votos        ·············');
            expect(content).toContain('❤️ Total de likes        ·············');
            expect(content).toContain('👥 Participantes activos ·············');
            expect(content).toContain('🔗 Grupos formados       ·············');
            expect(content).toContain('🎯 Elementos de acción   ·············');
        });

        it('should include RetroRocket footer', async () => {
            await service.exportRetrospective(mockData);

            const saveAsCall = vi.mocked(saveAs).mock.calls[0];
            const blob = saveAsCall[0] as Blob;
            const content = await blob.text();

            expect(content).toContain('🎯 GENERADO POR RETROROCKET 🎯');
        });
    });

    // spec 051-anonymous-board-mode, US2 (FR-012, SC-006), T032: an anonymous board's
    // export must omit the "Autor: ..." line while keeping the rest of each card's
    // content (text, votes, likes) — anonymity-ui-behavior-contract.md's "Exports"
    // table. The export reflects whatever isAnonymous value is on the retrospective
    // object passed in, not a separate option.
    describe('Anonymous board mode (spec 051-anonymous-board-mode, US2, T032)', () => {
        it('omits the "Autor:" line when the retrospective is anonymous, while keeping the rest of the card content', async () => {
            const anonymousData: RetrospectiveTxtData = {
                ...mockData,
                retrospective: { ...mockData.retrospective, isAnonymous: true } as RetrospectiveTxtData['retrospective'],
            };
            const options: TxtExportOptions = { includeCardAuthors: true };

            await service.exportRetrospective(anonymousData, options);

            const saveAsCall = vi.mocked(saveAs).mock.calls[0];
            const blob = saveAsCall[0] as Blob;
            const content = await blob.text();

            expect(content).not.toContain('Autor:');
            expect(content).toContain('Test card content');
            expect(content).toContain('Another test card');
        });

        it('still includes the "Autor:" line when the retrospective is not anonymous (control, regression)', async () => {
            const nonAnonymousData: RetrospectiveTxtData = {
                ...mockData,
                retrospective: { ...mockData.retrospective, isAnonymous: false } as RetrospectiveTxtData['retrospective'],
            };
            const options: TxtExportOptions = { includeCardAuthors: true };

            await service.exportRetrospective(nonAnonymousData, options);

            const saveAsCall = vi.mocked(saveAs).mock.calls[0];
            const blob = saveAsCall[0] as Blob;
            const content = await blob.text();

            expect(content).toContain('Autor: User 1');
            expect(content).toContain('Autor: User 2');
        });
    });

    describe('exportRetrospectiveToTxt function', () => {
        it('should work as a standalone function', async () => {
            await exportRetrospectiveToTxt(mockData, { includeStatistics: true });

            expect(saveAs).toHaveBeenCalledTimes(1);
            expect(saveAs).toHaveBeenCalledWith(
                expect.any(Blob),
                'test_retrospective.txt'
            );
        });
    });
});
