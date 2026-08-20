/**
 * spec-kit feature 057-getting-started-guide, tasks.md T022 (Phase 4: User
 * Story 2). Static, developer-authored registry of the guide's categories
 * and topics (data-model.md's Guide Category / Guide Topic entities).
 *
 * This module holds structural metadata only — no JSX, no copy — per
 * research.md Decision 1: actual title/summary/body prose lives in the
 * `guide` i18next namespace (`src/locales/{en,es}.json`), addressed here by
 * key reference (`titleKey`/`summaryKey`/`bodyKey`).
 *
 * i18n key naming convention (pinned by src/test/features/guide/topics.test.ts):
 *   - `guide.categories.<camelCase(categoryId)>`
 *   - `guide.topics.<camelCase(topicId)>.{title,summary,body}`
 * where camelCase() strips hyphens and capitalizes each word after the
 * first, e.g. "ai-sentiment-and-team-mood" -> "aiSentimentAndTeamMood".
 *
 * The 9 category ids and 12 topic ids (with their category assignment) are
 * load-bearing across other Phase 4 test files (useActiveGuideTopic.test.ts,
 * GuideSideNav.test.tsx, GuideTopicContent.test.tsx) — do not rename or
 * reassign without updating those tests' expectations too.
 */

export interface GuideCategory {
    /** Stable slug, used as a React key and as GuideTopic.categoryId's target. */
    id: string;
    /** i18next key resolving to the category's display label. */
    labelKey: string;
    /** Explicit display order in the side menu. */
    order: number;
}

export interface GuideTopic {
    /** URL-safe slug, used verbatim as the :topicSlug route param. Unique. */
    id: string;
    /** References a GuideCategory.id. */
    categoryId: string;
    /** i18next key resolving to the topic's display title. */
    titleKey: string;
    /** i18next key resolving to a one-line summary. */
    summaryKey: string;
    /** i18next key resolving to an ordered array of paragraph/step strings. */
    bodyKey: string;
    /**
     * When set, the topic content ends with a link to a standalone dedicated
     * guide instead of duplicating it (FR-010). Only "connecting-ai-assistants"
     * sets this, pointing at docs/mcp-guia-usuario.md's published location.
     */
    externalGuideUrl?: string;
    /** Explicit display order within its category. */
    order: number;
}

export const guideCategories: GuideCategory[] = [
    { id: 'getting-started', labelKey: 'guide.categories.gettingStarted', order: 1 },
    { id: 'boards-and-cards', labelKey: 'guide.categories.boardsAndCards', order: 2 },
    { id: 'collaboration', labelKey: 'guide.categories.collaboration', order: 3 },
    { id: 'anonymous-mode', labelKey: 'guide.categories.anonymousMode', order: 4 },
    { id: 'facilitator-tools', labelKey: 'guide.categories.facilitatorTools', order: 5 },
    { id: 'ai-sentiment-and-team-mood', labelKey: 'guide.categories.aiSentimentAndTeamMood', order: 6 },
    { id: 'exporting', labelKey: 'guide.categories.exporting', order: 7 },
    { id: 'teams', labelKey: 'guide.categories.teams', order: 8 },
    { id: 'connecting-ai-assistants', labelKey: 'guide.categories.connectingAiAssistants', order: 9 },
];

export const guideTopics: GuideTopic[] = [
    {
        id: 'sign-in-and-profile',
        categoryId: 'getting-started',
        titleKey: 'guide.topics.signInAndProfile.title',
        summaryKey: 'guide.topics.signInAndProfile.summary',
        bodyKey: 'guide.topics.signInAndProfile.body',
        order: 1,
    },
    {
        id: 'board-creation-and-templates',
        categoryId: 'boards-and-cards',
        titleKey: 'guide.topics.boardCreationAndTemplates.title',
        summaryKey: 'guide.topics.boardCreationAndTemplates.summary',
        bodyKey: 'guide.topics.boardCreationAndTemplates.body',
        order: 1,
    },
    {
        id: 'real-time-collaboration',
        categoryId: 'collaboration',
        titleKey: 'guide.topics.realTimeCollaboration.title',
        summaryKey: 'guide.topics.realTimeCollaboration.summary',
        bodyKey: 'guide.topics.realTimeCollaboration.body',
        order: 1,
    },
    {
        id: 'cards-and-colors',
        categoryId: 'boards-and-cards',
        titleKey: 'guide.topics.cardsAndColors.title',
        summaryKey: 'guide.topics.cardsAndColors.summary',
        bodyKey: 'guide.topics.cardsAndColors.body',
        order: 2,
    },
    {
        id: 'likes-and-reactions',
        categoryId: 'collaboration',
        titleKey: 'guide.topics.likesAndReactions.title',
        summaryKey: 'guide.topics.likesAndReactions.summary',
        bodyKey: 'guide.topics.likesAndReactions.body',
        order: 2,
    },
    {
        id: 'card-grouping',
        categoryId: 'boards-and-cards',
        titleKey: 'guide.topics.cardGrouping.title',
        summaryKey: 'guide.topics.cardGrouping.summary',
        bodyKey: 'guide.topics.cardGrouping.body',
        order: 3,
    },
    {
        id: 'anonymous-mode',
        categoryId: 'anonymous-mode',
        titleKey: 'guide.topics.anonymousMode.title',
        summaryKey: 'guide.topics.anonymousMode.summary',
        bodyKey: 'guide.topics.anonymousMode.body',
        order: 1,
    },
    {
        id: 'facilitator-tools',
        categoryId: 'facilitator-tools',
        titleKey: 'guide.topics.facilitatorTools.title',
        summaryKey: 'guide.topics.facilitatorTools.summary',
        bodyKey: 'guide.topics.facilitatorTools.body',
        order: 1,
    },
    {
        id: 'ai-sentiment-and-team-mood',
        categoryId: 'ai-sentiment-and-team-mood',
        titleKey: 'guide.topics.aiSentimentAndTeamMood.title',
        summaryKey: 'guide.topics.aiSentimentAndTeamMood.summary',
        bodyKey: 'guide.topics.aiSentimentAndTeamMood.body',
        order: 1,
    },
    {
        id: 'exporting',
        categoryId: 'exporting',
        titleKey: 'guide.topics.exporting.title',
        summaryKey: 'guide.topics.exporting.summary',
        bodyKey: 'guide.topics.exporting.body',
        order: 1,
    },
    {
        id: 'teams-and-metrics',
        categoryId: 'teams',
        titleKey: 'guide.topics.teamsAndMetrics.title',
        summaryKey: 'guide.topics.teamsAndMetrics.summary',
        bodyKey: 'guide.topics.teamsAndMetrics.body',
        order: 1,
    },
    {
        id: 'connecting-ai-assistants',
        categoryId: 'connecting-ai-assistants',
        titleKey: 'guide.topics.connectingAiAssistants.title',
        summaryKey: 'guide.topics.connectingAiAssistants.summary',
        bodyKey: 'guide.topics.connectingAiAssistants.body',
        externalGuideUrl: 'docs/mcp-guia-usuario.md',
        order: 1,
    },
];
