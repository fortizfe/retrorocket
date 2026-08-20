import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import Button from '@/lib/components/ui/Button';
import { useTeamMetricsQuery } from '../hooks/useTeamMetricsQuery';
import ActivitySummary from './ActivitySummary';
import ActionItemsSummary from './ActionItemsSummary';
import MoodEvolutionList from './MoodEvolutionList';

/**
 * Team retrospective metrics panel (spec 056, User Story 1, T014). Container component
 * that fetches via `useTeamMetricsQuery` (T013) and renders one of three states, mirroring
 * `TeamDetail.tsx`'s existing loading/error markup exactly (same `role="status"` spinner
 * with an `aria-label`, same `role="alert"` error card with a `common.retry` button) so
 * this panel reads as the same design language as the page hosting it rather than a new
 * one — per apple-design's Familiarity principle, consistent patterns let people predict
 * what a state means without re-learning it.
 *
 * The panel's own heading is an `<h2>`, nested one level below `TeamDetail.tsx`'s page
 * `<h1>` (the team name).
 *
 * Success renders `ActivitySummary` (retrospective count + average participants),
 * `ActionItemsSummary` (action items created), and `MoodEvolutionList` (US3, T031 —
 * one row per `moodEvolution` entry, in the order the backend already sorts them).
 */
export interface TeamMetricsPanelProps {
    teamId: string;
}

const TeamMetricsPanel: React.FC<TeamMetricsPanelProps> = ({ teamId }) => {
    const { t } = useTranslation();
    const { metrics, loading, error, refetch } = useTeamMetricsQuery(teamId);

    return (
        <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="mb-6 rounded-xl border border-border-default bg-surface-raised p-4"
        >
            <h2 className="mb-3 text-sm font-medium text-text-primary">{t('teams.metrics.panel.title')}</h2>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div
                        role="status"
                        aria-label={t('common.loading')}
                        className="h-8 w-8 animate-spin rounded-full border-4 border-info-fg border-t-transparent"
                    />
                </div>
            ) : error || !metrics ? (
                <div role="alert" className="rounded-lg border border-error-fg/30 bg-error-bg px-4 py-8 text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-raised">
                        <AlertTriangle className="h-5 w-5 text-error-fg" aria-hidden="true" />
                    </div>
                    <p className="text-sm text-error-fg">{t('teams.metrics.panel.loadError')}</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={refetch}>
                        {t('common.retry')}
                    </Button>
                </div>
            ) : (
                <>
                    <ActivitySummary
                        retrospectiveCount={metrics.retrospectiveCount}
                        averageParticipants={metrics.averageParticipants}
                    />
                    <ActionItemsSummary actionItemsCreated={metrics.actionItemsCreated} />
                    <MoodEvolutionList moodEvolution={metrics.moodEvolution} />
                </>
            )}
        </motion.section>
    );
};

export default TeamMetricsPanel;
