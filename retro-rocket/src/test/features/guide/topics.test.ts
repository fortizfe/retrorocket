import { describe, it, expect } from 'vitest';
import { guideCategories, guideTopics } from '@/features/guide/content/topics';
import enLocale from '@/locales/en.json';
import esLocale from '@/locales/es.json';

/**
 * spec-kit feature 057-getting-started-guide, tasks.md T018 (Phase 4: User
 * Story 2 — TDD red step). `src/features/guide/content/topics.ts` does not
 * exist yet (T022 creates it); this file is written first, per Constitution
 * Principle I (NON-NEGOTIABLE TDD).
 *
 * Expected failure right now: `Cannot find module
 * '@/features/guide/content/topics'` (the file doesn't exist).
 *
 * ---
 *
 * CHOSEN, DOCUMENTED REGISTRY SHAPE (T022's implementation MUST match this
 * verbatim — other guide tests, e.g. useActiveGuideTopic.test.ts,
 * GuideSideNav.test.tsx, GuideTopicContent.test.tsx, hardcode these same
 * ids/keys):
 *
 * `topics.ts` exports two arrays (data-model.md's Guide Category / Guide
 * Topic entities, structural fields only — no JSX, per research.md
 * Decision 1):
 *
 *   export interface GuideCategory {
 *     id: string;
 *     labelKey: string;   // e.g. "guide.categories.gettingStarted"
 *     order: number;
 *   }
 *
 *   export interface GuideTopic {
 *     id: string;          // URL-safe slug, used verbatim as :topicSlug
 *     categoryId: string;  // references a GuideCategory.id
 *     titleKey: string;    // e.g. "guide.topics.anonymousMode.title"
 *     summaryKey: string;  // e.g. "guide.topics.anonymousMode.summary"
 *     bodyKey: string;     // e.g. "guide.topics.anonymousMode.body"
 *     externalGuideUrl?: string;
 *     order: number;
 *   }
 *
 *   export const guideCategories: GuideCategory[];
 *   export const guideTopics: GuideTopic[];
 *
 * i18n key naming convention: `guide.categories.<camelCase(categoryId)>`
 * and `guide.topics.<camelCase(topicId)>.{title,summary,body}`, where
 * camelCase() strips hyphens and capitalizes each word after the first
 * (e.g. "ai-sentiment-and-team-mood" -> "aiSentimentAndTeamMood").
 *
 * CHOSEN 9 CATEGORY IDS (data-model.md's initial-categories list, in
 * display order):
 *   1. getting-started
 *   2. boards-and-cards
 *   3. collaboration
 *   4. anonymous-mode
 *   5. facilitator-tools
 *   6. ai-sentiment-and-team-mood
 *   7. exporting
 *   8. teams
 *   9. connecting-ai-assistants
 *
 * CHOSEN 12 TOPIC SLUGS (spec.md FR-006, in FR-006's listed order) and the
 * category each belongs to. FR-006's first bullet ("Signing in and managing
 * your account/profile") is adapted from the task prompt's "sign-in/profile"
 * shorthand into the kebab-case slug `sign-in-and-profile` (a literal slash
 * cannot be one URL path segment):
 *
 *   1.  sign-in-and-profile           -> getting-started
 *   2.  board-creation-and-templates  -> boards-and-cards
 *   3.  real-time-collaboration       -> collaboration
 *   4.  cards-and-colors              -> boards-and-cards
 *   5.  likes-and-reactions           -> collaboration
 *   6.  card-grouping                 -> boards-and-cards
 *   7.  anonymous-mode                -> anonymous-mode
 *   8.  facilitator-tools             -> facilitator-tools
 *   9.  ai-sentiment-and-team-mood    -> ai-sentiment-and-team-mood
 *   10. exporting                     -> exporting
 *   11. teams-and-metrics             -> teams
 *   12. connecting-ai-assistants      -> connecting-ai-assistants
 *
 * These exact 12 slug strings are load-bearing across the other Phase 4
 * test files (T019-T021) and MUST be used verbatim by T022.
 */

const EXPECTED_TOPIC_IDS = [
    'sign-in-and-profile',
    'board-creation-and-templates',
    'real-time-collaboration',
    'cards-and-colors',
    'likes-and-reactions',
    'card-grouping',
    'anonymous-mode',
    'facilitator-tools',
    'ai-sentiment-and-team-mood',
    'exporting',
    'teams-and-metrics',
    'connecting-ai-assistants',
] as const;

