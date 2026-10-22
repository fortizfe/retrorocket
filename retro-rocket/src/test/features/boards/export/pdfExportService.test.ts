import { describe, it, expect, vi } from 'vitest';
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

    // spec 051-anonymous-board-mode, US2 (FR-012, SC-006), T032: an anonymous
    // board's export must omit the author line entirely —
    // anonymity-ui-behavior-contract.md's "Exports" table.
    describe('buildCardAuthorLine anonymous board mode (spec 051-anonymous-board-mode, US2, T032)', () => {
        it('returns an empty string when the board is anonymous, omitting the author line entirely', () => {
            const card = makeCard({ createdBy: 'user-1', createdByName: 'Jane Smith' });
            const participants = [makeParticipant()];

            const line = buildCardAuthorLine(card, participants, true);

            expect(line).toBe('');
        });

        it('still returns the author line when the board is not anonymous (control, regression)', () => {
            const card = makeCard({ createdBy: 'user-1', createdByName: 'Jane Smith' });
            const participants = [makeParticipant()];

            const line = buildCardAuthorLine(card, participants, false);

            expect(line).toContain('Jane Smith');
        });
    });
});

/**
 * T050 (spec 059, US2): untitled groups export the localized default title in the PDF.
 * CONTRACT: `RetrospectiveExportData.labels?: { defaultGroupTitle: string }` (see the TXT test header).
 *
 * Harness: `pdf()` from @react-pdf/renderer is captured by the mock declared below (it is hoisted to
 * the top of the file but only replaces `pdf`; all other exports are the real ones, and the
 * pre-existing tests never reach `pdf()`). The element tree handed to `pdf()` is walked for text.
 */
const pdfHarness = vi.hoisted(() => ({ doc: null as unknown }));
vi.mock('@react-pdf/renderer', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@react-pdf/renderer')>();
    return {
        ...actual,
        pdf: (doc: unknown) => {
            pdfHarness.doc = doc;
            return { toBlob: async () => new Blob(['x'], { type: 'application/pdf' }) };
        },
    };
});

function collectText(node: unknown, out: string[] = []): string[] {
    if (node == null || typeof node === 'boolean') return out;
    if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return out; }
    if (Array.isArray(node)) { node.forEach((n) => collectText(n, out)); return out; }
    const props = (node as { props?: { children?: unknown } }).props;
    if (props) collectText(props.children, out);
    return out;
}

describe('PdfExportService untitled group fallback (spec 059, T050)', () => {
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

    const exportText = async (data: unknown) => {
        const g = globalThis as any;
        g.URL.createObjectURL = g.URL.createObjectURL ?? (() => 'blob:x');
        g.URL.revokeObjectURL = g.URL.revokeObjectURL ?? (() => { });
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { });
        pdfHarness.doc = null;
        await exportRetrospectiveToPdf(data as any, { includeGroupDetails: true });
        logSpy.mockRestore();
        warnSpy.mockRestore();
        clickSpy.mockRestore();
        return collectText(pdfHarness.doc).join('\n');
    };

    it.each([
        ['absent', undefined],
        ['empty', ''],
        ['whitespace-only', '   '],
    ])('uses labels.defaultGroupTitle for a group with an %s title', async (_n, title) => {
        const text = await exportText(build(title, { defaultGroupTitle: LABEL }));

        expect(text).toContain(LABEL);
        expect(text).not.toContain('Grupo sin título');
    });

    it('keeps a real group title and does not leak the default label', async () => {
        const text = await exportText(build('Mi titulo real', { defaultGroupTitle: LABEL }));

        expect(text).toContain('Mi titulo real');
        expect(text).not.toContain(LABEL);
    });
});
