import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckSquare } from 'lucide-react';

/**
 * Action items summary (spec 056, User Story 2 — "Team owner/member views action item
 * metrics", T021). Single stat card mirroring `ActivitySummary.tsx`'s stat-card language
 * (icon + number + label, `bg-surface` `rounded-lg` cards) so this panel keeps reading as
 * the same design system.
 *
 * Acceptance Scenario 2 (spec.md): a team with retrospectives that have no action items
 * shows the count as zero rather than omitted or erroring — unlike ActivitySummary
 * (FR-010), this story's spec does not call for additional empty-state messaging, so the
 * bare "0" stat is the complete zero-state.
 */
export interface ActionItemsSummaryProps {
    actionItemsCreated: number;
}

const ActionItemsSummary: React.FC<ActionItemsSummaryProps> = ({ actionItemsCreated }) => {
    const { t } = useTranslation();

    return (
        <div className="mt-3">
            <div className="flex flex-col items-center gap-1.5 rounded-lg border border-border-default bg-surface p-4 text-center">
                <CheckSquare className="h-5 w-5 text-text-secondary" aria-hidden="true" />
                <p className="text-2xl font-semibold tracking-tight text-text-primary">{actionItemsCreated}</p>
                <p className="text-xs text-text-secondary">{t('teams.metrics.actionItems.actionItemsCreatedLabel')}</p>
            </div>
        </div>
    );
};

export default ActionItemsSummary;
