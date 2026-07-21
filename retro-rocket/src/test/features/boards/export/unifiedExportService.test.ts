import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnifiedExportService, exportRetrospective } from '@/features/boards/export/services/unifiedExportService';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockExportToPdf = vi.fn().mockResolvedValue(undefined);
const mockExportToTxt = vi.fn().mockResolvedValue(undefined);
const mockExportToDocx = vi.fn().mockResolvedValue(undefined);

vi.mock('@/features/boards/export/services/pdfExportService', () => ({
    exportRetrospectiveToPdf: (...args: any[]) => mockExportToPdf(...args),
}));

vi.mock('@/features/boards/export/services/txtExportService', () => ({
    exportRetrospectiveToTxt: (...args: any[]) => mockExportToTxt(...args),
}));

vi.mock('@/features/boards/export/services/docxExportService', () => ({
    exportRetrospectiveToDocx: (...args: any[]) => mockExportToDocx(...args),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockRetrospective = {
    id: 'retro-1',
    title: 'Sprint 10',
    template: 'start-stop-continue',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: 'user-1',
    isActive: true,
    participantCount: 3,
} as any;

const makeCard = (id: string, content: string, order: number, likes: string[] = []) => ({
    id,
    content,
    order,
    likes: likes.map(uid => ({ userId: uid, username: uid, timestamp: new Date() })),
    reactions: [],
    column: 'start',
    createdBy: 'user-1',
    retrospectiveId: 'retro-1',
} as any);

const mockCards = [
    makeCard('c1', 'Zebra item', 2, ['u1', 'u2', 'u3']),
    makeCard('c2', 'Alpha item', 0, ['u1']),
    makeCard('c3', 'Middle item', 1, ['u1', 'u2']),
];

const baseData = {
    retrospective: mockRetrospective,
    cards: mockCards,
    groups: [],
    participants: [],
};

const baseOptions = {
    format: 'pdf' as const,
    includeParticipants: true,
    includeStatistics: true,
    includeCardAuthors: true,
    includeReactions: true,
    includeGroupDetails: false,
    includeActionItems: false,
    sortOrder: 'original' as const,
    includeFacilitatorNotes: false,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UnifiedExportService.exportRetrospective', () => {
    let service: UnifiedExportService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new UnifiedExportService();
    });

    it('delegates pdf format to exportRetrospectiveToPdf', async () => {
        await service.exportRetrospective(baseData, { ...baseOptions, format: 'pdf' });
        expect(mockExportToPdf).toHaveBeenCalledTimes(1);
        expect(mockExportToTxt).not.toHaveBeenCalled();
        expect(mockExportToDocx).not.toHaveBeenCalled();
    });

    it('delegates txt format to exportRetrospectiveToTxt', async () => {
        await service.exportRetrospective(baseData, { ...baseOptions, format: 'txt' });
        expect(mockExportToTxt).toHaveBeenCalledTimes(1);
        expect(mockExportToPdf).not.toHaveBeenCalled();
        expect(mockExportToDocx).not.toHaveBeenCalled();
    });

    it('delegates docx format to exportRetrospectiveToDocx', async () => {
        await service.exportRetrospective(baseData, { ...baseOptions, format: 'docx' });
        expect(mockExportToDocx).toHaveBeenCalledTimes(1);
        expect(mockExportToPdf).not.toHaveBeenCalled();
        expect(mockExportToTxt).not.toHaveBeenCalled();
    });

    it('throws when retrospective is missing', async () => {
        const badData = { ...baseData, retrospective: null as any };
        await expect(service.exportRetrospective(badData, baseOptions)).rejects.toThrow(
            'Retrospective data is required for export'
        );
    });

    it('throws for unknown format', async () => {
        const opts = { ...baseOptions, format: 'xlsx' as any };
        await expect(service.exportRetrospective(baseData, opts)).rejects.toThrow(
            'Unsupported export format: xlsx'
        );
    });

    it('passes customTitle to the underlying exporter', async () => {
        await service.exportRetrospective(baseData, { ...baseOptions, format: 'pdf', customTitle: 'Custom Title' });
        const [calledData] = mockExportToPdf.mock.calls[0];
        expect(calledData.retrospective.title).toBe('Custom Title');
    });

    it('uses original retrospective title when customTitle is not set', async () => {
        await service.exportRetrospective(baseData, baseOptions);
        const [calledData] = mockExportToPdf.mock.calls[0];
        expect(calledData.retrospective.title).toBe('Sprint 10');
    });

    describe('sortOrder', () => {
        it('original — preserves order by card.order field', async () => {
            await service.exportRetrospective(baseData, { ...baseOptions, sortOrder: 'original' });
            const [calledData] = mockExportToPdf.mock.calls[0];
            expect(calledData.cards.map((c: any) => c.id)).toEqual(['c2', 'c3', 'c1']);
        });

        it('alphabetical — sorts cards by content ascending', async () => {
            await service.exportRetrospective(baseData, { ...baseOptions, sortOrder: 'alphabetical' });
            const [calledData] = mockExportToPdf.mock.calls[0];
            expect(calledData.cards.map((c: any) => c.id)).toEqual(['c2', 'c3', 'c1']);
        });

        it('votes — sorts cards by likes count descending', async () => {
            await service.exportRetrospective(baseData, { ...baseOptions, sortOrder: 'votes' });
            const [calledData] = mockExportToPdf.mock.calls[0];
            expect(calledData.cards[0].id).toBe('c1'); // 3 likes
            expect(calledData.cards[1].id).toBe('c3'); // 2 likes
            expect(calledData.cards[2].id).toBe('c2'); // 1 like
        });

        it('likes — same behaviour as votes', async () => {
            await service.exportRetrospective(baseData, { ...baseOptions, sortOrder: 'likes' });
            const [calledData] = mockExportToPdf.mock.calls[0];
            expect(calledData.cards[0].id).toBe('c1');
        });
    });

    describe('includeCardAuthors=false', () => {
        it('clears createdBy on all cards', async () => {
            await service.exportRetrospective(baseData, { ...baseOptions, includeCardAuthors: false });
            const [calledData] = mockExportToPdf.mock.calls[0];
            calledData.cards.forEach((card: any) => {
                expect(card.createdBy).toBe('');
            });
        });

        it('does not clear createdBy when includeCardAuthors=true', async () => {
            await service.exportRetrospective(baseData, { ...baseOptions, includeCardAuthors: true });
            const [calledData] = mockExportToPdf.mock.calls[0];
            calledData.cards.forEach((card: any) => {
                expect(card.createdBy).toBe('user-1');
            });
        });
    });

    describe('includeReactions=false', () => {
        it('empties reactions and likes on all cards', async () => {
            await service.exportRetrospective(baseData, { ...baseOptions, includeReactions: false });
            const [calledData] = mockExportToPdf.mock.calls[0];
            calledData.cards.forEach((card: any) => {
                expect(card.reactions).toEqual([]);
                expect(card.likes).toEqual([]);
            });
        });
    });
});

