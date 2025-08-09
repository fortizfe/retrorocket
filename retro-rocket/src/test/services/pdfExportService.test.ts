import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportRetrospectiveToPdf } from '../../services/pdfExportService';
import type { RetrospectiveExportData, ExportOptions } from '../../services/pdfExportService';

// Mock external dependencies
vi.mock('@react-pdf/renderer', () => ({
    Document: vi.fn(),
    Page: vi.fn(),
    Text: vi.fn(),
    View: vi.fn(),
    StyleSheet: {
        create: vi.fn().mockReturnValue({})
    },
    Font: {
        registerEmojiSource: vi.fn()
    },
    Image: vi.fn(),
    pdf: vi.fn().mockReturnValue({
        toBlob: vi.fn().mockResolvedValue(new Blob())
    })
}));

// Mock DOM methods
Object.defineProperty(window, 'document', {
    value: {
        createElement: vi.fn().mockReturnValue({
            href: '',
            download: '',
            click: vi.fn(),
            remove: vi.fn()
        }),
        body: {
            appendChild: vi.fn(),
            removeChild: vi.fn()
        }
    }
});

Object.defineProperty(window, 'URL', {
    value: {
        createObjectURL: vi.fn().mockReturnValue('mock-url'),
        revokeObjectURL: vi.fn()
    }
});

describe('PdfExportService', () => {
    let mockData: RetrospectiveExportData;

    beforeEach(() => {
        vi.clearAllMocks();

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

    it('should export retrospective to PDF successfully', async () => {
        const { pdf } = require('@react-pdf/renderer');

        await exportRetrospectiveToPdf(mockData);

        expect(pdf).toHaveBeenCalled();
        expect(window.document.createElement).toHaveBeenCalledWith('a');
        expect(window.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should export with all options enabled', async () => {
        const { pdf } = require('@react-pdf/renderer');

        const options: ExportOptions = {
            includeParticipants: true,
            includeStatistics: true,
            includeGroupDetails: true,
            includeFacilitatorNotes: true,
            includeActionItems: true,
            logoUrl: 'http://example.com/logo.png'
        };

        await exportRetrospectiveToPdf(mockData, options);

        expect(pdf).toHaveBeenCalled();
    });

    it('should handle export errors', async () => {
        const { pdf } = require('@react-pdf/renderer');
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        pdf.mockReturnValue({
            toBlob: vi.fn().mockRejectedValue(new Error('PDF export failed'))
        });

        await expect(exportRetrospectiveToPdf(mockData)).rejects.toThrow('PDF export failed');
        expect(consoleSpy).toHaveBeenCalled();
    });

    it('should generate correct filename', async () => {
        const mockLink = {
            href: '',
            download: '',
            click: vi.fn(),
            remove: vi.fn()
        };

        window.document.createElement = vi.fn().mockReturnValue(mockLink);

        await exportRetrospectiveToPdf(mockData);

        expect(mockLink.download).toMatch(/retrospectiva-test-retrospective-\d{4}-\d{2}-\d{2}\.pdf/);
    });

    it('should cleanup resources after export', async () => {
        await exportRetrospectiveToPdf(mockData);

        expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
        expect(window.document.body.removeChild).toHaveBeenCalled();
    });
});
