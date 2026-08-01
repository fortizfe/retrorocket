import { describe, it, expect } from 'vitest';
import { DocxExportService } from '@/features/boards/export/services/docxExportService';
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

describe('DocxExportService', () => {
    describe('Basic functionality', () => {
        it('should create an instance', () => {
            const service = new DocxExportService();
            expect(service).toBeDefined();
            expect(service).toBeInstanceOf(DocxExportService);
        });

        it('should have required methods', () => {
            const service = new DocxExportService();
            expect(typeof service.exportRetrospective).toBe('function');
        });

        it('should throw error for invalid data', async () => {
            const service = new DocxExportService();
            await expect(service.exportRetrospective(null as any)).rejects.toThrow();
        });
    });

    describe('buildCardMetadata author line (022, FR-005, SC-001)', () => {
        it('resolves the author via the live participant match, preferring it over the captured createdByName', () => {
            const service = new DocxExportService();
            const card = makeCard({ createdBy: 'user-1', createdByName: 'Old Captured Name' });
            const participants = [makeParticipant({ userId: 'user-1', name: 'New Current Name' })];

            const metadata: string[] = (service as any).buildCardMetadata(card, participants);

            expect(metadata).toContain('Autor: New Current Name');
            expect(metadata.join(' ')).not.toContain('Old Captured Name');
            expect(metadata.join(' ')).not.toContain('user-1');
        });

        it('falls back to the captured createdByName when no participant match exists', () => {
            const service = new DocxExportService();
            const card = makeCard({ createdBy: 'departed-uid', createdByName: 'Old Name' });

            const metadata: string[] = (service as any).buildCardMetadata(card, []);

            expect(metadata).toContain('Autor: Old Name');
        });

        it('falls back to a generic label, never the raw uid, when neither a participant match nor a captured name exists', () => {
            const service = new DocxExportService();
            const card = makeCard({ createdBy: 'departed-uid', createdByName: undefined });

            const metadata: string[] = (service as any).buildCardMetadata(card, []);

            expect(metadata.join(' ')).not.toContain('departed-uid');
        });
    });
});
