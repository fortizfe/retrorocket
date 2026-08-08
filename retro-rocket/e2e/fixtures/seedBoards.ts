import { APIRequestContext, Page } from '@playwright/test';

/**
 * Creates `count` boards for the currently-authenticated user (assumes
 * signInWithGoogle/signInAs already ran) via direct POST /api/boards calls —
 * no UI interaction, mirroring the pattern already used in
 * dashboard-list.spec.ts/auth-helpers.ts's createBoardViaApi. Seeding 200+
 * boards for reachability/performance verification (spec 031 FR-012,
 * SC-001) stays fast this way. Batched with limited concurrency so the
 * shared dev-server/emulator worker (playwright.config.ts) isn't flooded.
 */
export async function seedBoards(
    requester: APIRequestContext | Page,
    count: number,
    options: {
        titlePrefix?: string;
        templateId?: 'default' | 'madSadGlad' | 'startStopContinue';
        locale?: 'es' | 'en';
        concurrency?: number;
    } = {}
): Promise<string[]> {
    const { titlePrefix = 'Seed Board', templateId = 'default', locale = 'es', concurrency = 20 } = options;
    const request = 'request' in requester ? requester.request : requester;
    const boardIds: string[] = new Array(count);

    for (let batchStart = 0; batchStart < count; batchStart += concurrency) {
        const batchEnd = Math.min(batchStart + concurrency, count);
        const batch = await Promise.all(
            Array.from({ length: batchEnd - batchStart }, async (_unused, offset) => {
                const index = batchStart + offset;
                const res = await request.post('/api/boards', {
                    data: { templateId, title: boardTitleAt(index, titlePrefix), locale },
                });
                if (!res.ok()) {
                    throw new Error(`seedBoards: failed to create board ${index}: ${res.status()} ${await res.text()}`);
                }
                const body = (await res.json()) as { boardId: string };
                return body.boardId;
            })
        );
        batch.forEach((id, offset) => {
            boardIds[batchStart + offset] = id;
        });
    }

    return boardIds;
}

/**
 * Deterministic title for the board at `index`, so a specific seeded board
 * (e.g. the last one — deep past any single page/viewport) can be targeted
 * by title in a reachability assertion without tracking every returned ID.
 */
export function boardTitleAt(index: number, titlePrefix = 'Seed Board'): string {
    return `${titlePrefix} ${String(index).padStart(4, '0')}`;
}
