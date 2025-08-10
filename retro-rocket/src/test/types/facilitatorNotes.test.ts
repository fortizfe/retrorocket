import { describe, it, expect } from 'vitest';
import {
    FacilitatorNote,
    FacilitatorNotesState
} from '../../types/facilitatorNotes';

describe('FacilitatorNotes Types', () => {
    describe('FacilitatorNote interface', () => {
        it('should have correct structure with required properties', () => {
            const note: FacilitatorNote = {
                id: 'note123',
                content: 'This is a facilitator note about the retrospective',
                timestamp: new Date('2024-01-15T10:30:00Z'),
                retrospectiveId: 'retro456',
                facilitatorId: 'facilitator789'
            };

            expect(typeof note.id).toBe('string');
            expect(typeof note.content).toBe('string');
            expect(note.timestamp).toBeInstanceOf(Date);
            expect(typeof note.retrospectiveId).toBe('string');
            expect(typeof note.facilitatorId).toBe('string');

            // Required properties
            expect(note).toHaveProperty('id');
            expect(note).toHaveProperty('content');
            expect(note).toHaveProperty('timestamp');
            expect(note).toHaveProperty('retrospectiveId');
            expect(note).toHaveProperty('facilitatorId');
        });

        it('should handle different note content types', () => {
            const shortNote: FacilitatorNote = {
                id: 'short1',
                content: 'Quick note',
                timestamp: new Date(),
                retrospectiveId: 'retro1',
                facilitatorId: 'facilitator1'
            };

            const longNote: FacilitatorNote = {
                id: 'long1',
                content: 'This is a much longer facilitator note that contains detailed observations about the team dynamics, participation levels, and specific insights gathered during the retrospective session. It includes recommendations for future improvements and notes about follow-up actions.',
                timestamp: new Date(),
                retrospectiveId: 'retro2',
                facilitatorId: 'facilitator2'
            };

            const structuredNote: FacilitatorNote = {
                id: 'structured1',
                content: `# Team Dynamics
- High engagement from all members
- Good balance in participation

# Key Insights
- Communication has improved significantly
- Technical debt remains a concern

# Action Items for Next Sprint
- Schedule architecture review
- Implement code quality checks`,
                timestamp: new Date(),
                retrospectiveId: 'retro3',
                facilitatorId: 'facilitator3'
            };

            expect(shortNote.content.length).toBeLessThan(50);
            expect(longNote.content.length).toBeGreaterThan(200);
            expect(structuredNote.content).toContain('#');
            expect(structuredNote.content).toContain('-');
        });

        it('should handle different timestamp scenarios', () => {
            const pastNote: FacilitatorNote = {
                id: 'past1',
                content: 'Note from last month',
                timestamp: new Date('2024-01-01T10:00:00Z'),
                retrospectiveId: 'retro-past',
                facilitatorId: 'facilitator-past'
            };

            const recentNote: FacilitatorNote = {
                id: 'recent1',
                content: 'Recent note',
                timestamp: new Date(),
                retrospectiveId: 'retro-recent',
                facilitatorId: 'facilitator-recent'
            };

            const futureNote: FacilitatorNote = {
                id: 'future-note-id',
                content: 'Note from the future',
                timestamp: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
                facilitatorId: 'facilitator-id',
                retrospectiveId: 'retrospective-id'
            };

            expect(pastNote.timestamp.getTime()).toBeLessThan(Date.now());
            expect(recentNote.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
            expect(futureNote.timestamp.getTime()).toBeGreaterThan(Date.now());
        });

        it('should handle notes from different facilitators', () => {
            const notes: FacilitatorNote[] = [
                {
                    id: 'note1',
                    content: 'First facilitator observation',
                    timestamp: new Date(),
                    retrospectiveId: 'retro1',
                    facilitatorId: 'facilitator-alice'
                },
                {
                    id: 'note2',
                    content: 'Second facilitator observation',
                    timestamp: new Date(),
                    retrospectiveId: 'retro1',
                    facilitatorId: 'facilitator-bob'
                },
                {
                    id: 'note3',
                    content: 'Third facilitator observation',
                    timestamp: new Date(),
                    retrospectiveId: 'retro1',
                    facilitatorId: 'facilitator-alice'
                }
            ];

            const facilitatorGroups = notes.reduce((acc, note) => {
                if (!acc[note.facilitatorId]) {
                    acc[note.facilitatorId] = [];
                }
                acc[note.facilitatorId].push(note);
                return acc;
            }, {} as Record<string, FacilitatorNote[]>);

            expect(Object.keys(facilitatorGroups)).toHaveLength(2);
            expect(facilitatorGroups['facilitator-alice']).toHaveLength(2);
            expect(facilitatorGroups['facilitator-bob']).toHaveLength(1);
        });

        it('should handle notes across different retrospectives', () => {
            const crossRetroNotes: FacilitatorNote[] = [
                {
                    id: 'cross1',
                    content: 'Note for first retrospective',
                    timestamp: new Date('2024-01-01'),
                    retrospectiveId: 'retro-sprint-1',
                    facilitatorId: 'facilitator-main'
                },
                {
                    id: 'cross2',
                    content: 'Note for second retrospective',
                    timestamp: new Date('2024-01-15'),
                    retrospectiveId: 'retro-sprint-2',
                    facilitatorId: 'facilitator-main'
                },
                {
                    id: 'cross3',
                    content: 'Follow-up note for first retrospective',
                    timestamp: new Date('2024-01-08'),
                    retrospectiveId: 'retro-sprint-1',
                    facilitatorId: 'facilitator-main'
                }
            ];

            const retroGroups = crossRetroNotes.reduce((acc, note) => {
                if (!acc[note.retrospectiveId]) {
                    acc[note.retrospectiveId] = [];
                }
                acc[note.retrospectiveId].push(note);
                return acc;
            }, {} as Record<string, FacilitatorNote[]>);

            expect(Object.keys(retroGroups)).toHaveLength(2);
            expect(retroGroups['retro-sprint-1']).toHaveLength(2);
            expect(retroGroups['retro-sprint-2']).toHaveLength(1);

            // Sort notes within each retrospective by timestamp
            Object.values(retroGroups).forEach(notes => {
                notes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            });

            expect(retroGroups['retro-sprint-1'][0].id).toBe('cross1');
            expect(retroGroups['retro-sprint-1'][1].id).toBe('cross3');
        });

        it('should handle note validation scenarios', () => {
            const validateNote = (note: FacilitatorNote): boolean => {
                // Content should not be empty
                if (!note.content || note.content.trim().length === 0) return false;

                // IDs should be non-empty strings
                if (!note.id || !note.retrospectiveId || !note.facilitatorId) return false;

                // Timestamp should be a valid date
                if (!note.timestamp || isNaN(note.timestamp.getTime())) return false;

                return true;
            };

            const validNote: FacilitatorNote = {
                id: 'valid1',
                content: 'Valid note content',
                timestamp: new Date(),
                retrospectiveId: 'valid-retro',
                facilitatorId: 'valid-facilitator'
            };

            const invalidNotes: Partial<FacilitatorNote>[] = [
                { // Missing content
                    id: 'invalid1',
                    timestamp: new Date(),
                    retrospectiveId: 'retro1',
                    facilitatorId: 'facilitator1'
                },
                { // Empty content
                    id: 'invalid2',
                    content: '   ',
                    timestamp: new Date(),
                    retrospectiveId: 'retro2',
                    facilitatorId: 'facilitator2'
                },
                { // Missing IDs
                    content: 'Some content',
                    timestamp: new Date()
                }
            ];

            expect(validateNote(validNote)).toBe(true);

            // Note: We can't validate invalid notes directly due to TypeScript type checking
            // but this demonstrates the validation logic
        });
    });

    describe('FacilitatorNotesState interface', () => {
        it('should have correct structure with required properties', () => {
            const state: FacilitatorNotesState = {
                notes: [],
                loading: false,
                error: null
            };

            expect(Array.isArray(state.notes)).toBe(true);
            expect(typeof state.loading).toBe('boolean');
            expect(state.error).toBeNull();

            // Required properties
            expect(state).toHaveProperty('notes');
            expect(state).toHaveProperty('loading');
            expect(state).toHaveProperty('error');
        });

        it('should handle loading state', () => {
            const loadingState: FacilitatorNotesState = {
                notes: [],
                loading: true,
                error: null
            };

            expect(loadingState.loading).toBe(true);
            expect(loadingState.notes).toHaveLength(0);
            expect(loadingState.error).toBeNull();
        });

        it('should handle loaded state with notes', () => {
            const notes: FacilitatorNote[] = [
                {
                    id: 'note1',
                    content: 'First note',
                    timestamp: new Date('2024-01-01'),
                    retrospectiveId: 'retro1',
                    facilitatorId: 'facilitator1'
                },
                {
                    id: 'note2',
                    content: 'Second note',
                    timestamp: new Date('2024-01-02'),
                    retrospectiveId: 'retro1',
                    facilitatorId: 'facilitator1'
                }
            ];

            const loadedState: FacilitatorNotesState = {
                notes,
                loading: false,
                error: null
            };

            expect(loadedState.loading).toBe(false);
            expect(loadedState.notes).toHaveLength(2);
            expect(loadedState.error).toBeNull();
            expect(loadedState.notes[0].content).toBe('First note');
            expect(loadedState.notes[1].content).toBe('Second note');
        });

        it('should handle error state', () => {
            const errorState: FacilitatorNotesState = {
                notes: [],
                loading: false,
                error: 'Failed to load facilitator notes'
            };

            expect(errorState.loading).toBe(false);
            expect(errorState.notes).toHaveLength(0);
            expect(errorState.error).toBe('Failed to load facilitator notes');
        });

        it('should handle different error types', () => {
            const networkErrorState: FacilitatorNotesState = {
                notes: [],
                loading: false,
                error: 'Network connection failed'
            };

            const authErrorState: FacilitatorNotesState = {
                notes: [],
                loading: false,
                error: 'Authentication required'
            };

            const permissionErrorState: FacilitatorNotesState = {
                notes: [],
                loading: false,
                error: 'Insufficient permissions'
            };

            expect(networkErrorState.error).toContain('Network');
            expect(authErrorState.error).toContain('Authentication');
            expect(permissionErrorState.error).toContain('permissions');
        });

        it('should handle state transitions', () => {
            // Initial state
            let state: FacilitatorNotesState = {
                notes: [],
                loading: false,
                error: null
            };

            // Start loading
            state = {
                ...state,
                loading: true,
                error: null
            };
            expect(state.loading).toBe(true);
            expect(state.error).toBeNull();

            // Load success
            const newNotes: FacilitatorNote[] = [
                {
                    id: 'note1',
                    content: 'Loaded note',
                    timestamp: new Date(),
                    retrospectiveId: 'retro1',
                    facilitatorId: 'facilitator1'
                }
            ];

            state = {
                notes: newNotes,
                loading: false,
                error: null
            };
            expect(state.loading).toBe(false);
            expect(state.notes).toHaveLength(1);
            expect(state.error).toBeNull();

            // Load error
            state = {
                notes: [],
                loading: false,
                error: 'Load failed'
            };
            expect(state.loading).toBe(false);
            expect(state.notes).toHaveLength(0);
            expect(state.error).toBe('Load failed');
        });
    });

    describe('Type Utilities and Operations', () => {
        it('should work with note sorting operations', () => {
            const notes: FacilitatorNote[] = [
                {
                    id: 'note3',
                    content: 'Third note (chronologically)',
                    timestamp: new Date('2024-01-03T10:00:00Z'),
                    retrospectiveId: 'retro1',
                    facilitatorId: 'facilitator1'
                },
                {
                    id: 'note1',
                    content: 'First note (chronologically)',
                    timestamp: new Date('2024-01-01T10:00:00Z'),
                    retrospectiveId: 'retro1',
                    facilitatorId: 'facilitator1'
                },
                {
                    id: 'note2',
                    content: 'Second note (chronologically)',
                    timestamp: new Date('2024-01-02T10:00:00Z'),
                    retrospectiveId: 'retro1',
                    facilitatorId: 'facilitator1'
                }
            ];

            // Sort by timestamp (oldest first)
            const sortedOldest = [...notes].sort((a, b) =>
                a.timestamp.getTime() - b.timestamp.getTime()
            );

            // Sort by timestamp (newest first)
            const sortedNewest = [...notes].sort((a, b) =>
                b.timestamp.getTime() - a.timestamp.getTime()
            );

            // Sort by content length
            const sortedByLength = [...notes].sort((a, b) =>
                a.content.length - b.content.length
            );

            expect(sortedOldest.map(n => n.id)).toEqual(['note1', 'note2', 'note3']);
            expect(sortedNewest.map(n => n.id)).toEqual(['note3', 'note2', 'note1']);
            expect(sortedByLength[0].content.length).toBeLessThanOrEqual(sortedByLength[1].content.length);
        });

        it('should work with note filtering operations', () => {
            const notes: FacilitatorNote[] = [
                {
                    id: 'note1',
                    content: 'URGENT: Critical issue found',
                    timestamp: new Date('2024-01-01'),
                    retrospectiveId: 'retro1',
                    facilitatorId: 'facilitator1'
                },
                {
                    id: 'note2',
                    content: 'Regular observation about team dynamics',
                    timestamp: new Date('2024-01-02'),
                    retrospectiveId: 'retro1',
                    facilitatorId: 'facilitator2'
                },
                {
                    id: 'note3',
                    content: 'URGENT: Another critical point',
                    timestamp: new Date('2024-01-03'),
                    retrospectiveId: 'retro2',
                    facilitatorId: 'facilitator1'
                },
                {
                    id: 'note4',
                    content: 'Follow-up on previous action items',
                    timestamp: new Date('2024-01-04'),
                    retrospectiveId: 'retro2',
                    facilitatorId: 'facilitator2'
                }
            ];

            // Filter urgent notes
            const urgentNotes = notes.filter(note =>
                note.content.toUpperCase().includes('URGENT')
            );

            // Filter by facilitator
            const facilitator1Notes = notes.filter(note =>
                note.facilitatorId === 'facilitator1'
            );

            // Filter by retrospective
            const retro1Notes = notes.filter(note =>
                note.retrospectiveId === 'retro1'
            );

            // Filter by date range
            const recentNotes = notes.filter(note =>
                note.timestamp.getTime() >= new Date('2024-01-02').getTime()
            );

            expect(urgentNotes).toHaveLength(2);
            expect(urgentNotes.every(n => n.content.includes('URGENT'))).toBe(true);

            expect(facilitator1Notes).toHaveLength(2);
            expect(facilitator1Notes.every(n => n.facilitatorId === 'facilitator1')).toBe(true);

            expect(retro1Notes).toHaveLength(2);
            expect(retro1Notes.every(n => n.retrospectiveId === 'retro1')).toBe(true);

            expect(recentNotes).toHaveLength(3);
        });

        it('should work with note aggregation operations', () => {
            const notes: FacilitatorNote[] = [
                {
                    id: 'note1',
                    content: 'Short note',
                    timestamp: new Date('2024-01-01'),
                    retrospectiveId: 'retro1',
                    facilitatorId: 'facilitator1'
                },
                {
                    id: 'note2',
                    content: 'This is a much longer note with more detailed content',
                    timestamp: new Date('2024-01-02'),
                    retrospectiveId: 'retro1',
                    facilitatorId: 'facilitator1'
                },
                {
                    id: 'note3',
                    content: 'Medium length note',
                    timestamp: new Date('2024-01-03'),
                    retrospectiveId: 'retro2',
                    facilitatorId: 'facilitator2'
                }
            ];

            // Calculate statistics
            const stats = {
                totalNotes: notes.length,
                totalCharacters: notes.reduce((sum, note) => sum + note.content.length, 0),
                averageLength: notes.reduce((sum, note) => sum + note.content.length, 0) / notes.length,
                uniqueFacilitators: new Set(notes.map(n => n.facilitatorId)).size,
                uniqueRetrospectives: new Set(notes.map(n => n.retrospectiveId)).size,
                dateRange: {
                    earliest: new Date(Math.min(...notes.map(n => n.timestamp.getTime()))),
                    latest: new Date(Math.max(...notes.map(n => n.timestamp.getTime())))
                }
            };

            expect(stats.totalNotes).toBe(3);
            expect(stats.totalCharacters).toBeGreaterThan(50);
            expect(stats.averageLength).toBeGreaterThan(15);
            expect(stats.uniqueFacilitators).toBe(2);
            expect(stats.uniqueRetrospectives).toBe(2);
            expect(stats.dateRange.earliest.getTime()).toBeLessThan(stats.dateRange.latest.getTime());
        });

        it('should handle note state management operations', () => {
            const createInitialState = (): FacilitatorNotesState => ({
                notes: [],
                loading: false,
                error: null
            });

            const startLoading = (state: FacilitatorNotesState): FacilitatorNotesState => ({
                ...state,
                loading: true,
                error: null
            });

            const loadSuccess = (state: FacilitatorNotesState, notes: FacilitatorNote[]): FacilitatorNotesState => ({
                ...state,
                notes,
                loading: false,
                error: null
            });

            const loadError = (state: FacilitatorNotesState, error: string): FacilitatorNotesState => ({
                ...state,
                notes: [],
                loading: false,
                error
            });

            const addNote = (state: FacilitatorNotesState, note: FacilitatorNote): FacilitatorNotesState => ({
                ...state,
                notes: [...state.notes, note],
                error: null
            });

            const removeNote = (state: FacilitatorNotesState, noteId: string): FacilitatorNotesState => ({
                ...state,
                notes: state.notes.filter(n => n.id !== noteId)
            });

            // Test state transitions
            let state = createInitialState();
            expect(state.loading).toBe(false);
            expect(state.notes).toHaveLength(0);

            state = startLoading(state);
            expect(state.loading).toBe(true);

            const testNotes: FacilitatorNote[] = [
                {
                    id: 'test1',
                    content: 'Test note',
                    timestamp: new Date(),
                    retrospectiveId: 'retro1',
                    facilitatorId: 'facilitator1'
                }
            ];

            state = loadSuccess(state, testNotes);
            expect(state.loading).toBe(false);
            expect(state.notes).toHaveLength(1);
            expect(state.error).toBeNull();

            const newNote: FacilitatorNote = {
                id: 'test2',
                content: 'Another note',
                timestamp: new Date(),
                retrospectiveId: 'retro1',
                facilitatorId: 'facilitator1'
            };

            state = addNote(state, newNote);
            expect(state.notes).toHaveLength(2);

            state = removeNote(state, 'test1');
            expect(state.notes).toHaveLength(1);
            expect(state.notes[0].id).toBe('test2');

            state = loadError(state, 'Connection failed');
            expect(state.loading).toBe(false);
            expect(state.error).toBe('Connection failed');
        });
    });
});
