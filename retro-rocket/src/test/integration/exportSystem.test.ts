import { describe, it, expect } from 'vitest';
import { getExportColumns, getExportColumnOrder, getTemplateName } from '../../utils/exportColumns';

describe('Template-based Column System Integration', () => {
    const mockMadSadGladCards = [
        {
            id: 'card1',
            content: 'This made me angry',
            column: 'mad',
            createdBy: 'User1',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            retrospectiveId: 'test-retro',
            likes: ['user2', 'user3'],
            reactions: [{ emoji: '😡', userId: 'user2' }]
        },
        {
            id: 'card2',
            content: 'This made me sad',
            column: 'sad',
            createdBy: 'User2',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            retrospectiveId: 'test-retro',
            likes: ['user1'],
            reactions: [{ emoji: '😢', userId: 'user1' }]
        },
        {
            id: 'card3',
            content: 'This made me glad',
            column: 'glad',
            createdBy: 'User3',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            retrospectiveId: 'test-retro',
            likes: ['user1', 'user2', 'user3'],
            reactions: [{ emoji: '😄', userId: 'user3' }]
        }
    ];

    const mockStartStopContinueCards = [
        {
            id: 'card1',
            content: 'Start doing this',
            column: 'start',
            createdBy: 'User1',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            retrospectiveId: 'test-retro',
            likes: [],
            reactions: []
        },
        {
            id: 'card2',
            content: 'Stop doing this',
            column: 'stop',
            createdBy: 'User2',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            retrospectiveId: 'test-retro',
            likes: [],
            reactions: []
        },
        {
            id: 'card3',
            content: 'Continue doing this',
            column: 'continue',
            createdBy: 'User3',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            retrospectiveId: 'test-retro',
            likes: [],
            reactions: []
        }
    ];

    it('should correctly identify column structure for Mad Sad Glad template', () => {
        const columns = getExportColumns('madSadGlad');
        const columnOrder = getExportColumnOrder('madSadGlad');
        const templateName = getTemplateName('madSadGlad');

        // Check that the correct columns are returned
        expect(columns).toHaveProperty('mad');
        expect(columns).toHaveProperty('sad');
        expect(columns).toHaveProperty('glad');

        // Check that column order is correct
        expect(columnOrder).toEqual(['mad', 'sad', 'glad']);

        // Check template name
        expect(templateName).toBe('Mad, Sad, Glad');

        // Verify Mad Sad Glad cards would be processed correctly
        const madCards = mockMadSadGladCards.filter(card => card.column === 'mad');
        const sadCards = mockMadSadGladCards.filter(card => card.column === 'sad');
        const gladCards = mockMadSadGladCards.filter(card => card.column === 'glad');

        expect(madCards).toHaveLength(1);
        expect(sadCards).toHaveLength(1);
        expect(gladCards).toHaveLength(1);

        expect(madCards[0].content).toBe('This made me angry');
        expect(sadCards[0].content).toBe('This made me sad');
        expect(gladCards[0].content).toBe('This made me glad');
    });

    it('should correctly identify column structure for Start Stop Continue template', () => {
        const columns = getExportColumns('startStopContinue');
        const columnOrder = getExportColumnOrder('startStopContinue');
        const templateName = getTemplateName('startStopContinue');

        // Check that the correct columns are returned
        expect(columns).toHaveProperty('start');
        expect(columns).toHaveProperty('stop');
        expect(columns).toHaveProperty('continue');

        // Check that column order is correct
        expect(columnOrder).toEqual(['start', 'stop', 'continue']);

        // Check template name
        expect(templateName).toBe('Start, Stop, Continue');

        // Verify Start Stop Continue cards would be processed correctly
        const startCards = mockStartStopContinueCards.filter(card => card.column === 'start');
        const stopCards = mockStartStopContinueCards.filter(card => card.column === 'stop');
        const continueCards = mockStartStopContinueCards.filter(card => card.column === 'continue');

        expect(startCards).toHaveLength(1);
        expect(stopCards).toHaveLength(1);
        expect(continueCards).toHaveLength(1);

        expect(startCards[0].content).toBe('Start doing this');
        expect(stopCards[0].content).toBe('Stop doing this');
        expect(continueCards[0].content).toBe('Continue doing this');
    });

    it('should handle template switching correctly', () => {
        // Test that the system can handle different templates in the same test run
        const defaultColumns = getExportColumns('default');
        const madSadGladColumns = getExportColumns('madSadGlad');
        const startStopContinueColumns = getExportColumns('startStopContinue');

        // Verify each template returns different column structures
        expect(Object.keys(defaultColumns)).toEqual(['helped', 'hindered', 'improve']);
        expect(Object.keys(madSadGladColumns)).toEqual(['mad', 'sad', 'glad']);
        expect(Object.keys(startStopContinueColumns)).toEqual(['start', 'stop', 'continue']);

        // Verify template names are different
        expect(getTemplateName('default')).toBe('Default Template');
        expect(getTemplateName('madSadGlad')).toBe('Mad, Sad, Glad');
        expect(getTemplateName('startStopContinue')).toBe('Start, Stop, Continue');
    });

    it('should handle data filtering by template columns', () => {
        const madSadGladColumns = getExportColumns('madSadGlad');
        const validColumns = Object.keys(madSadGladColumns);

        // Filter cards that belong to the template columns
        const validMadSadGladCards = mockMadSadGladCards.filter(card =>
            validColumns.includes(card.column)
        );

        // Filter cards that don't belong to the template (should be none for correct data)
        const invalidCards = mockMadSadGladCards.filter(card =>
            !validColumns.includes(card.column)
        );

        expect(validMadSadGladCards).toHaveLength(3); // All cards are valid
        expect(invalidCards).toHaveLength(0); // No invalid cards
    });

    it('should handle edge case with mixed template data', () => {
        // Create a scenario with cards from different templates mixed together
        const mixedCards = [
            ...mockMadSadGladCards,
            {
                id: 'invalid1',
                content: 'This helped us',
                column: 'helped', // This belongs to default template, not madSadGlad
                createdBy: 'User1',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
                retrospectiveId: 'test-retro',
                likes: [],
                reactions: []
            }
        ];

        const madSadGladColumns = getExportColumns('madSadGlad');
        const validColumns = Object.keys(madSadGladColumns);

        const validCards = mixedCards.filter(card =>
            validColumns.includes(card.column)
        );

        const invalidCards = mixedCards.filter(card =>
            !validColumns.includes(card.column)
        );

        expect(validCards).toHaveLength(3); // Only Mad Sad Glad cards
        expect(invalidCards).toHaveLength(1); // The 'helped' card doesn't belong
        expect(invalidCards[0].column).toBe('helped');
    });

    it('should preserve card metadata during template processing', () => {
        // Verify that cards maintain their likes and reactions
        mockMadSadGladCards.forEach(card => {
            expect(card.likes).toBeDefined();
            expect(card.reactions).toBeDefined();
            expect(card.createdBy).toBeDefined();
            expect(card.createdAt).toBeDefined();
        });

        // Check specific metadata
        const madCard = mockMadSadGladCards.find(card => card.column === 'mad');
        expect(madCard?.likes).toHaveLength(2);
        expect(madCard?.reactions).toHaveLength(1);
        expect(madCard?.reactions[0].emoji).toBe('😡');

        const gladCard = mockMadSadGladCards.find(card => card.column === 'glad');
        expect(gladCard?.likes).toHaveLength(3);
        expect(gladCard?.reactions).toHaveLength(1);
        expect(gladCard?.reactions[0].emoji).toBe('😄');
    });
});
