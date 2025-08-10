import { describe, it, expect } from 'vitest';
import {
    ExportFormat,
    SortOrder,
    UnifiedExportOptions,
    UnifiedExportData,
    UseUnifiedExportState
} from '../../types/export';

describe('Export Types', () => {
    describe('ExportFormat type', () => {
        it('should have correct literal types', () => {
            const formats: ExportFormat[] = ['pdf', 'txt', 'docx'];

            expect(formats).toContain('pdf');
            expect(formats).toContain('txt');
            expect(formats).toContain('docx');
            expect(formats).toHaveLength(3);
        });

        it('should work with type validation', () => {
            const isValidFormat = (format: string): format is ExportFormat => {
                return ['pdf', 'txt', 'docx'].includes(format);
            };

            expect(isValidFormat('pdf')).toBe(true);
            expect(isValidFormat('txt')).toBe(true);
            expect(isValidFormat('docx')).toBe(true);
            expect(isValidFormat('xlsx')).toBe(false);
            expect(isValidFormat('html')).toBe(false);
            expect(isValidFormat('')).toBe(false);
        });

        it('should handle format-specific operations', () => {
            const getFileExtension = (format: ExportFormat): string => {
                switch (format) {
                    case 'pdf': return '.pdf';
                    case 'txt': return '.txt';
                    case 'docx': return '.docx';
                }
            };

            const getMimeType = (format: ExportFormat): string => {
                switch (format) {
                    case 'pdf': return 'application/pdf';
                    case 'txt': return 'text/plain';
                    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                }
            };

            expect(getFileExtension('pdf')).toBe('.pdf');
            expect(getFileExtension('txt')).toBe('.txt');
            expect(getFileExtension('docx')).toBe('.docx');

            expect(getMimeType('pdf')).toBe('application/pdf');
            expect(getMimeType('txt')).toBe('text/plain');
            expect(getMimeType('docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        });
    });

    describe('SortOrder type', () => {
        it('should have correct literal types', () => {
            const orders: SortOrder[] = ['original', 'alphabetical', 'votes', 'likes'];

            expect(orders).toContain('original');
            expect(orders).toContain('alphabetical');
            expect(orders).toContain('votes');
            expect(orders).toContain('likes');
            expect(orders).toHaveLength(4);
        });

        it('should work with sorting functions', () => {
            const applySortOrder = (items: Array<{ content: string; votes?: number; likes?: number }>, order: SortOrder) => {
                switch (order) {
                    case 'original':
                        return items; // No sorting
                    case 'alphabetical':
                        return [...items].sort((a, b) => a.content.localeCompare(b.content));
                    case 'votes':
                        return [...items].sort((a, b) => (b.votes || 0) - (a.votes || 0));
                    case 'likes':
                        return [...items].sort((a, b) => (b.likes || 0) - (a.likes || 0));
                }
            };

            const testItems = [
                { content: 'Zebra', votes: 3, likes: 5 },
                { content: 'Alpha', votes: 8, likes: 2 },
                { content: 'Beta', votes: 1, likes: 10 }
            ];

            const originalSort = applySortOrder(testItems, 'original');
            const alphabeticalSort = applySortOrder(testItems, 'alphabetical');
            const votesSort = applySortOrder(testItems, 'votes');
            const likesSort = applySortOrder(testItems, 'likes');

            expect(originalSort.map(i => i.content)).toEqual(['Zebra', 'Alpha', 'Beta']);
            expect(alphabeticalSort.map(i => i.content)).toEqual(['Alpha', 'Beta', 'Zebra']);
            expect(votesSort.map(i => i.content)).toEqual(['Alpha', 'Zebra', 'Beta']);
            expect(likesSort.map(i => i.content)).toEqual(['Beta', 'Zebra', 'Alpha']);
        });
    });

    describe('UnifiedExportOptions interface', () => {
        it('should have correct structure with required properties', () => {
            const options: UnifiedExportOptions = {
                format: 'pdf',
                includeParticipants: true,
                includeStatistics: true,
                includeCardAuthors: false,
                includeReactions: true,
                includeGroupDetails: true,
                includeActionItems: true,
                sortOrder: 'votes',
                includeFacilitatorNotes: false
            };

            expect(typeof options.format).toBe('string');
            expect(typeof options.includeParticipants).toBe('boolean');
            expect(typeof options.includeStatistics).toBe('boolean');
            expect(typeof options.includeCardAuthors).toBe('boolean');
            expect(typeof options.includeReactions).toBe('boolean');
            expect(typeof options.includeGroupDetails).toBe('boolean');
            expect(typeof options.includeActionItems).toBe('boolean');
            expect(typeof options.sortOrder).toBe('string');
            expect(typeof options.includeFacilitatorNotes).toBe('boolean');

            // Required properties
            expect(options).toHaveProperty('format');
            expect(options).toHaveProperty('includeParticipants');
            expect(options).toHaveProperty('includeStatistics');
            expect(options).toHaveProperty('includeCardAuthors');
            expect(options).toHaveProperty('includeReactions');
            expect(options).toHaveProperty('includeGroupDetails');
            expect(options).toHaveProperty('includeActionItems');
            expect(options).toHaveProperty('sortOrder');
            expect(options).toHaveProperty('includeFacilitatorNotes');
        });

        it('should handle optional document configuration', () => {
            const minimalOptions: UnifiedExportOptions = {
                format: 'txt',
                includeParticipants: false,
                includeStatistics: false,
                includeCardAuthors: false,
                includeReactions: false,
                includeGroupDetails: false,
                includeActionItems: false,
                sortOrder: 'original',
                includeFacilitatorNotes: false
            };

            const fullOptions: UnifiedExportOptions = {
                format: 'pdf',
                documentTitle: 'Sprint 42 Retrospective',
                customTitle: 'Team Alpha Q1 2024 Review',
                includeRetroRocketLogo: true,
                includeParticipants: true,
                includeStatistics: true,
                includeCardAuthors: true,
                includeReactions: true,
                includeGroupDetails: true,
                includeActionItems: true,
                sortOrder: 'alphabetical',
                includeFacilitatorNotes: true,
                facilitatorNotes: 'Great session with high engagement'
            };

            expect(minimalOptions.documentTitle).toBeUndefined();
            expect(minimalOptions.customTitle).toBeUndefined();
            expect(minimalOptions.includeRetroRocketLogo).toBeUndefined();
            expect(minimalOptions.facilitatorNotes).toBeUndefined();

            expect(fullOptions.documentTitle).toBe('Sprint 42 Retrospective');
            expect(fullOptions.customTitle).toBe('Team Alpha Q1 2024 Review');
            expect(fullOptions.includeRetroRocketLogo).toBe(true);
            expect(fullOptions.facilitatorNotes).toBe('Great session with high engagement');
        });

        it('should handle format-specific options', () => {
            const pdfOptions: UnifiedExportOptions = {
                format: 'pdf',
                includeParticipants: true,
                includeStatistics: true,
                includeCardAuthors: true,
                includeReactions: true,
                includeGroupDetails: true,
                includeActionItems: true,
                sortOrder: 'votes',
                includeFacilitatorNotes: false,
                pdfOptions: {
                    pageSize: 'a4',
                    orientation: 'portrait'
                }
            };

            const txtOptions: UnifiedExportOptions = {
                format: 'txt',
                includeParticipants: false,
                includeStatistics: false,
                includeCardAuthors: false,
                includeReactions: false,
                includeGroupDetails: false,
                includeActionItems: false,
                sortOrder: 'original',
                includeFacilitatorNotes: false,
                txtOptions: {
                    encoding: 'utf-8',
                    lineEnding: 'unix'
                }
            };

            const docxOptions: UnifiedExportOptions = {
                format: 'docx',
                includeParticipants: true,
                includeStatistics: true,
                includeCardAuthors: false,
                includeReactions: true,
                includeGroupDetails: true,
                includeActionItems: true,
                sortOrder: 'likes',
                includeFacilitatorNotes: true,
                docxOptions: {
                    pageSize: 'letter',
                    orientation: 'landscape'
                }
            };

            expect(pdfOptions.pdfOptions?.pageSize).toBe('a4');
            expect(pdfOptions.pdfOptions?.orientation).toBe('portrait');
            expect(pdfOptions.txtOptions).toBeUndefined();
            expect(pdfOptions.docxOptions).toBeUndefined();

            expect(txtOptions.txtOptions?.encoding).toBe('utf-8');
            expect(txtOptions.txtOptions?.lineEnding).toBe('unix');
            expect(txtOptions.pdfOptions).toBeUndefined();
            expect(txtOptions.docxOptions).toBeUndefined();

            expect(docxOptions.docxOptions?.pageSize).toBe('letter');
            expect(docxOptions.docxOptions?.orientation).toBe('landscape');
            expect(docxOptions.pdfOptions).toBeUndefined();
            expect(docxOptions.txtOptions).toBeUndefined();
        });

        it('should validate content inclusion combinations', () => {
            const validateOptions = (options: UnifiedExportOptions): boolean => {
                // If including reactions, we should probably include card authors
                if (options.includeReactions && !options.includeCardAuthors) {
                    return false;
                }

                // If including facilitator notes but not the flag
                if (options.facilitatorNotes && !options.includeFacilitatorNotes) {
                    return false;
                }

                return true;
            };

            const validOptions: UnifiedExportOptions = {
                format: 'pdf',
                includeParticipants: true,
                includeStatistics: true,
                includeCardAuthors: true,
                includeReactions: true,
                includeGroupDetails: true,
                includeActionItems: true,
                sortOrder: 'votes',
                includeFacilitatorNotes: true,
                facilitatorNotes: 'Notes here'
            };

            const invalidOptions1: UnifiedExportOptions = {
                format: 'pdf',
                includeParticipants: true,
                includeStatistics: true,
                includeCardAuthors: false,
                includeReactions: true, // Including reactions without authors
                includeGroupDetails: true,
                includeActionItems: true,
                sortOrder: 'votes',
                includeFacilitatorNotes: false
            };

            const invalidOptions2: UnifiedExportOptions = {
                format: 'pdf',
                includeParticipants: true,
                includeStatistics: true,
                includeCardAuthors: true,
                includeReactions: true,
                includeGroupDetails: true,
                includeActionItems: true,
                sortOrder: 'votes',
                includeFacilitatorNotes: false,
                facilitatorNotes: 'Notes here' // Notes provided but flag is false
            };

            expect(validateOptions(validOptions)).toBe(true);
            expect(validateOptions(invalidOptions1)).toBe(false);
            expect(validateOptions(invalidOptions2)).toBe(false);
        });
    });

    describe('UnifiedExportData interface', () => {
        it('should have correct structure with required properties', () => {
            const exportData: UnifiedExportData = {
                retrospective: {
                    id: 'retro123',
                    title: 'Sprint 42 Retrospective',
                    description: 'End of sprint retrospective',
                    createdBy: 'user456',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    participantCount: 8,
                    isActive: false
                },
                cards: [
                    {
                        id: 'card1',
                        content: 'Good teamwork',
                        column: 'helped',
                        createdBy: 'user1',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        retrospectiveId: 'retro123',
                        votes: 5
                    }
                ],
                groups: [
                    {
                        id: 'group1',
                        retrospectiveId: 'retro123',
                        column: 'helped',
                        headCardId: 'card1',
                        memberCardIds: [],
                        title: 'Communication',
                        isCollapsed: false,
                        createdAt: new Date(),
                        createdBy: 'user1',
                        order: 0
                    }
                ],
                participants: [
                    {
                        name: 'John Doe',
                        joinedAt: new Date()
                    },
                    {
                        name: 'Jane Smith',
                        joinedAt: new Date()
                    }
                ]
            };

            expect(typeof exportData.retrospective).toBe('object');
            expect(Array.isArray(exportData.cards)).toBe(true);
            expect(Array.isArray(exportData.groups)).toBe(true);
            expect(Array.isArray(exportData.participants)).toBe(true);

            // Required properties
            expect(exportData).toHaveProperty('retrospective');
            expect(exportData).toHaveProperty('cards');
            expect(exportData).toHaveProperty('groups');
            expect(exportData).toHaveProperty('participants');
        });

        it('should handle optional facilitator notes and action items', () => {
            const dataWithOptionals: UnifiedExportData = {
                retrospective: {
                    id: 'retro456',
                    title: 'Monthly Review',
                    createdBy: 'facilitator123',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    participantCount: 5,
                    isActive: false
                },
                cards: [],
                groups: [],
                participants: [],
                facilitatorNotes: [
                    {
                        id: 'note1',
                        content: 'Team showed great improvement',
                        timestamp: new Date(),
                        retrospectiveId: 'retro456',
                        facilitatorId: 'facilitator123'
                    }
                ],
                actionItems: [
                    {
                        id: 'action1',
                        content: 'Improve documentation - Update API documentation',
                        assignedTo: 'developer1',
                        assignedToName: 'Developer One',
                        retrospectiveId: 'retro456',
                        createdBy: 'facilitator123',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                ]
            };

            const dataWithoutOptionals: UnifiedExportData = {
                retrospective: {
                    id: 'retro789',
                    title: 'Simple Retro',
                    createdBy: 'user789',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    participantCount: 3,
                    isActive: true
                },
                cards: [],
                groups: [],
                participants: []
            };

            expect(dataWithOptionals.facilitatorNotes).toHaveLength(1);
            expect(dataWithOptionals.actionItems).toHaveLength(1);
            expect(dataWithOptionals.facilitatorNotes?.[0].content).toBe('Team showed great improvement');
            expect(dataWithOptionals.actionItems?.[0].content).toContain('Improve documentation');

            expect(dataWithoutOptionals.facilitatorNotes).toBeUndefined();
            expect(dataWithoutOptionals.actionItems).toBeUndefined();
        });

        it('should handle different data combinations', () => {
            const emptyData: UnifiedExportData = {
                retrospective: {
                    id: 'empty-retro',
                    title: 'Empty Retrospective',
                    createdBy: 'user123',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    participantCount: 0,
                    isActive: false
                },
                cards: [],
                groups: [],
                participants: []
            };

            const richData: UnifiedExportData = {
                retrospective: {
                    id: 'rich-retro',
                    title: 'Rich Retrospective',
                    description: 'Comprehensive retrospective with lots of data',
                    createdBy: 'facilitator456',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    participantCount: 12,
                    isActive: false
                },
                cards: [
                    {
                        id: 'card1',
                        content: 'Sample card content',
                        column: 'helped',
                        createdBy: 'user1',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        retrospectiveId: 'rich-retro',
                        votes: 5
                    },
                    {
                        id: 'card2',
                        content: 'Another card',
                        column: 'hindered',
                        createdBy: 'user2',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        retrospectiveId: 'rich-retro',
                        votes: 3
                    }
                ],
                groups: [
                    {
                        id: 'group1',
                        retrospectiveId: 'rich-retro',
                        column: 'helped',
                        headCardId: 'card1',
                        memberCardIds: [],
                        title: 'Sample Group',
                        isCollapsed: false,
                        createdAt: new Date(),
                        createdBy: 'user1',
                        order: 0
                    }
                ],
                participants: [
                    { name: 'Participant 1', joinedAt: new Date() },
                    { name: 'Participant 2', joinedAt: new Date() }
                ],
                facilitatorNotes: [
                    {
                        id: 'note1',
                        content: 'Facilitator note 1',
                        timestamp: new Date(),
                        retrospectiveId: 'rich-retro',
                        facilitatorId: 'facilitator456'
                    }
                ],
                actionItems: [
                    {
                        id: 'action1',
                        content: 'Action item 1',
                        assignedTo: 'user1',
                        assignedToName: 'User One',
                        retrospectiveId: 'rich-retro',
                        createdBy: 'facilitator456',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                ]
            };

            expect(emptyData.cards).toHaveLength(0);
            expect(emptyData.groups).toHaveLength(0);
            expect(emptyData.participants).toHaveLength(0);

            expect(richData.cards).toHaveLength(2);
            expect(richData.groups).toHaveLength(1);
            expect(richData.participants).toHaveLength(2);
            expect(richData.facilitatorNotes).toHaveLength(1);
            expect(richData.actionItems).toHaveLength(1);
        });
    });

    describe('UseUnifiedExportState interface', () => {
        it('should have correct structure with required properties', () => {
            const state: UseUnifiedExportState = {
                isExporting: false,
                progress: 0,
                error: null,
                success: false
            };

            expect(typeof state.isExporting).toBe('boolean');
            expect(typeof state.progress).toBe('number');
            expect(state.error).toBeNull();
            expect(typeof state.success).toBe('boolean');

            // Required properties
            expect(state).toHaveProperty('isExporting');
            expect(state).toHaveProperty('progress');
            expect(state).toHaveProperty('error');
            expect(state).toHaveProperty('success');
        });

        it('should handle optional currentFormat property', () => {
            const stateWithFormat: UseUnifiedExportState = {
                isExporting: true,
                progress: 50,
                error: null,
                success: false,
                currentFormat: 'pdf'
            };

            const stateWithoutFormat: UseUnifiedExportState = {
                isExporting: false,
                progress: 100,
                error: null,
                success: true
            };

            expect(stateWithFormat.currentFormat).toBe('pdf');
            expect(stateWithoutFormat.currentFormat).toBeUndefined();
        });

        it('should handle different export states', () => {
            const idleState: UseUnifiedExportState = {
                isExporting: false,
                progress: 0,
                error: null,
                success: false
            };

            const exportingState: UseUnifiedExportState = {
                isExporting: true,
                progress: 45,
                error: null,
                success: false,
                currentFormat: 'docx'
            };

            const successState: UseUnifiedExportState = {
                isExporting: false,
                progress: 100,
                error: null,
                success: true,
                currentFormat: 'pdf'
            };

            const errorState: UseUnifiedExportState = {
                isExporting: false,
                progress: 30,
                error: 'Failed to generate PDF',
                success: false,
                currentFormat: 'pdf'
            };

            expect(idleState.isExporting).toBe(false);
            expect(idleState.progress).toBe(0);
            expect(idleState.success).toBe(false);

            expect(exportingState.isExporting).toBe(true);
            expect(exportingState.progress).toBe(45);
            expect(exportingState.currentFormat).toBe('docx');

            expect(successState.isExporting).toBe(false);
            expect(successState.progress).toBe(100);
            expect(successState.success).toBe(true);

            expect(errorState.isExporting).toBe(false);
            expect(errorState.error).toBe('Failed to generate PDF');
            expect(errorState.success).toBe(false);
        });

        it('should validate state transitions', () => {
            const validateState = (state: UseUnifiedExportState): boolean => {
                // Progress should be between 0 and 100
                if (state.progress < 0 || state.progress > 100) return false;

                // Cannot be successful and have an error
                if (state.success && state.error !== null) return false;

                // If exporting, progress should be less than 100
                if (state.isExporting && state.progress === 100) return false;

                // If successful, progress should be 100
                if (state.success && state.progress !== 100) return false;

                return true;
            };

            const validStates: UseUnifiedExportState[] = [
                { isExporting: false, progress: 0, error: null, success: false },
                { isExporting: true, progress: 50, error: null, success: false, currentFormat: 'pdf' },
                { isExporting: false, progress: 100, error: null, success: true, currentFormat: 'txt' },
                { isExporting: false, progress: 25, error: 'Network error', success: false }
            ];

            const invalidStates: UseUnifiedExportState[] = [
                { isExporting: false, progress: -10, error: null, success: false }, // negative progress
                { isExporting: false, progress: 150, error: null, success: false }, // progress > 100
                { isExporting: false, progress: 100, error: 'Some error', success: true }, // success with error
                { isExporting: true, progress: 100, error: null, success: false }, // exporting with 100% progress
                { isExporting: false, progress: 50, error: null, success: true } // success without 100% progress
            ];

            validStates.forEach(state => {
                expect(validateState(state)).toBe(true);
            });

            invalidStates.forEach(state => {
                expect(validateState(state)).toBe(false);
            });
        });
    });

    describe('Type Utilities and Operations', () => {
        it('should work with export format selection', () => {
            const getRecommendedFormat = (
                dataSize: number,
                includeImages: boolean,
                needsFormatting: boolean
            ): ExportFormat => {
                if (includeImages || needsFormatting) {
                    return dataSize > 1000000 ? 'docx' : 'pdf'; // Large data to DOCX
                }
                return 'txt'; // Simple format for basic exports
            };

            expect(getRecommendedFormat(500, false, false)).toBe('txt');
            expect(getRecommendedFormat(500, true, false)).toBe('pdf');
            expect(getRecommendedFormat(500, false, true)).toBe('pdf');
            expect(getRecommendedFormat(2000000, true, true)).toBe('docx');
        });

        it('should handle options validation', () => {
            const createDefaultOptions = (format: ExportFormat): UnifiedExportOptions => ({
                format,
                includeParticipants: true,
                includeStatistics: true,
                includeCardAuthors: format !== 'txt', // Exclude authors for simple text
                includeReactions: format === 'pdf' || format === 'docx',
                includeGroupDetails: format !== 'txt',
                includeActionItems: true,
                sortOrder: format === 'txt' ? 'original' : 'votes',
                includeFacilitatorNotes: format !== 'txt'
            });

            const pdfDefaults = createDefaultOptions('pdf');
            const txtDefaults = createDefaultOptions('txt');
            const docxDefaults = createDefaultOptions('docx');

            expect(pdfDefaults.includeCardAuthors).toBe(true);
            expect(pdfDefaults.includeReactions).toBe(true);
            expect(pdfDefaults.sortOrder).toBe('votes');

            expect(txtDefaults.includeCardAuthors).toBe(false);
            expect(txtDefaults.includeReactions).toBe(false);
            expect(txtDefaults.sortOrder).toBe('original');

            expect(docxDefaults.includeCardAuthors).toBe(true);
            expect(docxDefaults.includeReactions).toBe(true);
            expect(docxDefaults.sortOrder).toBe('votes');
        });

        it('should calculate export size estimation', () => {
            const estimateExportSize = (data: UnifiedExportData, options: UnifiedExportOptions): number => {
                let baseSize = 1000; // Base document size

                // Add size for cards
                baseSize += data.cards.length * 100;

                // Add size for participants if included
                if (options.includeParticipants) {
                    baseSize += data.participants.length * 50;
                }

                // Add size for groups if included
                if (options.includeGroupDetails) {
                    baseSize += data.groups.length * 75;
                }

                // Add size for facilitator notes if included
                if (options.includeFacilitatorNotes && data.facilitatorNotes) {
                    baseSize += data.facilitatorNotes.length * 200;
                }

                // Add size for action items if included
                if (options.includeActionItems && data.actionItems) {
                    baseSize += data.actionItems.length * 150;
                }

                // Format multiplier
                const formatMultiplier = {
                    'txt': 1,
                    'pdf': 3,
                    'docx': 2.5
                };

                return Math.round(baseSize * formatMultiplier[options.format]);
            };

            const sampleData: UnifiedExportData = {
                retrospective: {
                    id: 'test',
                    title: 'Test Retro',
                    createdBy: 'user1',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    participantCount: 5,
                    isActive: false
                },
                cards: [
                    {
                        id: 'card1',
                        content: 'Card 1',
                        column: 'helped',
                        createdBy: 'user1',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        retrospectiveId: 'test'
                    },
                    {
                        id: 'card2',
                        content: 'Card 2',
                        column: 'hindered',
                        createdBy: 'user2',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        retrospectiveId: 'test'
                    }
                ],
                groups: [
                    {
                        id: 'group1',
                        retrospectiveId: 'test',
                        column: 'helped',
                        headCardId: 'card1',
                        memberCardIds: [],
                        title: 'Group 1',
                        isCollapsed: false,
                        createdAt: new Date(),
                        createdBy: 'user1',
                        order: 0
                    }
                ],
                participants: [
                    { name: 'User 1', joinedAt: new Date() },
                    { name: 'User 2', joinedAt: new Date() },
                    { name: 'User 3', joinedAt: new Date() }
                ]
            };

            const txtOptions = createDefaultOptions('txt');
            const pdfOptions = createDefaultOptions('pdf');
            const docxOptions = createDefaultOptions('docx');

            const txtSize = estimateExportSize(sampleData, txtOptions);
            const pdfSize = estimateExportSize(sampleData, pdfOptions);
            const docxSize = estimateExportSize(sampleData, docxOptions);

            expect(txtSize).toBeLessThan(pdfSize);
            expect(txtSize).toBeLessThan(docxSize);
            expect(docxSize).toBeLessThan(pdfSize);
        });
    });

    function createDefaultOptions(format: ExportFormat): UnifiedExportOptions {
        return {
            format,
            includeParticipants: true,
            includeStatistics: true,
            includeCardAuthors: format !== 'txt',
            includeReactions: format === 'pdf' || format === 'docx',
            includeGroupDetails: format !== 'txt',
            includeActionItems: true,
            sortOrder: format === 'txt' ? 'original' : 'votes',
            includeFacilitatorNotes: format !== 'txt'
        };
    }
});
