/**
 * Hook para el análisis del estado de ánimo del equipo
 * Calcula métricas, insights y recomendaciones basadas en el análisis de sentimientos
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../types/card';
import {
    TeamMoodReport,
    TeamMoodMetrics,
    TeamMoodInsight,
    ColumnMoodMetrics,
    TeamMoodConfig,
    DEFAULT_TEAM_MOOD_CONFIG,
    calculateMoodScore
} from '../types/teamMood';
import { SentimentResult, SentimentType } from '../types/sentiment';

interface UseTeamMoodProps {
    cards: Card[];
    sentimentResults: Map<string, SentimentResult>;
    columnConfigs: Record<string, any>; // Para obtener títulos de columna
    config?: Partial<TeamMoodConfig>;
}

interface UseTeamMoodReturn {
    report: TeamMoodReport;
    isAnalyzing: boolean;
    hasEnoughData: boolean;
    refreshReport: () => void;
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

    // Verificar si hay suficientes datos para el análisis
    const hasEnoughData = useMemo(() => {
        return cards.length >= 3 && sentimentResults.size >= 2;
    }, [cards.length, sentimentResults.size]);

    // Estado de análisis - siempre false ya que este es un cálculo síncrono
    const isAnalyzing = false;

    // Calcular métricas por columna
    const columnMetrics = useMemo((): ColumnMoodMetrics[] => {
        const columnsMap = new Map<string, ColumnMoodMetrics>();

        // Inicializar métricas para cada columna que tiene tarjetas
        cards.forEach(card => {
            if (!columnsMap.has(card.column)) {
                const columnConfig = columnConfigs[card.column];
                columnsMap.set(card.column, {
                    column: card.column,
                    columnTitle: columnConfig?.title || card.column,
                    total: 0,
                    positive: 0,
                    negative: 0,
                    neutral: 0,
                    positivePercentage: 0,
                    negativePercentage: 0,
                    neutralPercentage: 0,
                    averageConfidence: 0
                });
            }
        });

        // Contar sentimientos por columna
        const confidenceByColumn = new Map<string, number[]>();

        cards.forEach(card => {
            // Saltar tarjetas de acciones si no deben ser analizadas
            if (card.column === 'actions') return;

            const sentiment = sentimentResults.get(card.id);
            const columnMetric = columnsMap.get(card.column);

            if (columnMetric) {
                columnMetric.total++;

                if (sentiment && sentiment.confidence >= config.minConfidenceThreshold) {
                    columnMetric[sentiment.sentiment]++;

                    // Acumular confianza para promedio
                    if (!confidenceByColumn.has(card.column)) {
                        confidenceByColumn.set(card.column, []);
                    }
                    confidenceByColumn.get(card.column)!.push(sentiment.confidence);
                }
            }
        });

        // Calcular porcentajes y confianza promedio
        columnsMap.forEach((metric, columnId) => {
            if (metric.total > 0) {
                metric.positivePercentage = Math.round((metric.positive / metric.total) * 100);
                metric.negativePercentage = Math.round((metric.negative / metric.total) * 100);
                metric.neutralPercentage = Math.round((metric.neutral / metric.total) * 100);

                const confidences = confidenceByColumn.get(columnId) || [];
                if (confidences.length > 0) {
                    metric.averageConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
                }
            }
        });

        return Array.from(columnsMap.values()).sort((a, b) => b.total - a.total);
    }, [cards, sentimentResults, columnConfigs, config.minConfidenceThreshold]);

    // Calcular métricas generales del equipo
    const teamMetrics = useMemo((): TeamMoodMetrics => {
        // Filtrar tarjetas de acciones para el análisis
        const analyzableCards = cards.filter(card => card.column !== 'actions');
        const totalCards = analyzableCards.length;

        let analyzedCards = 0;
        let totalPositive = 0;
        let totalNegative = 0;
        let totalNeutral = 0;
        const allConfidences: number[] = [];

        analyzableCards.forEach(card => {
            const sentiment = sentimentResults.get(card.id);
            if (sentiment && sentiment.confidence >= config.minConfidenceThreshold) {
                analyzedCards++;
                allConfidences.push(sentiment.confidence);

                switch (sentiment.sentiment) {
                    case 'positive':
                        totalPositive++;
                        break;
                    case 'negative':
                        totalNegative++;
                        break;
                    case 'neutral':
                        totalNeutral++;
                        break;
                }
            }
        });

        const analysisCompleteness = totalCards > 0 ? (analyzedCards / totalCards) * 100 : 0;
        const overallConfidence = allConfidences.length > 0 ?
            allConfidences.reduce((sum, conf) => sum + conf, 0) / allConfidences.length : 0;

        // Determinar sentimiento dominante
        let overallSentiment: SentimentType = 'neutral';
        if (totalPositive > totalNegative && totalPositive > totalNeutral) {
            overallSentiment = 'positive';
        } else if (totalNegative > totalPositive && totalNegative > totalNeutral) {
            overallSentiment = 'negative';
        }

        const positivePercentage = analyzedCards > 0 ? Math.round((totalPositive / analyzedCards) * 100) : 0;
        const negativePercentage = analyzedCards > 0 ? Math.round((totalNegative / analyzedCards) * 100) : 0;
        const neutralPercentage = analyzedCards > 0 ? Math.round((totalNeutral / analyzedCards) * 100) : 0;

        return {
            totalCards,
            analyzedCards,
            analysisCompleteness,
            overallSentiment,
            overallConfidence,
            totalPositive,
            totalNegative,
            totalNeutral,
            positivePercentage,
            negativePercentage,
            neutralPercentage,
            columnMetrics
        };
    }, [cards, sentimentResults, config.minConfidenceThreshold, columnMetrics]);

    // Generar insights basados en las métricas
    const insights = useMemo((): TeamMoodInsight[] => {
        const insights: TeamMoodInsight[] = [];

        if (!hasEnoughData) {
            insights.push({
                type: 'neutral',
                title: t('retrospective.facilitator.teamMood.insights.insufficientData.title'),
                description: t('retrospective.facilitator.teamMood.insights.insufficientData.description'),
                icon: '📊',
                severity: 2,
                actionable: true
            });
            return insights;
        }

        // Análisis de completitud
        if (teamMetrics.analysisCompleteness < 70) {
            insights.push({
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

        // Análisis de sentimientos negativos críticos
        if (teamMetrics.negativePercentage >= config.alertThresholds.criticalNegativePercentage) {
            insights.push({
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
            insights.push({
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

        // Análisis de sentimientos positivos bajos
        if (teamMetrics.positivePercentage < config.alertThresholds.lowPositivePercentage) {
            insights.push({
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

        // Análisis por columna más problemática
        const mostNegativeColumn = columnMetrics.find(col => col.negativePercentage > 50);
        if (mostNegativeColumn) {
            insights.push({
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

        // Análisis positivo
        if (teamMetrics.positivePercentage >= 60) {
            insights.push({
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
            insights.push({
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

        // Análisis de equilibrio
        const isBalanced = Math.abs(teamMetrics.positivePercentage - teamMetrics.negativePercentage) <= 15;
        if (isBalanced && teamMetrics.neutralPercentage >= 30) {
            insights.push({
                type: 'neutral',
                title: t('retrospective.facilitator.teamMood.insights.balancedPerspective.title'),
                description: t('retrospective.facilitator.teamMood.insights.balancedPerspective.description'),
                icon: '⚖️',
                severity: 2,
                actionable: false
            });
        }

        // Ordenar por severidad (más severos primero)
        return insights.sort((a, b) => b.severity - a.severity);
    }, [teamMetrics, columnMetrics, config.alertThresholds, hasEnoughData, t]);

    // Generar informe completo
    const report = useMemo((): TeamMoodReport => {
        const moodScore = calculateMoodScore(teamMetrics);

        return {
            metrics: teamMetrics,
            insights,
            timestamp: new Date(),
            moodScore,
            moodTrend: 'stable' // Para futuras implementaciones
        };
    }, [teamMetrics, insights]);

    // Función para refrescar (placeholder para futuras implementaciones)
    const refreshReport = () => {
        // El informe se recalcula automáticamente cuando cambian las dependencias
        console.log('🔄 Informe de estado de ánimo recalculado automáticamente');
    };

    return {
        report,
        isAnalyzing,
        hasEnoughData,
        refreshReport
    };
}