describe('guide topic/category registry (spec 057 data-model.md, FR-006)', () => {
    it('defines every topic id required by FR-006 (SC-003: 12 topics at launch)', () => {
        const actualIds = guideTopics.map((topic) => topic.id);

        for (const expectedId of EXPECTED_TOPIC_IDS) {
            expect(actualIds).toContain(expectedId);
        }
        expect(actualIds).toHaveLength(EXPECTED_TOPIC_IDS.length);
    });

    it('has no duplicate topic ids (data-model.md Validation rules)', () => {
        const ids = guideTopics.map((topic) => topic.id);
        const uniqueIds = new Set(ids);

        expect(uniqueIds.size).toBe(ids.length);
    });

    it('has no duplicate category ids', () => {
        const ids = guideCategories.map((category) => category.id);
        const uniqueIds = new Set(ids);

        expect(uniqueIds.size).toBe(ids.length);
    });

    it("every topic's categoryId references a real category id (data-model.md Validation rules)", () => {
        const categoryIds = new Set(guideCategories.map((category) => category.id));

        for (const topic of guideTopics) {
            expect(categoryIds.has(topic.categoryId)).toBe(true);
        }
    });

    it('every topic has non-empty titleKey, summaryKey, and bodyKey identifiers', () => {
        for (const topic of guideTopics) {
            expect(topic.titleKey).toMatch(/^guide\.topics\./);
            expect(topic.summaryKey).toMatch(/^guide\.topics\./);
            expect(topic.bodyKey).toMatch(/^guide\.topics\./);
        }
    });

    it('every category has a non-empty labelKey under the guide.categories namespace', () => {
        for (const category of guideCategories) {
            expect(category.labelKey).toMatch(/^guide\.categories\./);
        }
    });

    it('only the "connecting-ai-assistants" topic sets externalGuideUrl (FR-010)', () => {
        const withExternalUrl = guideTopics.filter((topic) => topic.externalGuideUrl);

        expect(withExternalUrl).toHaveLength(1);
        expect(withExternalUrl[0]?.id).toBe('connecting-ai-assistants');
    });

    it('assigns a distinct, defined display order to every category and topic within its category', () => {
        const categoryOrders = guideCategories.map((category) => category.order);
        expect(new Set(categoryOrders).size).toBe(categoryOrders.length);

        for (const category of guideCategories) {
            const ordersInCategory = guideTopics
                .filter((topic) => topic.categoryId === category.id)
                .map((topic) => topic.order);
            expect(new Set(ordersInCategory).size).toBe(ordersInCategory.length);
        }
    });
});

/**
 * spec-kit feature 057-getting-started-guide, tasks.md T030 (Phase 5: User
 * Story 3 — TDD red step). Body content itself is authored later (T032 for
 * en.json, T033 for es.json); this test only pins the requirement that
 * every registry topic's `bodyKey` resolves to real, non-empty content in
 * BOTH locale resource files, per FR-006/FR-007/SC-003.
 *
 * This reads the locale JSON files' resource trees directly (dotted-path
 * lookup of `bodyKey`, e.g. "guide.topics.anonymousMode.body") rather than
 * going through `useTranslation()`/`t()`, because this repo's global
 * react-i18next test mock (src/test/setup.ts) ignores real resource
 * resolution and always echoes back the raw key string — that mock is
 * fine for component-level tests that only care that *some* string reaches
 * the DOM, but it would make this test pass unconditionally regardless of
 * whether real body content exists, which defeats its purpose.
 *
 * Expected failure right now: none of the 12 topics have a `body` key
 * under their `guide.topics.<topic>` entry in either en.json or es.json
 * yet (only `title`/`summary` were added in T023), so every topic in the
 * loop below fails the "resolves to non-empty content" assertion.
 */
function resolveKeyPath(resource: unknown, key: string): unknown {
    return key.split('.').reduce<unknown>((node, segment) => {
        if (node && typeof node === 'object' && segment in (node as Record<string, unknown>)) {
            return (node as Record<string, unknown>)[segment];
        }
        return undefined;
    }, resource);
}

function isNonEmptyBodyContent(value: unknown): boolean {
    if (typeof value === 'string') {
        return value.trim().length > 0;
    }
    if (Array.isArray(value)) {
        return (
            value.length > 0 &&
            value.every((entry) => typeof entry === 'string' && entry.trim().length > 0)
        );
    }
    return false;
}

describe('guide topic body content resolves in both locales (spec 057 FR-006, FR-007, SC-003)', () => {
    it.each(guideTopics.map((topic) => [topic.id, topic] as const))(
        'topic "%s" has non-empty bodyKey content in en.json and es.json',
        (_id, topic) => {
            const enBody = resolveKeyPath(enLocale, topic.bodyKey);
            const esBody = resolveKeyPath(esLocale, topic.bodyKey);

            expect(
                isNonEmptyBodyContent(enBody),
                `expected en.json "${topic.bodyKey}" to be a non-empty string or string[], got ${JSON.stringify(enBody)}`
            ).toBe(true);
            expect(
                isNonEmptyBodyContent(esBody),
                `expected es.json "${topic.bodyKey}" to be a non-empty string or string[], got ${JSON.stringify(esBody)}`
            ).toBe(true);
        }
    );
});
