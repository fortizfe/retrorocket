import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import GuideTopicContent from '@/features/guide/components/GuideTopicContent';
import type { GuideTopic } from '@/features/guide/content/topics';

/**
 * spec-kit feature 057-getting-started-guide, tasks.md T021 (Phase 4: User
 * Story 2 — TDD red step). `src/features/guide/components/
 * GuideTopicContent.tsx` does not exist yet (T026 creates it); this file is
 * written first, per Constitution Principle I (NON-NEGOTIABLE TDD).
 *
 * Per this task's own scope note: real per-topic body prose isn't written
 * until Phase 5 (User Story 3, T032/T033) — this test only verifies the
 * component reads and renders whatever i18n key strings a given topic
 * object specifies, using a placeholder `GuideTopic` fixture rather than a
 * real registry entry. `GuideTopic` the *type* is imported from
 * `src/features/guide/content/topics.ts` (T022) for type-checking the
 * fixture; the registry's runtime exports (`guideCategories`/
 * `guideTopics`) are not used here.
 *
 * Expected failure right now: `Cannot find module
 * '@/features/guide/components/GuideTopicContent'` (and, once that's
 * created, a second failure for the still-missing `topics.ts` type import
 * until T022 lands — both resolve together since T022 is a prerequisite
 * task ordered before T026 in tasks.md).
 *
 * ---
 *
 * CHOSEN, DOCUMENTED PROPS + RENDERING CONTRACT (T026's implementation
 * MUST match this):
 *
 *   interface GuideTopicContentProps {
 *     topic: GuideTopic; // the already-resolved active topic (never
 *                        // undefined — GuidePage.tsx only mounts this
 *                        // component when useActiveGuideTopic() returned a
 *                        // match; the overview state is rendered by
 *                        // GuidePage itself, not this component)
 *   }
 *
 * Rendering:
 *   - `t(topic.titleKey)` rendered as a heading (role="heading").
 *   - `t(topic.summaryKey)` rendered as visible text.
 *   - Body content is read via `t(topic.bodyKey, { returnObjects: true })`
 *     (data-model.md: bodyKey resolves to an ORDERED ARRAY of
 *     paragraph/step strings) and normalized with
 *     `Array.isArray(raw) ? raw : [raw]` before being mapped into
 *     paragraphs inside a container tagged `data-testid="guide-topic-body"`
 *     — the normalization matters because this repo's global
 *     react-i18next mock (src/test/setup.ts) ignores the `returnObjects`
 *     option and always returns the raw key string, so under test `raw` is
 *     a single string, not a real array; the component must not crash on
 *     that and must still render the key text somewhere inside the body
 *     container. (In production with real i18next, bodyKey resolves to an
 *     actual string[] once Phase 5/US3 fills in real array content.)
 */

const baseTopic: GuideTopic = {
    id: 'anonymous-mode',
    categoryId: 'anonymous-mode',
    titleKey: 'guide.topics.anonymousMode.title',
    summaryKey: 'guide.topics.anonymousMode.summary',
    bodyKey: 'guide.topics.anonymousMode.body',
    order: 7,
};

describe('GuideTopicContent (spec 057 data-model.md Guide Topic, FR-004)', () => {
    it("renders the topic's title from titleKey as a heading", () => {
        render(<GuideTopicContent topic={baseTopic} />);

        expect(screen.getByRole('heading', { name: baseTopic.titleKey })).toBeInTheDocument();
    });

    it("renders the topic's summary from summaryKey", () => {
        render(<GuideTopicContent topic={baseTopic} />);

        expect(screen.getByText(baseTopic.summaryKey)).toBeInTheDocument();
    });

    it("renders the topic's body from bodyKey inside a guide-topic-body container", () => {
        render(<GuideTopicContent topic={baseTopic} />);

        const body = screen.getByTestId('guide-topic-body');
        expect(within(body).getByText(baseTopic.bodyKey)).toBeInTheDocument();
    });

    it('re-renders with the new topic\'s content when the topic prop changes', () => {
        const { rerender } = render(<GuideTopicContent topic={baseTopic} />);
        expect(screen.getByRole('heading', { name: baseTopic.titleKey })).toBeInTheDocument();

        const otherTopic: GuideTopic = {
            id: 'exporting',
            categoryId: 'exporting',
            titleKey: 'guide.topics.exporting.title',
            summaryKey: 'guide.topics.exporting.summary',
            bodyKey: 'guide.topics.exporting.body',
            order: 1,
        };
        rerender(<GuideTopicContent topic={otherTopic} />);

        expect(screen.queryByRole('heading', { name: baseTopic.titleKey })).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: otherTopic.titleKey })).toBeInTheDocument();
    });
});

/**
 * spec-kit feature 057-getting-started-guide, tasks.md T031 (Phase 5: User
 * Story 3 — TDD red step). FR-010: where a feature already has its own
 * standalone dedicated guide (the MCP AI-assistant connector), the
 * corresponding topic must link out to it instead of duplicating its
 * content. The registry doesn't set `externalGuideUrl` on the real
 * "connecting-ai-assistants" entry until T034, so this test passes the
 * field directly on a fixture `GuideTopic` object (the component's actual
 * contract is `{ topic: GuideTopic }`, per this file's documented props
 * contract above) rather than depending on registry state that doesn't
 * exist yet.
 *
 * Expected failure right now: `GuideTopicContent.tsx` (as of T026) only
 * renders `title`/`summary`/`body` and has no branch that reads
 * `topic.externalGuideUrl` at all, so no link element is rendered and
 * `getByRole('link', ...)` throws.
 */
describe('GuideTopicContent external guide link (spec 057 FR-010)', () => {
    const connectingAiAssistantsTopic: GuideTopic = {
        id: 'connecting-ai-assistants',
        categoryId: 'connecting-ai-assistants',
        titleKey: 'guide.topics.connectingAiAssistants.title',
        summaryKey: 'guide.topics.connectingAiAssistants.summary',
        bodyKey: 'guide.topics.connectingAiAssistants.body',
        externalGuideUrl: 'docs/mcp-guia-usuario.md',
        order: 1,
    };

    it('renders a visible link to externalGuideUrl when the topic sets it', () => {
        render(<GuideTopicContent topic={connectingAiAssistantsTopic} />);

        const link = screen.getByRole('link');
        expect(link).toBeVisible();
        expect(link).toHaveAttribute('href', connectingAiAssistantsTopic.externalGuideUrl);
    });

    it('renders no link when the topic has no externalGuideUrl', () => {
        render(<GuideTopicContent topic={baseTopic} />);

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
});
