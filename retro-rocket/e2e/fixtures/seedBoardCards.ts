import { APIRequestContext, Browser, BrowserContext, Page } from '@playwright/test';
import { signInAs } from './auth-helpers';

const RETROSPECTIVES = '/api/retrospectives';

/**
 * Populates an existing board with `count` cards in the given column via direct
 * POST /api/retrospectives/:id/cards calls — no UI interaction, mirroring the
 * pattern already established in `seedBoards.ts`. Used both to build a realistic,
 * densely-populated board for the visual-direction review (`tasks.md` T008,
 * `contracts/visual-direction-review-contract.md`) and for the SC-001/SC-007
 * scale verification (`tasks.md` T030). Batched with limited concurrency so the
 * shared dev-server/emulator worker (`playwright.config.ts`) isn't flooded.
 */
export async function seedBoardCards(
    requester: APIRequestContext | Page,
    retrospectiveId: string,
    count: number,
    options: { column?: string; contentPrefix?: string; concurrency?: number } = {}
): Promise<string[]> {
    const { column = 'helped', contentPrefix = 'Seed card', concurrency = 20 } = options;
    const request = 'request' in requester ? requester.request : requester;
    const cardIds: string[] = new Array(count);

    for (let batchStart = 0; batchStart < count; batchStart += concurrency) {
        const batchEnd = Math.min(batchStart + concurrency, count);
        const batch = await Promise.all(
            Array.from({ length: batchEnd - batchStart }, async (_unused, offset) => {
                const index = batchStart + offset;
                const res = await request.post(`${RETROSPECTIVES}/${encodeURIComponent(retrospectiveId)}/cards`, {
                    data: { content: `${contentPrefix} ${String(index).padStart(4, '0')}`, column },
                });
                if (!res.ok()) {
                    throw new Error(`seedBoardCards: failed to create card ${index}: ${res.status()} ${await res.text()}`);
                }
                const body = (await res.json()) as { id: string };
                return body.id;
            })
        );
        batch.forEach((id, offset) => {
            cardIds[batchStart + offset] = id;
        });
    }

    return cardIds;
}

/** Groups consecutive pairs from `cardIds` into real card groups (FR-005). */
export async function seedBoardGroups(
    requester: APIRequestContext | Page,
    retrospectiveId: string,
    cardIds: string[],
    groupCount: number
): Promise<string[]> {
    const request = 'request' in requester ? requester.request : requester;
    const groupIds: string[] = [];
    for (let i = 0; i < groupCount && i * 2 + 1 < cardIds.length; i++) {
        const headCardId = cardIds[i * 2];
        const memberCardIds = [cardIds[i * 2], cardIds[i * 2 + 1]];
        const res = await request.post(`${RETROSPECTIVES}/${encodeURIComponent(retrospectiveId)}/groups`, {
            data: { headCardId, memberCardIds },
        });
        if (!res.ok()) {
            throw new Error(`seedBoardGroups: failed to create group ${i}: ${res.status()} ${await res.text()}`);
        }
        const body = (await res.json()) as { id: string };
        groupIds.push(body.id);
    }
    return groupIds;
}

/** Creates `count` action items directly (not via card conversion) (FR-007). */
export async function seedActionItems(
    requester: APIRequestContext | Page,
    retrospectiveId: string,
    count: number
): Promise<void> {
    const request = 'request' in requester ? requester.request : requester;
    for (let i = 0; i < count; i++) {
        const res = await request.post(`${RETROSPECTIVES}/${encodeURIComponent(retrospectiveId)}/action-items`, {
            data: { content: `Seed action item ${String(i).padStart(2, '0')}` },
        });
        if (!res.ok()) {
            throw new Error(`seedActionItems: failed to create action item ${i}: ${res.status()} ${await res.text()}`);
        }
    }
}

/** Creates `count` private facilitator notes for the caller (FR-009). */
export async function seedFacilitatorNotes(
    requester: APIRequestContext | Page,
    retrospectiveId: string,
    count: number
): Promise<void> {
    const request = 'request' in requester ? requester.request : requester;
    for (let i = 0; i < count; i++) {
        const res = await request.post(`${RETROSPECTIVES}/${encodeURIComponent(retrospectiveId)}/notes`, {
            data: { content: `Seed facilitator note ${String(i).padStart(2, '0')}` },
        });
        if (!res.ok()) {
            throw new Error(`seedFacilitatorNotes: failed to create note ${i}: ${res.status()} ${await res.text()}`);
        }
    }
}

export interface SeededParticipant {
    context: BrowserContext;
    page: Page;
    displayName: string;
}

/**
 * Signs in `count` genuinely distinct identities (each its own isolated
 * `BrowserContext`, per the pattern established in
 * `concurrent-board-session.spec.ts`) and joins each to `retrospectiveId`, for
 * simulating up to the validated 15-concurrent-participant scale (SC-007).
 * Callers are responsible for closing every returned `context` when done.
 */
export async function seedParticipants(
    browser: Browser,
    retrospectiveId: string,
    count: number,
    options: { emailPrefix?: string; displayNamePrefix?: string } = {}
): Promise<SeededParticipant[]> {
    const { emailPrefix = 'e2e-seed-participant', displayNamePrefix = 'Seed Participant' } = options;

    const sessions = await Promise.all(
        Array.from({ length: count }, async (_unused, i) => {
            const context = await browser.newContext();
            const page = await context.newPage();
            const displayName = `${displayNamePrefix} ${i}`;
            await signInAs(page, `${emailPrefix}-${i}@example.com`, displayName);
            const joinRes = await page.request.post(`${RETROSPECTIVES}/${encodeURIComponent(retrospectiveId)}/join`);
            if (!joinRes.ok()) {
                throw new Error(`seedParticipants: failed to join as ${displayName}: ${joinRes.status()} ${await joinRes.text()}`);
            }
            return { context, page, displayName };
        })
    );

    return sessions;
}

/** Closes every context returned by `seedParticipants`. */
export async function closeParticipants(sessions: SeededParticipant[]): Promise<void> {
    await Promise.all(sessions.map((s) => s.context.close()));
}
