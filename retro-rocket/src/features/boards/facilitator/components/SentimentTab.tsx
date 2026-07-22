import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain,
    Settings,
    AlertCircle,
    CheckCircle,
    Loader,
    ChevronDown,
    ChevronUp,
    BarChart3,
    Zap,
    TrendingUp
} from 'lucide-react';
import Button from '@/lib/components/ui/Button';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { SentimentConfiguration, SENTIMENT_MODELS } from '@/features/boards/types/sentiment';

interface SentimentTabProps {
    enabled: boolean;
    ready: boolean;
    loading: boolean;
    error?: string;
    config: SentimentConfiguration;
    onToggle: (enabled: boolean) => void;
    onConfigUpdate: (updates: Partial<SentimentConfiguration>) => void;
    cardCount: number;
}

const SentimentTab: React.FC<SentimentTabProps> = ({
    enabled,
    ready,
    loading,
    error,
    config,
    onToggle,
    onConfigUpdate,
    cardCount
}) => {
    const { t } = useLanguage();
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Generate unique IDs for form elements
    const modelSelectId = React.useId();
    const thresholdId = React.useId();
    const batchSizeId = React.useId();

    const getStatusInfo = () => {
        if (loading) return {
            icon: <Loader className="w-5 h-5 animate-spin text-blue-500" />,
            text: t('sentiment.status.initializing'),
            color: 'text-info-fg',
            bg: 'bg-info-bg',
            border: 'border-info-fg'
        };
        if (error) return {
            icon: <AlertCircle className="w-5 h-5 text-red-500" />,
            text: t('sentiment.status.connectionError'),
            color: 'text-error-fg',
            bg: 'bg-error-bg',
            border: 'border-error-fg'
        };
        if (!enabled) return {
            icon: <Brain className="w-5 h-5 text-slate-400" />,
            text: t('sentiment.status.disabled'),
            color: 'text-text-secondary',
            bg: 'bg-surface',
            border: 'border-border-default'
        };
        if (ready) return {
            icon: <CheckCircle className="w-5 h-5 text-green-500" />,
            text: t('sentiment.status.ready'),
            color: 'text-success-fg',
            bg: 'bg-success-bg',
            border: 'border-success-fg'
        };
        return {
            icon: <Brain className="w-5 h-5 text-yellow-500" />,
            text: t('sentiment.status.configuring'),
            color: 'text-warning-fg',
            bg: 'bg-warning-bg',
            border: 'border-warning-fg'
        };
    };

    const status = getStatusInfo();

    return (
        <div className="space-y-6">
            {/* Status Card */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border ${status.bg} ${status.border}`}
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        {status.icon}
                        <div>
                            <h3 className="font-medium text-text-primary">
                                {t('sentiment.analysis')}
                            </h3>
                            <p className={`text-sm ${status.color}`}>
                                {status.text}
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={() => onToggle(!enabled)}
                        disabled={loading}
                        variant={enabled ? "primary" : "outline"}
                        size="sm"
                        className="min-w-[80px]"
                    >
                        {enabled ? t('sentiment.buttons.enabled') : t('sentiment.buttons.enable')}
                    </Button>
                </div>

                {/* Statistics */}
                {enabled && (
                    <div className="flex items-center gap-4 text-sm text-text-secondary">
                        <div className="flex items-center gap-1">
                            <BarChart3 className="w-4 h-4" />
                            <span>{cardCount} {t('sentiment.stats.cards')}</span>
                        </div>
                        {ready && (
                            <div className="flex items-center gap-1">
                                <Zap className="w-4 h-4" />
                                <span>{t('sentiment.stats.realTimeAnalysis')}</span>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Error Display */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-3 bg-error-bg border border-error-fg rounded-lg"
                    >
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-error-fg mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm text-error-fg">{error}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Configuration */}
            {enabled && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    {/* Model Selection */}
                    <div className="bg-surface rounded-lg p-4 space-y-3">
                        <label
                            htmlFor={modelSelectId}
                            className="block text-sm font-medium text-text-secondary"
                        >
                            {t('sentiment.model')}
                        </label>
                        <select
                            id={modelSelectId}
                            value={config.modelId}
                            onChange={(e) => onConfigUpdate({ modelId: e.target.value })}
                            disabled={loading}
                            className="w-full px-3 py-2 border border-border-default rounded-lg bg-surface-raised text-text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {SENTIMENT_MODELS.map((model) => (
                                <option key={model.id} value={model.id}>
                                    {model.name} - {model.description}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-text-secondary">
                            {t('sentiment.settings.modelSelectedDescription')}
                        </p>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            onClick={() => onToggle(false)}
                            disabled={loading}
                            variant="outline"
                            size="sm"
                            className="h-10"
                        >
                            {t('sentiment.buttons.pauseAnalysis')}
                        </Button>
                        <Button
                            onClick={() => {/* Trigger reanalysis */ }}
                            disabled={loading || !ready}
                            variant="secondary"
                            size="sm"
                            className="h-10"
                        >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            {t('sentiment.buttons.reanalyze')}
                        </Button>
                    </div>

                    {/* Advanced Settings Toggle */}
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-text-secondary bg-surface-raised border border-border-default rounded-lg hover:bg-surface-raised transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            {t('sentiment.advancedSettings')}
                        </div>
                        {showAdvanced ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                    </button>

                    {/* Advanced Settings */}
                    <AnimatePresence>
                        {showAdvanced && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-surface rounded-lg p-4 space-y-4"
                            >
                                {/* Confidence Threshold */}
                                <div>
                                    <label
                                        htmlFor={thresholdId}
                                        className="block text-sm font-medium text-text-secondary mb-2"
                                    >
                                        {t('sentiment.confidenceThreshold')}: {(config.threshold * 100).toFixed(0)}%
                                    </label>
                                    <input
                                        id={thresholdId}
                                        type="range"
                                        min="0.1"
                                        max="1"
                                        step="0.1"
                                        value={config.threshold}
                                        onChange={(e) => onConfigUpdate({ threshold: parseFloat(e.target.value) })}
                                        disabled={loading}
                                        className="w-full h-2 bg-border-default rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-xs text-text-secondary mt-1">
                                        <span>{t('sentiment.settings.lowConfidence')}</span>
                                        <span>{t('sentiment.settings.highConfidence')}</span>
                                    </div>
                                </div>

                                {/* Batch Size */}
                                <div>
                                    <label
                                        htmlFor={batchSizeId}
                                        className="block text-sm font-medium text-text-secondary mb-2"
                                    >
                                        {t('sentiment.batchSize')}
                                    </label>
                                    <input
                                        id={batchSizeId}
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={config.batchSize}
                                        onChange={(e) => onConfigUpdate({ batchSize: parseInt(e.target.value) || 1 })}
                                        disabled={loading}
                                        className="w-full px-3 py-2 border border-border-default rounded-lg bg-surface-raised text-text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <p className="text-xs text-text-secondary mt-1">
                                        {t('sentiment.settings.batchSizeDescription')}
                                    </p>
                                </div>

                                {/* Auto Analysis */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-medium text-text-secondary">
                                            {t('sentiment.settings.autoAnalysis')}
                                        </h4>
                                        <p className="text-xs text-text-secondary">
                                            {t('sentiment.settings.autoAnalysisDescription')}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => onConfigUpdate({ enabled: !config.enabled })}
                                        disabled={loading}
                                        title="Activar/desactivar análisis automático"
                                        className={`
                                            relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out
                                            ${config.enabled ? 'bg-blue-600' : 'bg-border-default'}
                                        `}
                                    >
                                        <span
                                            className={`
                                                absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out
                                                ${config.enabled ? 'translate-x-5' : 'translate-x-0'}
                                            `}
                                        />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* Help Text */}
            <div className="text-xs text-text-muted bg-surface rounded-lg p-3">
                <p className="mb-1">
                    <strong>💡 {t('sentiment.help.tip')}</strong> {t('sentiment.help.description')}
                </p>
                <p>
                    {t('sentiment.help.autoUpdate')}
                </p>
            </div>
        </div>
    );
};

export default SentimentTab;
