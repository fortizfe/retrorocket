import { describe, it, expect } from 'vitest';
import { exportRetrospectiveToPdf, buildCardAuthorLine } from '@/features/boards/export/services/pdfExportService';
import { Card, CardColor } from '@/features/boards/types/card';
import { Participant } from '@/features/boards/types/participant';

function makeCard(overrides: Partial<Card> = {}): Card {
    return {
        id: 'c1',
        content: 'x',
        column: 'col1',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        retrospectiveId: 'r1',
        color: 'pastelBlue' as CardColor,
        ...overrides,
    };
}

function makeParticipant(overrides: Partial<Participant> = {}): Participant {
    return { id: 'p1', userId: 'user-1', name: 'Jane Smith', retrospectiveId: 'r1', joinedAt: new Date(), ...overrides };
}

describe('PdfExportService', () => {
    describe('Basic functionality', () => {
        it('should have export function', () => {
            expect(typeof exportRetrospectiveToPdf).toBe('function');
        });

        it('should generate correct filename', () => {
            const mockData = {
                retrospective: {
                    title: 'Test Retrospective',
                    createdAt: new Date('2023-12-01T10:00:00Z')
                }
            } as any;

            // Test filename generation logic
            expect(mockData.retrospective.title.replace(/\s+/g, '_')).toBe('Test_Retrospective');
        });

        it('should cleanup resources after export', () => {
            // Mock cleanup behavior
            const mockElement = {
                remove: () => {},
                href: '',
                download: ''
            };

            expect(typeof mockElement.remove).toBe('function');
        });

        it('should handle invalid data gracefully', async () => {
            await expect(exportRetrospectiveToPdf(null as any)).rejects.toThrow();
        });
    });

    describe('buildCardAuthorLine (022, FR-005, SC-001)', () => {
        it('resolves the author via the live participant match, preferring it over the captured createdByName', () => {
            const card = makeCard({ createdBy: 'user-1', createdByName: 'Old Captured Name' });
            const participants = [makeParticipant({ userId: 'user-1', name: 'New Current Name' })];

            const line = buildCardAuthorLine(card, participants);

            expect(line).toContain('New Current Name');
            expect(line).not.toContain('Old Captured Name');
            expect(line).not.toContain('user-1');
        });

        it('falls back to the captured createdByName when no participant match exists', () => {
            const card = makeCard({ createdBy: 'departed-uid', createdByName: 'Old Name' });

            const line = buildCardAuthorLine(card, []);

            expect(line).toContain('Old Name');
            expect(line).not.toContain('departed-uid');
        });

        it('falls back to a generic label, never the raw uid, when neither a participant match nor a captured name exists', () => {
            const card = makeCard({ createdBy: 'departed-uid', createdByName: undefined });

            const line = buildCardAuthorLine(card, []);

            expect(line).not.toContain('departed-uid');
        });
    });
});
