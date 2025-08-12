import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { createBoardFromTemplate } from '../../features/boards/createBoardFromTemplate';
import { BOARD_TEMPLATES } from '../../templates/boardTemplates';

// Mock Firebase
vi.mock('../../services/firebase', () => ({
    db: {},
    FIRESTORE_COLLECTIONS: {
        RETROSPECTIVES: 'retrospectives'
    }
}));

// Mock Firebase Firestore functions
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    addDoc: vi.fn(),
    doc: vi.fn(),
    setDoc: vi.fn(),
    serverTimestamp: vi.fn(() => ({ type: 'timestamp' }))
}));

const mockAddDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockCollection = vi.fn();
const mockDoc = vi.fn();

beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    const { addDoc, setDoc, collection, doc } = require('firebase/firestore');
    (addDoc as Mock).mockImplementation(mockAddDoc);
    (setDoc as Mock).mockImplementation(mockSetDoc);
    (collection as Mock).mockImplementation(mockCollection);
    (doc as Mock).mockImplementation(mockDoc);
});

describe('createBoardFromTemplate', () => {
    const validParams = {
        templateId: 'default' as const,
        title: 'Test Retrospective',
        createdBy: 'user123',
        createdByName: 'John Doe',
        locale: 'en' as const
    };

    describe('Successful creation', () => {
        beforeEach(() => {
            mockAddDoc.mockResolvedValue({ id: 'retro123' });
            mockSetDoc.mockResolvedValue(undefined);
            mockCollection.mockReturnValue('mockCollection');
            mockDoc.mockReturnValue('mockDocRef');
        });

        it('should create board with default template', async () => {
            const result = await createBoardFromTemplate(validParams);

            expect(result.boardId).toBe('retro123');
            expect(mockAddDoc).toHaveBeenCalledWith(
                'mockCollection',
                expect.objectContaining({
                    title: 'Test Retrospective',
                    templateId: 'default',
                    createdBy: 'user123',
                    createdByName: 'John Doe',
                    locale: 'en',
                    isActive: true,
                    participantCount: 0
                })
            );
        });

        it('should create board with madSadGlad template', async () => {
            const params = { ...validParams, templateId: 'madSadGlad' as const };
            const result = await createBoardFromTemplate(params);

            expect(result.boardId).toBe('retro123');
            expect(mockAddDoc).toHaveBeenCalledWith(
                'mockCollection',
                expect.objectContaining({
                    templateId: 'madSadGlad'
                })
            );
        });

        it('should create board with startStopContinue template', async () => {
            const params = { ...validParams, templateId: 'startStopContinue' as const };
            const result = await createBoardFromTemplate(params);

            expect(result.boardId).toBe('retro123');
            expect(mockAddDoc).toHaveBeenCalledWith(
                'mockCollection',
                expect.objectContaining({
                    templateId: 'startStopContinue'
                })
            );
        });

        it('should create all columns including action column', async () => {
            await createBoardFromTemplate(validParams);

            // Should create 4 columns (3 regular + 1 action) for default template
            expect(mockSetDoc).toHaveBeenCalledTimes(4);
        });

        it('should create columns with correct order', async () => {
            await createBoardFromTemplate(validParams);

            // Check that setDoc was called with correct order values
            const setDocCalls = mockSetDoc.mock.calls;
            expect(setDocCalls[0][1]).toMatchObject({ order: 0 });
            expect(setDocCalls[1][1]).toMatchObject({ order: 1 });
            expect(setDocCalls[2][1]).toMatchObject({ order: 2 });
            expect(setDocCalls[3][1]).toMatchObject({ order: 3, type: 'action' });
        });

        it('should trim title whitespace', async () => {
            const params = { ...validParams, title: '  Test Retrospective  ' };
            await createBoardFromTemplate(params);

            expect(mockAddDoc).toHaveBeenCalledWith(
                'mockCollection',
                expect.objectContaining({
                    title: 'Test Retrospective'
                })
            );
        });
    });

    describe('Error handling', () => {
        it('should throw error for invalid template ID', async () => {
            const params = { ...validParams, templateId: 'invalid' as any };

            await expect(createBoardFromTemplate(params))
                .rejects
                .toThrow('Invalid template ID: invalid');
        });

        it('should throw error when Firebase fails', async () => {
            mockAddDoc.mockRejectedValue(new Error('Firebase error'));

            await expect(createBoardFromTemplate(validParams))
                .rejects
                .toThrow('Firebase error');
        });

        it('should throw error when column creation fails', async () => {
            mockAddDoc.mockResolvedValue({ id: 'retro123' });
            mockSetDoc.mockRejectedValue(new Error('Column creation failed'));

            await expect(createBoardFromTemplate(validParams))
                .rejects
                .toThrow('Column creation failed');
        });
    });

    describe('Template validation', () => {
        it('should accept all valid template IDs', () => {
            const templateIds = Object.keys(BOARD_TEMPLATES);
            expect(templateIds).toContain('default');
            expect(templateIds).toContain('madSadGlad');
            expect(templateIds).toContain('startStopContinue');
        });
    });
});
