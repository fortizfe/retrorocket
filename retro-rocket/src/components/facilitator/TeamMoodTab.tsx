/**
 * Tab del informe de estado de ánimo del equipo para facilitadores
 * Integra el análisis de sentimientos con el sistema de tabs existente
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../types/card';
import { useTeamMood } from '../../hooks/useTeamMood';
import TeamMoodDashboard from '../sentiment/TeamMoodDashboard';

interface TeamMoodTabProps {
    cards: Card[];
    sentimentResults: Map<string, any>;
    sentimentEnabled: boolean;
    sentimentReady: boolean;
    columnConfigs: Record<string, any>;
}

const TeamMoodTab: React.FC<TeamMoodTabProps> = ({
    cards,
    sentimentResults,
    sentimentEnabled,
    sentimentReady,
    columnConfigs
}) => {
    const { t } = useTranslation();
    const { report, hasEnoughData, isAnalyzing } = useTeamMood({
        cards,
        sentimentResults,
        columnConfigs
    });

    // Si el análisis de sentimientos está desactivado
    if (!sentimentEnabled) {
        return (
            <div className="text-center p-8">
                <div className="text-6xl mb-4">🧠</div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                    {t('retrospective.facilitator.teamMood.disabled.title')}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 max-w-md mx-auto">
                    {t('retrospective.facilitator.teamMood.disabled.description')}
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
                    💡 <strong>{t('sentiment.help.tip')}</strong> {t('retrospective.facilitator.teamMood.disabled.tip')}
                </div>
            </div>
        );
    }

    // Si el sistema está inicializando
    if (!sentimentReady) {
        return (
            <div className="text-center p-8">
                <div className="animate-pulse text-6xl mb-4">🤖</div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                    {t('retrospective.facilitator.teamMood.initializing.title')}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    {t('retrospective.facilitator.teamMood.initializing.description')}
                </p>
                <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-h-[60vh] overflow-y-auto">
            <TeamMoodDashboard
                report={report}
                hasEnoughData={hasEnoughData}
                isAnalyzing={isAnalyzing}
            />
        </div>
    );
};

export default TeamMoodTab;
