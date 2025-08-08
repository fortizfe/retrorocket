import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TxtExportService, TxtExportOptions, RetrospectiveTxtData, exportRetrospectiveToTxt } from '../../services/txtExportService';
import { saveAs } from 'file-saver';

// Mock file-saver
vi.mock('file-saver', () => ({
    saveAs: vi.fn(),
}));

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => { });
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
                    createdBy: 'User 1',
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
                    createdBy: 'User 2',
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
                { name: 'User 1', joinedAt: new Date('2024-01-01') },
                { name: 'User 2', joinedAt: new Date('2024-01-01') },
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
            expect(content).toContain('PARTICIPANTES:');
            expect(content).toContain('ESTADÍSTICAS:');
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

        it('should include group details when option is enabled', async () => {
            const options: TxtExportOptions = {
                includeGroupDetails: true,
            };

            await service.exportRetrospective(mockData, options);

            const saveAsCall = vi.mocked(saveAs).mock.calls[0];
            const blob = saveAsCall[0] as Blob;
            const content = await blob.text();

            expect(content).toContain('AGRUPACIONES:');
            expect(content).toContain('Test Group');
            expect(content).toContain('★ Principal:');
        });

        it('should include facilitator notes when option is enabled', async () => {
            const options: TxtExportOptions = {
                includeFacilitatorNotes: true,
            };

            await service.exportRetrospective(mockData, options);

            const saveAsCall = vi.mocked(saveAs).mock.calls[0];
            const blob = saveAsCall[0] as Blob;
            const content = await blob.text();

            expect(content).toContain('NOTAS DEL FACILITADOR:');
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

            expect(content).toContain('ELEMENTOS DE ACCIÓN:');
            expect(content).toContain('Test action item');
            expect(content).toContain('Responsable: User 1');
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
            vi.mocked(saveAs).mockImplementation(() => {
                throw new Error('Export failed');
            });

            await expect(service.exportRetrospective(mockData)).rejects.toThrow('Export failed');
            expect(mockConsoleError).toHaveBeenCalledWith('Error exporting to TXT:', expect.any(Error));
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

            expect(content).toContain('Total de tarjetas: 2');
            expect(content).toContain('Total de votos: 4');
            expect(content).toContain('Total de likes: 3');
            expect(content).toContain('Participantes: 2');
            expect(content).toContain('Grupos formados: 1');
            expect(content).toContain('Elementos de acción: 1');
        });

        it('should include RetroRocket footer', async () => {
            await service.exportRetrospective(mockData);

            const saveAsCall = vi.mocked(saveAs).mock.calls[0];
            const blob = saveAsCall[0] as Blob;
            const content = await blob.text();

            expect(content).toContain('Generado por RetroRocket el');
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
