import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import type { GuideTopic } from '@/features/guide/content/topics';

export interface GuideTopicContentProps {
    /** The already-resolved active topic. Never undefined — GuidePage only
     * mounts this component when useActiveGuideTopic() returned a match;
     * the overview state is rendered by GuidePage itself. */
    topic: GuideTopic;
}

/**
 * spec-kit feature 057-getting-started-guide, tasks.md T026 (Phase 4: User
 * Story 2). Renders a single guide topic's title/summary/body from its
 * i18next keys (data-model.md's Guide Topic entity).
 *
 * `bodyKey` resolves to an ORDERED ARRAY of plain-language paragraph/step
 * strings (research.md Decision 1: no markdown parsing, rendered as-is).
 * `t(bodyKey, { returnObjects: true })` is normalized with
 * `Array.isArray(raw) ? raw : [raw]` before being mapped into paragraphs,
 * because this repo's global react-i18next test mock ignores
 * `returnObjects` and always returns the raw key string — the component
 * must render that string rather than crash, while real i18next in
 * production resolves an actual `string[]` once Phase 5/US3 fills in body
 * content.
 *
 * tasks.md T034 (Phase 5: User Story 3, FR-010): when `topic.externalGuideUrl`
 * is set (today, only the "Connecting AI Assistants" topic), the body is
 * followed by a visible link out to that standalone dedicated guide instead
 * of duplicating its content. The link's accessible label/hint keys are
 * derived from `bodyKey` by swapping its trailing `.body` segment for
 * `.externalLinkLabel` / `.externalLinkNewTabHint` — every topic's i18n keys
 * live under the same `guide.topics.<id>.*` namespace (see topics.ts's
 * header comment), so this derivation holds for any future topic that sets
 * `externalGuideUrl`, not just this one. The link opens in a new tab
 * (`target="_blank" rel="noopener noreferrer"`) since it navigates outside
 * the SPA to a repository-hosted Markdown document, and is styled like the
 * app's other external links (`LinkifyText`).
 */
const GuideTopicContent: React.FC<GuideTopicContentProps> = ({ topic }) => {
    const { t } = useTranslation();

    const rawBody = t(topic.bodyKey, { returnObjects: true });
    const bodyParagraphs: string[] = Array.isArray(rawBody) ? rawBody : [rawBody as unknown as string];

    const externalLinkLabelKey = topic.bodyKey.replace(/\.body$/, '.externalLinkLabel');
    const externalLinkNewTabHintKey = topic.bodyKey.replace(/\.body$/, '.externalLinkNewTabHint');

    return (
        <article>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
                {t(topic.titleKey)}
            </h1>
            <p className="mt-2 text-lg text-text-secondary">{t(topic.summaryKey)}</p>

            <div data-testid="guide-topic-body" className="mt-6 space-y-4 text-text-primary">
                {bodyParagraphs.map((paragraph, index) => (
                    // Body strings are static, developer-authored i18n content
                    // (research.md Decision 1), not user input keyed by a
                    // stable id, so positional index is an acceptable React key.
                    <p key={index} className="leading-relaxed">
                        {paragraph}
                    </p>
                ))}
            </div>

            {topic.externalGuideUrl && (
                <a
                    href={topic.externalGuideUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex items-center gap-1.5 text-info-fg underline underline-offset-2 hover:no-underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-sm"
                >
                    <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span>{t(externalLinkLabelKey)}</span>
                    <span className="sr-only"> {t(externalLinkNewTabHintKey)}</span>
                </a>
            )}
        </article>
    );
};

export default GuideTopicContent;
