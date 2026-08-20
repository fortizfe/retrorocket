import React from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Users } from 'lucide-react';

/**
 * Retrospective activity summary (spec 056, User Story 1 — "Team owner/member views
 * activity metrics", T014). Two stat cards mirroring the existing
 * `TeamMoodDashboard.tsx` stat-card language (icon + number + label, `bg-surface`
 * `rounded-lg` cards) so this panel reads as the same design system rather than a new one.
 *
 * FR-010: a team with zero retrospectives must show a clear empty state, not just a bare
 * "0" that could read as a loading glitch or a broken fetch — both figures still render
 * (Craft/clarity: never hide data, even zero data), with an additional message beneath
 * making the zero-state explicit.
 */
export interface ActivitySummaryProps {
    retrospectiveCount: number;
    averageParticipants: number;
}

const ActivitySummary: React.FC<ActivitySummaryProps> = ({ retrospectiveCount, averageParticipants }) => {
    const { t } = useTranslation();
    const isEmpty = retrospectiveCount === 0;

    return (
        <div>
            <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border-default bg-surface p-4 text-center">
                    <ClipboardList className="h-5 w-5 text-text-secondary" aria-hidden="true" />
                    <p className="text-2xl font-semibold tracking-tight text-text-primary">{retrospectiveCount}</p>
                    <p className="text-xs text-text-secondary">{t('teams.metrics.activity.retrospectiveCountLabel')}</p>
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border-default bg-surface p-4 text-center">
                    <Users className="h-5 w-5 text-text-secondary" aria-hidden="true" />
                    <p className="text-2xl font-semibold tracking-tight text-text-primary">{averageParticipants}</p>
                    <p className="text-xs text-text-secondary">{t('teams.metrics.activity.averageParticipantsLabel')}</p>
                </div>
            </div>

            {isEmpty && (
                <p className="mt-3 text-center text-xs text-text-muted">{t('teams.metrics.activity.emptyState')}</p>
            )}
        </div>
    );
};

export default ActivitySummary;
