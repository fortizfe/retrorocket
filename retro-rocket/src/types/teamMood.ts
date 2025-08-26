/**
 * Tipos e interfaces para el análisis del estado de ánimo del equipo
 * Basado en el análisis de sentimientos de las tarjetas individuales
 */

import { SentimentType } from './sentiment';

// Métricas básicas del equipo por columna
export interface ColumnMoodMetrics {
    column: string;
    columnTitle: string;
    total: number;
    positive: number;
    negative: number;
    neutral: number;
    positivePercentage: number;
    negativePercentage: number;
    neutralPercentage: number;
    averageConfidence: number;
}

// Métricas generales del equipo
export interface TeamMoodMetrics {
    totalCards: number;
    analyzedCards: number;
    analysisCompleteness: number; // Porcentaje de tarjetas analizadas
    overallSentiment: SentimentType; // Sentimiento dominante
    overallConfidence: number; // Confianza promedio general

    // Distribución general
    totalPositive: number;
    totalNegative: number;
    totalNeutral: number;
    positivePercentage: number;
    negativePercentage: number;
    neutralPercentage: number;

    // Métricas por columna
    columnMetrics: ColumnMoodMetrics[];
}

// Insights basados en las métricas
export interface TeamMoodInsight {
    type: 'positive' | 'warning' | 'critical' | 'neutral' | 'success';
    title: string;
    description: string;
    icon: string;
    severity: number; // 1-5, donde 5 es más importante
    actionable: boolean; // Si requiere acción del facilitador
}

// Estado de ánimo del equipo con insights
export interface TeamMoodReport {
    metrics: TeamMoodMetrics;
    insights: TeamMoodInsight[];
    timestamp: Date;
    moodScore: number; // Puntuación del 1-10 basada en análisis
    moodTrend: 'improving' | 'declining' | 'stable'; // Tendencia (para futuras iteraciones)
}

// Configuración para el análisis del estado de ánimo
export interface TeamMoodConfig {
    minConfidenceThreshold: number; // Confianza mínima para incluir en el análisis
    alertThresholds: {
        criticalNegativePercentage: number; // % para alertas críticas
        warningNegativePercentage: number; // % para advertencias
        lowPositivePercentage: number; // % mínimo esperado de positivos
    };
    columnWeights: Record<string, number>; // Peso relativo de cada columna en el análisis
}

// Configuración por defecto
export const DEFAULT_TEAM_MOOD_CONFIG: TeamMoodConfig = {
    minConfidenceThreshold: 0.4,
    alertThresholds: {
        criticalNegativePercentage: 40,
        warningNegativePercentage: 25,
        lowPositivePercentage: 20,
    },
    columnWeights: {
        'helped': 1.2,      // Aspectos positivos tienen más peso
        'hindered': 1.5,    // Aspectos negativos tienen mucho más peso
        'improve': 1.3,     // Mejoras tienen peso alto
        'actions': 0.8,     // Acciones tienen menor peso (más neutras)
    },
};

// Utilidades para determinar el estado de ánimo general
export const calculateMoodScore = (metrics: TeamMoodMetrics): number => {
    if (metrics.analyzedCards === 0) return 5; // Neutro si no hay datos

    // Fórmula: (positivos * 2 + neutrales - negativos * 1.5) normalizada a escala 1-10
    const weightedScore = (
        metrics.positivePercentage * 2 +
        metrics.neutralPercentage -
        metrics.negativePercentage * 1.5
    ) / 100;

    // Normalizar a escala 1-10
    const normalizedScore = Math.max(1, Math.min(10, (weightedScore + 1.5) * 3.33));
    return Math.round(normalizedScore * 10) / 10; // Redondear a 1 decimal
};

export const getMoodScoreLabel = (score: number): string => {
    if (score >= 8.5) return 'Excelente';
    if (score >= 7.5) return 'Muy Bueno';
    if (score >= 6.5) return 'Bueno';
    if (score >= 5.5) return 'Regular';
    if (score >= 4.5) return 'Preocupante';
    if (score >= 3.5) return 'Malo';
    return 'Crítico';
};

export const getMoodScoreColor = (score: number): string => {
    if (score >= 7.5) return 'text-green-600 dark:text-green-400';
    if (score >= 6) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 4) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
};

export const getMoodScoreBgColor = (score: number): string => {
    if (score >= 7.5) return 'bg-green-100 dark:bg-green-900/20';
    if (score >= 6) return 'bg-yellow-100 dark:bg-yellow-900/20';
    if (score >= 4) return 'bg-orange-100 dark:bg-orange-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
};
