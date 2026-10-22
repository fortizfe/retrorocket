import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
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

    // spec 051-anonymous-board-mode, US2 (FR-012, SC-006), T032: an anonymous
    // board's export must omit the "Autor: ..." metadata line entirely —
    // anonymity-ui-behavior-contract.md's "Exports" table.
    describe('Anonymous board mode (spec 051-anonymous-board-mode, US2, T032)', () => {
        it('omits the "Autor:" line when the board is anonymous', () => {
            const service = new DocxExportService();
            const card = makeCard({ createdBy: 'user-1', createdByName: 'Jane Smith' });
            const participants = [makeParticipant()];

            const metadata: string[] = (service as any).buildCardMetadata(card, participants, true);

            expect(metadata.join(' ')).not.toContain('Autor:');
            expect(metadata.join(' ')).not.toContain('Jane Smith');
        });

        it('still includes the "Autor:" line when the board is not anonymous (control, regression)', () => {
            const service = new DocxExportService();
            const card = makeCard({ createdBy: 'user-1', createdByName: 'Jane Smith' });
            const participants = [makeParticipant()];

            const metadata: string[] = (service as any).buildCardMetadata(card, participants, false);

            expect(metadata).toContain('Autor: Jane Smith');
        });
    });
});

/**
 * T050 (spec 059, US2): untitled groups export the localized default title in the DOCX.
 * CONTRACT: `RetrospectiveDocxData.labels?: { defaultGroupTitle: string }` (see the TXT test header).
 *
 * Harness: `file-saver` is mocked (hoisted; the pre-existing tests never call saveAs), the produced
 * .docx Blob is unzipped with JSZip and `word/document.xml` is searched for the group heading text.
 */
vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

describe('DocxExportService untitled group fallback (spec 059, T050)', () => {
    const LABEL = 'Unnamed bucket';
    const t0 = new Date('2024-01-01');
    const build = (title: string | undefined, labels?: { defaultGroupTitle: string }) => ({
        retrospective: { id: 'r1', title: 'R', description: 'd', createdAt: t0, updatedAt: t0, createdBy: 'u1', participantCount: 1, isActive: true },
        cards: [
            makeCard({ id: 'c1', column: 'helped', groupId: 'g1', content: 'Head' }),
            makeCard({ id: 'c2', column: 'helped', groupId: 'g1', content: 'Member' }),
        ],
        groups: [{ id: 'g1', retrospectiveId: 'r1', column: 'helped', title, headCardId: 'c1', memberCardIds: ['c2'], isCollapsed: false, createdAt: t0, createdBy: 'u1', order: 1 }],
        participants: [],
        ...(labels ? { labels } : {}),
    }) as any;

    const exportXml = async (data: unknown) => {
        vi.mocked(saveAs).mockClear();
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        await new DocxExportService().exportRetrospective(data as any, { includeGroupDetails: true });
        logSpy.mockRestore();
        warnSpy.mockRestore();
        const blob = vi.mocked(saveAs).mock.calls[0][0] as Blob;
        const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(blob);
        });
        const zip = await JSZip.loadAsync(buffer);
        return zip.file('word/document.xml')!.async('string');
    };

    it.each([
        ['absent', undefined],
        ['empty', ''],
        ['whitespace-only', '   '],
    ])('uses labels.defaultGroupTitle for a group with an %s title', async (_n, title) => {
        const xml = await exportXml(build(title, { defaultGroupTitle: LABEL }));

        expect(xml).toContain(LABEL);
        expect(xml).not.toContain('Grupo de ');
    });

    it('keeps a real group title and does not leak the default label', async () => {
        const xml = await exportXml(build('Mi titulo real', { defaultGroupTitle: LABEL }));

        expect(xml).toContain('Mi titulo real');
        expect(xml).not.toContain(LABEL);
    });
});
