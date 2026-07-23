/**
 * Hook para el análisis del estado de ánimo del equipo.
 *
 * Todas las métricas, porcentajes, puntuación e insights se derivan de UNA sola
 * distribución ajustada por rol de columna (F4/FR-006), de modo que la puntuación,
 * los porcentajes y las alertas nunca se contradicen. La confianza se decide con el
 * predicado único `isConfident` (F7/FR-009).
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/features/boards/types/card';
import {
    TeamMoodReport,
    TeamMoodMetrics,
    TeamMoodInsight,
    TeamMoodConfig,
    DEFAULT_TEAM_MOOD_CONFIG
} from '@/features/boards/types/teamMood';
import {
    SentimentResult,
    SentimentType,
    DEFAULT_SENTIMENT_CONFIG
} from '@/features/boards/types/sentiment';
import { DynamicColumnConfig, getColumnRole } from '@/features/boards/retrospective/hooks/useRetrospectiveColumns';
import { computeMoodDistribution } from '@/features/boards/sentiment/domain/moodDistribution';
import { calculateMoodScore } from '@/features/boards/sentiment/domain/moodScore';

interface UseTeamMoodProps {
    cards: Card[];
    sentimentResults: ReadonlyMap<string, SentimentResult>;
    columnConfigs: Record<string, DynamicColumnConfig>; // Para obtener títulos y rol de columna
    config?: Partial<TeamMoodConfig>;
}

interface UseTeamMoodReturn {
    report: TeamMoodReport;
    isAnalyzing: boolean;
    hasEnoughData: boolean;
    refreshReport: () => void;
}

function isAnalyzableColumn(columnId: string, columnConfigs: Record<string, DynamicColumnConfig>): boolean {
    const role = columnConfigs[columnId]?.role ?? getColumnRole(columnId);
    return role !== 'action';
}

export function useTeamMood({
    cards,
    sentimentResults,
    columnConfigs,
    config: userConfig = {}
}: UseTeamMoodProps): UseTeamMoodReturn {
    const { t } = useTranslation();

    const config: TeamMoodConfig = useMemo(() => ({
        ...DEFAULT_TEAM_MOOD_CONFIG,
        ...userConfig
    }), [userConfig]);

    // Al menos 3 tarjetas analizables (no-acción) para un análisis significativo.
    const hasEnoughData = useMemo(() => {
        const analyzableCount = cards.filter(card => isAnalyzableColumn(card.column, columnConfigs)).length;
        return analyzableCount >= 3;
    }, [cards, columnConfigs]);

    // Cálculo síncrono — nunca "analizando".
    const isAnalyzing = false;

    // UNA distribución ajustada; alimenta puntuación, porcentajes e insights.
    const distribution = useMemo(
        () => computeMoodDistribution(cards, sentimentResults, columnConfigs, DEFAULT_SENTIMENT_CONFIG),
        [cards, sentimentResults, columnConfigs]
    );

    const teamMetrics = useMemo((): TeamMoodMetrics => {
        const totalCards = cards.filter(card => isAnalyzableColumn(card.column, columnConfigs)).length;
        const analyzedCards = distribution.total;
        const analysisCompleteness = totalCards > 0 ? (analyzedCards / totalCards) * 100 : 0;

        let overallSentiment: SentimentType = 'neutral';
        if (distribution.positive > distribution.negative && distribution.positive > distribution.neutral) {
            overallSentiment = 'positive';
        } else if (distribution.negative > distribution.positive && distribution.negative > distribution.neutral) {
            overallSentiment = 'negative';
        }

        return {
            totalCards,
            analyzedCards,
            analysisCompleteness,
            overallSentiment,
            overallConfidence: distribution.averageConfidence,
            totalPositive: distribution.positive,
            totalNegative: distribution.negative,
            totalNeutral: distribution.neutral,
            positivePercentage: distribution.positivePct,
            negativePercentage: distribution.negativePct,
            neutralPercentage: distribution.neutralPct,
            columnMetrics: distribution.perColumn,
        };
    }, [cards, columnConfigs, distribution]);

    const insights = useMemo((): TeamMoodInsight[] => {
        const list: TeamMoodInsight[] = [];

        if (!hasEnoughData) {
            list.push({
                type: 'neutral',
                title: t('retrospective.facilitator.teamMood.insights.insufficientData.title'),
                description: t('retrospective.facilitator.teamMood.insights.insufficientData.description'),
                icon: '📊',
                severity: 2,
                actionable: true
            });
            return list;
        }

        if (teamMetrics.analysisCompleteness < 70) {
            list.push({
                type: 'warning',
                title: t('retrospective.facilitator.teamMood.insights.incompleteAnalysis.title'),
                description: t('retrospective.facilitator.teamMood.insights.incompleteAnalysis.description', {
                    percentage: Math.round(teamMetrics.analysisCompleteness)
                }),
                icon: '⚠️',
                severity: 3,
                actionable: false
            });
        }

        // Negatividad crítica / advertencia — lee los MISMOS porcentajes ajustados que
        // alimentan la puntuación, así nunca contradice a moodScore (FR-006).
        if (teamMetrics.negativePercentage >= config.alertThresholds.criticalNegativePercentage) {
            list.push({
                type: 'critical',
                title: t('retrospective.facilitator.teamMood.insights.criticalNegative.title'),
                description: t('retrospective.facilitator.teamMood.insights.criticalNegative.description', {
                    percentage: teamMetrics.negativePercentage
                }),
                icon: '🚨',
                severity: 5,
                actionable: true
            });
        } else if (teamMetrics.negativePercentage >= config.alertThresholds.warningNegativePercentage) {
            list.push({
                type: 'warning',
                title: t('retrospective.facilitator.teamMood.insights.warningNegative.title'),
                description: t('retrospective.facilitator.teamMood.insights.warningNegative.description', {
                    percentage: teamMetrics.negativePercentage
                }),
                icon: '⚡',
                severity: 4,
                actionable: true
            });
        }

        if (teamMetrics.positivePercentage < config.alertThresholds.lowPositivePercentage) {
            list.push({
                type: 'warning',
                title: t('retrospective.facilitator.teamMood.insights.lowPositive.title'),
                description: t('retrospective.facilitator.teamMood.insights.lowPositive.description', {
                    percentage: teamMetrics.positivePercentage
                }),
                icon: '📈',
                severity: 3,
                actionable: true
            });
        }

        // Columna más problemática — la distribución ya reclasifica la negatividad
        // esperada, así que una columna de rol 'negative' no dispara esta alerta.
        const mostNegativeColumn = teamMetrics.columnMetrics.find(col => col.negativePercentage > 50);
        if (mostNegativeColumn) {
            list.push({
                type: 'critical',
                title: t('retrospective.facilitator.teamMood.insights.criticalColumn.title', {
                    column: mostNegativeColumn.columnTitle
                }),
                description: t('retrospective.facilitator.teamMood.insights.criticalColumn.description', {
                    percentage: mostNegativeColumn.negativePercentage,
                    column: mostNegativeColumn.columnTitle
                }),
                icon: '🎯',
                severity: 5,
                actionable: true
            });
        }

        if (teamMetrics.positivePercentage >= 60) {
            list.push({
                type: 'success',
                title: t('retrospective.facilitator.teamMood.insights.excellentMood.title'),
                description: t('retrospective.facilitator.teamMood.insights.excellentMood.description', {
                    percentage: teamMetrics.positivePercentage
                }),
                icon: '🌟',
                severity: 1,
                actionable: false
            });
        } else if (teamMetrics.positivePercentage >= 40) {
            list.push({
                type: 'positive',
                title: t('retrospective.facilitator.teamMood.insights.favorableMood.title'),
                description: t('retrospective.facilitator.teamMood.insights.favorableMood.description', {
                    percentage: teamMetrics.positivePercentage
                }),
                icon: '👍',
                severity: 2,
                actionable: false
            });
        }

        const isBalanced = Math.abs(teamMetrics.positivePercentage - teamMetrics.negativePercentage) <= 15;
        if (isBalanced && teamMetrics.neutralPercentage >= 30) {
            list.push({
                type: 'neutral',
                title: t('retrospective.facilitator.teamMood.insights.balancedPerspective.title'),
                description: t('retrospective.facilitator.teamMood.insights.balancedPerspective.description'),
                icon: '⚖️',
                severity: 2,
                actionable: false
            });
        }

        return list.sort((a, b) => b.severity - a.severity);
    }, [teamMetrics, config.alertThresholds, hasEnoughData, t]);

    // Informe completo — recalcula cuando cambian sus entradas, incluido columnConfigs (F6).
    const report = useMemo((): TeamMoodReport => ({
        metrics: teamMetrics,
        insights,
        timestamp: new Date(),
        moodScore: calculateMoodScore(distribution),
        moodTrend: 'stable'
    }), [teamMetrics, insights, distribution]);

    const refreshReport = () => {
        // El informe se recalcula automáticamente cuando cambian las dependencias.
    };

    return {
        report,
        isAnalyzing,
        hasEnoughData,
        refreshReport
    };
}
