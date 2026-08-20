import { useParams } from 'react-router-dom';
import { guideTopics, type GuideTopic } from '@/features/guide/content/topics';

/**
 * spec-kit feature 057-getting-started-guide, tasks.md T024 (Phase 4: User
 * Story 2), per research.md Decision 2: the active guide topic is resolved
 * from the `:topicSlug` route param (not client-only state) so each topic
 * remains deep-linkable.
 *
 * Returns the matching `GuideTopic` when `:topicSlug` names a known topic
 * id, and `undefined` — the "no active topic" / overview sentinel — both
 * when there is no `:topicSlug` param at all (bare `/guide`) and when the
 * param doesn't match any registered topic id (spec.md Edge Case: an old or
 * mistyped deep link falls back to the guide's overview instead of a broken
 * page). `GuidePage.tsx` renders the overview whenever this returns
 * `undefined`.
 */
export function useActiveGuideTopic(): GuideTopic | undefined {
    const { topicSlug } = useParams<{ topicSlug: string }>();

    if (!topicSlug) {
        return undefined;
    }

    return guideTopics.find((topic) => topic.id === topicSlug);
}
