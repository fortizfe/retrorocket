/**
 * Informe detallado del estado de ánimo del equipo
 * Componente principal que muestra métricas, insights y visualizaciones
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    Info,
    Users,
    BarChart3,
    Target,
    Clock
} from 'lucide-react';
import {
    TeamMoodReport,
    getMoodScoreColor,
    getMoodScoreBgColor
} from '@/features/boards/types/teamMood';
import SentimentProgressBar from '@/features/boards/sentiment/components/SentimentProgressBar';

interface TeamMoodDashboardProps {
    report: TeamMoodReport;
    hasEnoughData: boolean;
    isAnalyzing: boolean;
    onRefresh?: () => void;
}

const TeamMoodDashboard: React.FC<TeamMoodDashboardProps> = ({
    report,
    hasEnoughData,
    isAnalyzing,
    onRefresh
}) => {
    const { t } = useTranslation();

    if (isAnalyzing) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p className="text-text-secondary text-sm">
                        {t('retrospective.facilitator.teamMood.analyzing')}
                    </p>
                </div>
            </div>
        );
    }

    if (!hasEnoughData) {
        return (
            <div className="text-center p-8">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-lg font-medium text-text-primary mb-2">
                    {t('retrospective.facilitator.teamMood.insufficientData.title')}
                </h3>
                <p className="text-sm text-text-secondary mb-4 max-w-md mx-auto">
                    {t('retrospective.facilitator.teamMood.insufficientData.description')}
                </p>
                <div className="text-xs text-text-muted">
                    💡 {t('retrospective.facilitator.teamMood.insufficientData.tip')}
                </div>
            </div>
        );
    }

    const { metrics, insights, moodScore } = report;

    const getMoodScoreLabel = (score: number): string => {
        if (score >= 8.5) return t('retrospective.facilitator.teamMood.moodLabels.excellent');
        if (score >= 7.5) return t('retrospective.facilitator.teamMood.moodLabels.excellent');
        if (score >= 6.5) return t('retrospective.facilitator.teamMood.moodLabels.good');
        if (score >= 5.5) return t('retrospective.facilitator.teamMood.moodLabels.fair');
        if (score >= 4.5) return t('retrospective.facilitator.teamMood.moodLabels.fair');
        if (score >= 3.5) return t('retrospective.facilitator.teamMood.moodLabels.poor');
        return t('retrospective.facilitator.teamMood.moodLabels.critical');
    };

    const getTranslatedColumnTitle = (columnTitle: string, column: string): string => {
        // Mapeo de columnas conocidas a sus claves de traducción
        const columnTranslationMap: Record<string, string> = {
            'helped': 'retrospective.columns.helped',
            'hindered': 'retrospective.columns.hindered',
            'improve': 'retrospective.columns.improve',
            'whatHelped': 'retrospective.columns.helped',
            'whatHindered': 'retrospective.columns.hindered',
            'whatToImprove': 'retrospective.columns.improve',
            'mad': 'retrospective.columns.mad',
            'sad': 'retrospective.columns.sad',
            'glad': 'retrospective.columns.glad',
            'start': 'retrospective.columns.start',
            'stop': 'retrospective.columns.stop',
            'continue': 'retrospective.columns.continue'
        };

        // Si encontramos una traducción específica, la usamos
        if (columnTranslationMap[column]) {
            return t(columnTranslationMap[column]);
        }

        // Si no, usamos el título tal como viene (puede que ya esté traducido)
        return columnTitle;
    };

    const getMoodIcon = () => {
        if (moodScore >= 7.5) return '😊';
        if (moodScore >= 6) return '🙂';
        if (moodScore >= 4) return '😐';
        return '😟';
    };

    const getInsightIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'positive': return <TrendingUp className="w-4 h-4 text-green-500" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
            case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
            default: return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    const getInsightBgColor = (type: string) => {
        switch (type) {
            case 'success': return 'bg-success-bg border-success-fg';
            case 'positive': return 'bg-success-bg border-success-fg';
            case 'warning': return 'bg-warning-bg border-warning-fg';
            case 'critical': return 'bg-error-bg border-error-fg';
            default: return 'bg-info-bg border-info-fg';
        }
    };

    return (
        <div className="space-y-6">
            {/* Encabezado del informe */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center pb-4 border-b border-border-default"
            >
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-info-fg" />
                    <h2 className="text-lg font-semibold text-text-primary">
                        {t('retrospective.facilitator.teamMood.title')}
                    </h2>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
                    <Clock className="w-3 h-3" />
                    <span>{t('retrospective.facilitator.teamMood.updated')} {report.timestamp.toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}</span>
                </div>
            </motion.div>

            {/* Puntuación general del estado de ánimo */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`text-center p-6 rounded-xl border ${getMoodScoreBgColor(moodScore)}`}
            >
                <div className="text-4xl mb-2">{getMoodIcon()}</div>
                <div className={`text-3xl font-bold mb-1 ${getMoodScoreColor(moodScore)}`}>
                    {moodScore}/10
                </div>
                <div className={`text-lg font-medium mb-2 ${getMoodScoreColor(moodScore)}`}>
                    {getMoodScoreLabel(moodScore)}
                </div>
                <div className="text-sm text-text-secondary">
                    {t('retrospective.facilitator.teamMood.basedOn', { count: metrics.analyzedCards })}
                </div>
            </motion.div>

            {/* Métricas rápidas */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-3 gap-3"
            >
                <div className="text-center p-3 bg-success-bg rounded-lg border border-success-fg">
                    <div className="text-2xl font-bold text-success-fg">
                        {metrics.positivePercentage}%
                    </div>
                    <div className="text-xs text-success-fg font-medium">
                        {t('retrospective.facilitator.teamMood.sentiments.positive')}
                    </div>
                </div>
                <div className="text-center p-3 bg-surface rounded-lg border border-border-default">
                    <div className="text-2xl font-bold text-text-secondary">
                        {metrics.neutralPercentage}%
                    </div>
                    <div className="text-xs text-text-secondary font-medium">
                        {t('retrospective.facilitator.teamMood.sentiments.neutral')}
                    </div>
                </div>
                <div className="text-center p-3 bg-error-bg rounded-lg border border-error-fg">
                    <div className="text-2xl font-bold text-error-fg">
                        {metrics.negativePercentage}%
                    </div>
                    <div className="text-xs text-error-fg font-medium">
                        {t('retrospective.facilitator.teamMood.sentiments.negative')}
                    </div>
                </div>
            </motion.div>

            {/* Análisis por columna */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-3"
            >
                <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-text-secondary" />
                    <h3 className="text-sm font-medium text-text-primary">
                        {t('retrospective.facilitator.teamMood.sections.columnAnalysis')}
                    </h3>
                </div>

                <div className="space-y-2">
                    {metrics.columnMetrics
                        .filter(col => col.total > 0)
                        .map((column, index) => (
                            <motion.div
                                key={column.column}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + index * 0.1 }}
                                className="bg-surface rounded-lg p-3"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-text-primary">
                                        {getTranslatedColumnTitle(column.columnTitle, column.column)}
                                    </span>
                                    <span className="text-xs text-text-muted">
                                        {column.total} {column.total === 1 ?
                                            t('retrospective.facilitator.teamMood.stats.cards_singular') :
                                            t('retrospective.facilitator.teamMood.stats.cards_plural')
                                        }
                                    </span>
                                </div>

                                {/* Barra de progreso del sentimiento */}
                                <SentimentProgressBar
                                    positivePercentage={column.positivePercentage}
                                    neutralPercentage={column.neutralPercentage}
                                    negativePercentage={column.negativePercentage}
                                />

                                <div className="flex justify-between text-xs text-text-secondary">
                                    <span>➕ {column.positivePercentage}%</span>
                                    <span>➖ {column.neutralPercentage}%</span>
                                    <span>❌ {column.negativePercentage}%</span>
                                </div>
                            </motion.div>
                        ))
                    }
                </div>
            </motion.div>

            {/* Insights y recomendaciones */}
            {insights.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-3"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Target className="w-4 h-4 text-text-secondary" />
                        <h3 className="text-sm font-medium text-text-primary">
                            {t('retrospective.facilitator.teamMood.sections.insights')}
                        </h3>
                    </div>

                    <div className="space-y-2">
                        {insights.slice(0, 4).map((insight) => (
                            <motion.div
                                key={`${insight.type}-${insight.title.slice(0, 20)}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`p-3 rounded-lg border ${getInsightBgColor(insight.type)}`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-lg">{insight.icon}</span>
                                        {getInsightIcon(insight.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium text-text-primary mb-1">
                                            {insight.title}
                                        </h4>
                                        <p className="text-xs text-text-secondary leading-relaxed">
                                            {insight.description}
                                        </p>
                                        {insight.actionable && (
                                            <div className="mt-2">
                                                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 bg-info-bg text-info-fg rounded-full">
                                                    <Target className="w-3 h-3" />
                                                    {t('retrospective.facilitator.teamMood.actionable')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {insights.length > 4 && (
                        <div className="text-center">
                            <span className="text-xs text-text-muted">
                                {insights.length - 4 === 1 ?
                                    t('retrospective.facilitator.teamMood.moreInsights', { count: insights.length - 4 }) :
                                    t('retrospective.facilitator.teamMood.moreInsights_plural', { count: insights.length - 4 })
                                }
                            </span>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Estadísticas adicionales */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-surface rounded-lg p-4"
            >
                <h3 className="text-sm font-medium text-text-primary mb-3">
                    {t('retrospective.facilitator.teamMood.sections.detailedStats')}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                        <span className="text-text-secondary">{t('retrospective.facilitator.teamMood.stats.totalCards')}</span>
                        <span className="font-medium text-text-primary ml-2">
                            {metrics.totalCards}
                        </span>
                    </div>
                    <div>
                        <span className="text-text-secondary">{t('retrospective.facilitator.teamMood.stats.analyzed')}</span>
                        <span className="font-medium text-text-primary ml-2">
                            {metrics.analyzedCards} ({Math.round(metrics.analysisCompleteness)}%)
                        </span>
                    </div>
                    <div>
                        <span className="text-text-secondary">{t('retrospective.facilitator.teamMood.stats.averageConfidence')}</span>
                        <span className="font-medium text-text-primary ml-2">
                            {Math.round(metrics.overallConfidence * 100)}%
                        </span>
                    </div>
                    <div>
                        <span className="text-text-secondary">{t('retrospective.facilitator.teamMood.stats.dominantSentiment')}</span>
                        <span className="font-medium text-text-primary ml-2">
                            {(() => {
                                if (metrics.overallSentiment === 'positive') return `😊 ${t('retrospective.facilitator.teamMood.sentiments.positive')}`;
                                if (metrics.overallSentiment === 'negative') return `😞 ${t('retrospective.facilitator.teamMood.sentiments.negative')}`;
                                return `😐 ${t('retrospective.facilitator.teamMood.sentiments.neutral')}`;
                            })()}
                        </span>
                    </div>
                </div>
            </motion.div>

            {/* Nota informativa */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-center text-xs text-text-muted bg-surface rounded-lg p-3"
            >
                <div className="flex items-center justify-center gap-2 mb-1">
                    <Info className="w-3 h-3" />
                    <span className="font-medium">{t('retrospective.facilitator.teamMood.facilitatorNote.title')}</span>
                </div>
                <p>
                    {t('retrospective.facilitator.teamMood.facilitatorNote.description')}
                </p>
            </motion.div>
        </div>
    );
};

export default TeamMoodDashboard;