describe('UnifiedExportService.getAvailableFormats', () => {
    it('returns pdf, txt, and docx formats', () => {
        const formats = UnifiedExportService.getAvailableFormats();
        const values = formats.map(f => f.value);
        expect(values).toContain('pdf');
        expect(values).toContain('txt');
        expect(values).toContain('docx');
        expect(formats).toHaveLength(3);
    });

    it('each format has label and description', () => {
        UnifiedExportService.getAvailableFormats().forEach(fmt => {
            expect(fmt.label).toBeTruthy();
            expect(fmt.description).toBeTruthy();
        });
    });
});

describe('UnifiedExportService.getSortOrders', () => {
    it('returns original, alphabetical, votes, and likes', () => {
        const orders = UnifiedExportService.getSortOrders();
        const values = orders.map(o => o.value);
        expect(values).toContain('original');
        expect(values).toContain('alphabetical');
        expect(values).toContain('votes');
        expect(values).toContain('likes');
        expect(orders).toHaveLength(4);
    });
});

describe('exportRetrospective (top-level function)', () => {
    beforeEach(() => vi.clearAllMocks());

    it('delegates to UnifiedExportService instance', async () => {
        await exportRetrospective(baseData, { ...baseOptions, format: 'txt' });
        expect(mockExportToTxt).toHaveBeenCalledTimes(1);
    });
});
