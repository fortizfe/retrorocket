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
import Button from '../ui/Button';
import { useLanguage } from '../../hooks/useLanguage';
import { SentimentConfiguration, SENTIMENT_MODELS } from '../../types/sentiment';

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
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            border: 'border-blue-200 dark:border-blue-800'
        };
        if (error) return {
            icon: <AlertCircle className="w-5 h-5 text-red-500" />,
            text: t('sentiment.status.connectionError'),
            color: 'text-red-600 dark:text-red-400',
            bg: 'bg-red-50 dark:bg-red-900/20',
            border: 'border-red-200 dark:border-red-800'
        };
        if (!enabled) return {
            icon: <Brain className="w-5 h-5 text-slate-400" />,
            text: t('sentiment.status.disabled'),
            color: 'text-slate-600 dark:text-slate-400',
            bg: 'bg-slate-50 dark:bg-slate-700/50',
            border: 'border-slate-200 dark:border-slate-600'
        };
        if (ready) return {
            icon: <CheckCircle className="w-5 h-5 text-green-500" />,
            text: t('sentiment.status.ready'),
            color: 'text-green-600 dark:text-green-400',
            bg: 'bg-green-50 dark:bg-green-900/20',
            border: 'border-green-200 dark:border-green-800'
        };
        return {
            icon: <Brain className="w-5 h-5 text-yellow-500" />,
            text: t('sentiment.status.configuring'),
            color: 'text-yellow-600 dark:text-yellow-400',
            bg: 'bg-yellow-50 dark:bg-yellow-900/20',
            border: 'border-yellow-200 dark:border-yellow-800'
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
                            <h3 className="font-medium text-slate-900 dark:text-slate-100">
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
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
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
                        className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
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
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
                        <label
                            htmlFor={modelSelectId}
                            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                            {t('sentiment.model')}
                        </label>
                        <select
                            id={modelSelectId}
                            value={config.modelId}
                            onChange={(e) => onConfigUpdate({ modelId: e.target.value })}
                            disabled={loading}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {SENTIMENT_MODELS.map((model) => (
                                <option key={model.id} value={model.id}>
                                    {model.name} - {model.description}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
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
                        className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
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
                                className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-4"
                            >
                                {/* Confidence Threshold */}
                                <div>
                                    <label
                                        htmlFor={thresholdId}
                                        className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
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
                                        className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mt-1">
                                        <span>{t('sentiment.settings.lowConfidence')}</span>
                                        <span>{t('sentiment.settings.highConfidence')}</span>
                                    </div>
                                </div>

                                {/* Batch Size */}
                                <div>
                                    <label
                                        htmlFor={batchSizeId}
                                        className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
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
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                        {t('sentiment.settings.batchSizeDescription')}
                                    </p>
                                </div>

                                {/* Auto Analysis */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            {t('sentiment.settings.autoAnalysis')}
                                        </h4>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            {t('sentiment.settings.autoAnalysisDescription')}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => onConfigUpdate({ enabled: !config.enabled })}
                                        disabled={loading}
                                        title="Activar/desactivar análisis automático"
                                        className={`
                                            relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out
                                            ${config.enabled ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'}
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
            <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3">
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
