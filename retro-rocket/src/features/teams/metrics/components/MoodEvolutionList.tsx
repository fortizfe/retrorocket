import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Minus, HelpCircle, type LucideIcon } from 'lucide-react';
import type { RetrospectiveMoodPoint } from '../types/teamMetrics';

/**
 * Mood evolution list (spec 056, User Story 3 — "Team owner/member observes mood
 * trend over time", T031). Plain list, one row per `moodEvolution` entry, rendered
 * in the array order the backend already provides (data-model.md: pre-sorted
 * ascending by `createdAt` — this component does not re-sort). research.md item 6
 * explicitly ruled out adding a charting library for this feature, so trend is
 * conveyed textually/iconically instead of graphically.
 *
 * Rows reuse `ActivitySummary`/`ActionItemsSummary`'s stat-card visual language
 * (`rounded-lg border border-border-default bg-surface`) so this list reads as the
 * same design system rather than inventing new chrome (apple-design's Familiarity
 * principle — consistent patterns let people predict what they're looking at).
 *
 * Two states per row:
 * - A numeric `moodScore` renders as a plain number.
 * - `moodScore: null` (FR-009: no confident sentiment result for that retrospective)
 *   renders an explicit "no data" badge — an icon PLUS a text label, never a color
 *   cue alone (WCAG 2.1 AA / constitution Principle VIII).
 *
 * A lightweight per-row trend indicator compares each scored point to the closest
 * *earlier scored* point, skipping over "no data" points so they neither inherit a
 * stale trend nor break the comparison chain. Every trend badge pairs its icon with
 * a text label too — color is never the only signal.
 */
export interface MoodEvolutionListProps {
    moodEvolution: RetrospectiveMoodPoint[];
}

type Trend = 'improving' | 'declining' | 'stable';

/** One entry per `moodEvolution` index: the trend versus the closest earlier
 * *scored* point, or `null` when there is no earlier scored point to compare
 * against (the first scored entry, or any "no data" entry). */
function computeTrends(points: RetrospectiveMoodPoint[]): Array<Trend | null> {
    const trends: Array<Trend | null> = [];
    let previousScore: number | null = null;

    for (const point of points) {
        if (point.moodScore === null) {
            // "No data" points are skipped entirely — they don't get a trend of
            // their own, and they don't reset the comparison baseline for the
            // next scored point.
            trends.push(null);
            continue;
        }

        if (previousScore === null) {
            trends.push(null);
        } else if (point.moodScore > previousScore) {
            trends.push('improving');
        } else if (point.moodScore < previousScore) {
            trends.push('declining');
        } else {
            trends.push('stable');
        }

        previousScore = point.moodScore;
    }

    return trends;
}

const TREND_ICON: Record<Trend, LucideIcon> = {
    improving: TrendingUp,
    declining: TrendingDown,
    stable: Minus,
};

const TREND_BADGE_CLASS: Record<Trend, string> = {
    improving: 'bg-success-bg text-success-fg',
    declining: 'bg-warning-bg text-warning-fg',
    stable: 'border border-border-default bg-surface text-text-muted',
};

const MoodEvolutionList: React.FC<MoodEvolutionListProps> = ({ moodEvolution }) => {
    const { t } = useTranslation();

    if (moodEvolution.length === 0) {
        return null;
    }

    const trends = computeTrends(moodEvolution);

    return (
        <div className="mt-3">
            <h3 className="mb-2 text-xs font-medium text-text-secondary">
                {t('teams.metrics.mood.sectionLabel')}
            </h3>
            <ul className="flex flex-col gap-2">
                {moodEvolution.map((point, index) => {
                    const trend = trends[index];
                    const TrendIcon = trend ? TREND_ICON[trend] : null;

                    return (
                        <li
                            key={point.retrospectiveId}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border-default bg-surface p-3"
                        >
                            <span className="truncate text-sm text-text-primary">{point.retrospectiveTitle}</span>

                            <span className="flex shrink-0 items-center gap-2">
                                {trend && TrendIcon && (
                                    <span
                                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TREND_BADGE_CLASS[trend]}`}
                                    >
                                        <TrendIcon className="h-3 w-3" aria-hidden="true" />
                                        {t(`teams.metrics.mood.trend.${trend}`)}
                                    </span>
                                )}

                                {point.moodScore === null ? (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-border-default px-2 py-0.5 text-xs font-medium text-text-muted">
                                        <HelpCircle className="h-3 w-3" aria-hidden="true" />
                                        {t('teams.metrics.mood.no data')}
                                    </span>
                                ) : (
                                    <span className="text-sm font-semibold tabular-nums text-text-primary">
                                        {point.moodScore}
                                    </span>
                                )}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default MoodEvolutionList;
