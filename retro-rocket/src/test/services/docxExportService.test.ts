import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocxExportService, exportRetrospectiveToDocx } from '../../services/docxExportService';
import type { RetrospectiveDocxData } from '../../services/docxExportService';

// Mock external dependencies
vi.mock('docx', () => ({
    Document: vi.fn().mockImplementation(() => ({})),
    Packer: {
        toBlob: vi.fn()
    },
    Paragraph: vi.fn(),
    TextRun: vi.fn(),
    HeadingLevel: { HEADING_1: 1, HEADING_2: 2, HEADING_3: 3 },
    AlignmentType: { CENTER: 'center', LEFT: 'left' },
    UnderlineType: { SINGLE: 'single' }
}));

vi.mock('file-saver', () => ({
    saveAs: vi.fn()
}));

describe('DocxExportService', () => {
    let service: DocxExportService;
    let mockData: RetrospectiveDocxData;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new DocxExportService();

        mockData = {
            retrospective: {
                id: 'retro-1',
                title: 'Test Retrospective',
                createdBy: 'facilitator-1',
                participantCount: 3,
                isActive: true,
                createdAt: new Date('2023-12-01T10:00:00Z'),
                updatedAt: new Date('2023-12-01T10:00:00Z')
            },
            cards: [
                {
                    id: 'card-1',
                    content: 'Test card 1',
                    column: 'helped',
                    retrospectiveId: 'retro-1',
                    createdBy: 'user-1',
                    createdAt: new Date('2023-12-01T10:10:00Z'),
                    updatedAt: new Date('2023-12-01T10:10:00Z'),
                    groupId: undefined,
                    likes: [],
                    reactions: []
                }
            ],
            groups: [],
            participants: [
                { name: 'John Doe', joinedAt: new Date('2023-12-01T10:00:00Z') }
            ],
            facilitatorNotes: [],
            actionItems: []
        };
    });

    it('should create an instance', () => {
        expect(service).toBeInstanceOf(DocxExportService);
    });

    it('should export retrospective successfully', async () => {
        const { Document, Packer } = require('docx');
        const { saveAs } = require('file-saver');
        const mockBlob = new Blob();

        (Packer.toBlob as any).mockResolvedValue(mockBlob);

        await service.exportRetrospective(mockData);

        expect(Document).toHaveBeenCalled();
        expect(Packer.toBlob).toHaveBeenCalled();
        expect(saveAs).toHaveBeenCalledWith(mockBlob, expect.stringMatching(/\.docx$/));
    });

    it('should handle export errors', async () => {
        const { Packer } = require('docx');
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        (Packer.toBlob as any).mockRejectedValue(new Error('Export failed'));

        await expect(service.exportRetrospective(mockData)).rejects.toThrow('Failed to export DOCX');
        expect(consoleSpy).toHaveBeenCalled();
    });

    it('should export using standalone function', async () => {
        const { Document, Packer } = require('docx');
        const { saveAs } = require('file-saver');

        (Packer.toBlob as any).mockResolvedValue(new Blob());

        await exportRetrospectiveToDocx(mockData);

        expect(Document).toHaveBeenCalled();
        expect(saveAs).toHaveBeenCalled();
    });
});
