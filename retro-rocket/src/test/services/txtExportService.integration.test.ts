import { describe, it, expect } from 'vitest';
import { TxtExportService } from '../../services/txtExportService';

describe('TXT Export Service - Template Support', () => {
    const mockRetrospective = {
        id: 'test-retro',
        title: 'Test Retrospective',
        description: 'Test description',
        templateId: 'madSadGlad',
        createdBy: 'user1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        participantCount: 3,
        isActive: true
    };

    const mockCards = [
        {
            id: 'card1',
            content: 'I was mad about the bugs',
            column: 'mad',
            createdBy: 'User1',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            retrospectiveId: 'test-retro',
            likes: [],
            reactions: []
        },
        {
            id: 'card2',
            content: 'I was sad about the delays',
            column: 'sad',
            createdBy: 'User2',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            retrospectiveId: 'test-retro',
            likes: [],
            reactions: []
        },
        {
            id: 'card3',
            content: 'I was glad about the team work',
            column: 'glad',
            createdBy: 'User3',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            retrospectiveId: 'test-retro',
            likes: [],
            reactions: []
        }
    ];

    const mockParticipants = [
        { name: 'User1', joinedAt: new Date('2024-01-01') },
        { name: 'User2', joinedAt: new Date('2024-01-01') },
        { name: 'User3', joinedAt: new Date('2024-01-01') }
    ];

    const mockActionItems = [
        {
            id: 'action1',
            content: 'Fix the bugs',
            assignedTo: 'user1',
            assignedToName: 'User1',
            retrospectiveId: 'test-retro',
            createdBy: 'facilitator',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            dueDate: new Date('2024-01-15')
        }
    ];

    it('should export with Mad Sad Glad template columns', async () => {
        const service = new TxtExportService();

        // Create a mock for the buildTextContent method to capture its output
        const originalBuildTextContent = (service as any).buildTextContent.bind(service);
        let capturedContent = '';

        (service as any).buildTextContent = function (...args: any[]) {
            capturedContent = originalBuildTextContent(...args);
            return capturedContent;
        };

        const exportData = {
            retrospective: mockRetrospective,
            cards: mockCards,
            groups: [],
            participants: mockParticipants,
            actionItems: mockActionItems
        };

        const options = {
            includeParticipants: true,
            includeStatistics: true,
            includeActionItems: true
        };

        // Mock saveAs to capture the content instead of downloading
        const mockSaveAs = (blob: Blob, filename: string) => {
            return blob.text().then(text => {
                capturedContent = text;
            });
        };

        // Override the saveAs import temporarily
        const originalSaveAs = require('file-saver').saveAs;
        require('file-saver').saveAs = mockSaveAs;

        try {
            await service.exportRetrospective(exportData, options);

            // Verify that the content includes Mad Sad Glad template columns
            expect(capturedContent).toContain('RETROSPECTIVA: TEST RETROSPECTIVE');
            expect(capturedContent).toContain('Plantilla: '); // Template info should be included

            // Check that the Mad Sad Glad columns are used instead of default columns
            expect(capturedContent).toContain('MAD:');
            expect(capturedContent).toContain('SAD:');
            expect(capturedContent).toContain('GLAD:');

            // Check that default columns are NOT present
            expect(capturedContent).not.toContain('HELPED:');
            expect(capturedContent).not.toContain('HINDERED:');
            expect(capturedContent).not.toContain('IMPROVE:');

            // Check that cards content is included
            expect(capturedContent).toContain('I was mad about the bugs');
            expect(capturedContent).toContain('I was sad about the delays');
            expect(capturedContent).toContain('I was glad about the team work');

            // Check statistics include correct column names
            expect(capturedContent).toMatch(/Mad.*\d+ tarjetas/);
            expect(capturedContent).toMatch(/Sad.*\d+ tarjetas/);
            expect(capturedContent).toMatch(/Glad.*\d+ tarjetas/);

        } finally {
            // Restore original saveAs
            require('file-saver').saveAs = originalSaveAs;
        }
    });

    it('should fall back to default columns for invalid template', async () => {
        const service = new TxtExportService();

        // Test with invalid template
        const retroWithInvalidTemplate = {
            ...mockRetrospective,
            templateId: 'invalid-template'
        };

        // Test with cards that match default template
        const defaultCards = [
            {
                id: 'card1',
                content: 'This helped us',
                column: 'helped',
                createdBy: 'User1',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
                retrospectiveId: 'test-retro',
                likes: [],
                reactions: []
            }
        ];

        let capturedContent = '';
        const originalBuildTextContent = (service as any).buildTextContent.bind(service);

        (service as any).buildTextContent = function (...args: any[]) {
            capturedContent = originalBuildTextContent(...args);
            return capturedContent;
        };

        const fallbackMockSaveAs = async (blob: Blob, filename: string) => {
            const text = await blob.text();
            capturedContent = text;
        };

        const originalSaveAs = require('file-saver').saveAs;
        require('file-saver').saveAs = fallbackMockSaveAs;

        try {
            await service.exportRetrospective({
                retrospective: retroWithInvalidTemplate,
                cards: defaultCards,
                groups: [],
                participants: mockParticipants
            }, { includeStatistics: true });

            // Should use default columns
            expect(capturedContent).toContain('HELPED:');
            expect(capturedContent).not.toContain('MAD:');

        } finally {
            require('file-saver').saveAs = originalSaveAs;
        }
    });
});
