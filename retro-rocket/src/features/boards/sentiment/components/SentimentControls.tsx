import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Settings, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import Button from '@/lib/components/ui/Button';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { SentimentConfiguration, SENTIMENT_MODELS } from '@/features/boards/types/sentiment';

interface SentimentControlsProps {
    enabled: boolean;
    ready: boolean;
    loading: boolean;
    error?: string;
    config: SentimentConfiguration;
    onToggle: (enabled: boolean) => void;
    onConfigUpdate: (updates: Partial<SentimentConfiguration>) => void;
    cardCount: number;
}

const SentimentControls: React.FC<SentimentControlsProps> = ({
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
    const [showAdvanced, setShowAdvanced] = React.useState(false);

    // Generate unique IDs for form elements
    const modelSelectId = React.useId();
    const thresholdId = React.useId();
    const batchSizeId = React.useId();

    const getStatusIcon = () => {
        if (loading) return <Loader className="w-4 h-4 animate-spin" />;
        if (error) return <AlertCircle className="w-4 h-4 text-red-500" />;
        if (ready) return <CheckCircle className="w-4 h-4 text-green-500" />;
        return <Brain className="w-4 h-4" />;
    };

    const getStatusText = () => {
        if (!enabled) return 'Desactivado';
        if (loading) return 'Inicializando...';
        if (error) return 'Error de conexión';
        if (ready) return 'Listo para análisis';
        return 'Configurando...';
    };

    const getStatusColor = () => {
        if (!enabled) return 'text-text-muted';
        if (loading) return 'text-info-fg';
        if (error) return 'text-error-fg';
        if (ready) return 'text-success-fg';
        return 'text-text-secondary';
    };

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-text-primary">
                        Análisis de Sentimientos
                    </span>
                </div>

                {/* Toggle Switch */}
                <button
                    onClick={() => onToggle(!enabled)}
                    className={`
                        relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                        ${enabled
                            ? 'bg-purple-600'
                            : 'bg-border-default'
                        }
                    `}
                    aria-label={enabled ? 'Desactivar análisis' : 'Activar análisis'}
                >
                    <span
                        className={`
                            inline-block h-3 w-3 rounded-full bg-white transition-transform
                            ${enabled ? 'translate-x-5' : 'translate-x-1'}
                        `}
                    />
                </button>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 text-sm">
                {getStatusIcon()}
                <span className={getStatusColor()}>
                    {getStatusText()}
                </span>
                {ready && cardCount > 0 && (
                    <span className="text-text-muted text-xs">
                        • {cardCount} tarjetas para analizar
                    </span>
                )}
            </div>

            {/* Error Message */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-xs text-error-fg bg-error-bg 
                                 p-2 rounded border border-error-fg"
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Description */}
            {enabled && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-text-muted space-y-1"
                >
                    <p>
                        🎯 Detecta automáticamente el sentimiento de las tarjetas (positivo, negativo, neutral)
                    </p>
                    <p>
                        🌍 Compatible con español e inglés • 🔒 100% privado (no envía datos externos)
                    </p>
                    <p>
                        ⚡ Umbrales optimizados: neutrales más permisivos para mejor análisis
                    </p>
                </motion.div>
            )}

            {/* Advanced Settings */}
            {enabled && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-2"
                >
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-xs p-1 h-auto"
                    >
                        <Settings className="w-3 h-3 mr-1" />
                        Configuración avanzada
                    </Button>

                    <AnimatePresence>
                        {showAdvanced && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-3 bg-surface p-3 rounded-lg border 
                                         border-border-default"
                            >
                                {/* Model Selection */}
                                <div>
                                    <label htmlFor={modelSelectId} className="block text-xs font-medium text-text-secondary mb-1">
                                        Modelo de IA
                                    </label>
                                    <select
                                        id={modelSelectId}
                                        value={config.modelId}
                                        onChange={(e) => onConfigUpdate({ modelId: e.target.value })}
                                        className="w-full text-xs p-2 border border-border-strong 
                                                 rounded bg-surface-raised text-text-primary"
                                        disabled={loading}
                                        title="Seleccionar modelo de IA para análisis de sentimientos"
                                    >
                                        {SENTIMENT_MODELS.map(model => (
                                            <option key={model.id} value={model.id}>
                                                {model.name} {model.primary ? '(Recomendado)' : '(Alternativo)'}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-text-muted mt-1">
                                        {SENTIMENT_MODELS.find(m => m.id === config.modelId)?.description}
                                    </p>
                                </div>

                                {/* Confidence Threshold */}
                                <div>
                                    <label htmlFor={thresholdId} className="block text-xs font-medium text-text-secondary mb-1">
                                        Umbral de confianza: {Math.round(config.threshold * 100)}%
                                    </label>
                                    <input
                                        id={thresholdId}
                                        type="range"
                                        min="0.3"
                                        max="0.9"
                                        step="0.1"
                                        value={config.threshold}
                                        onChange={(e) => onConfigUpdate({ threshold: parseFloat(e.target.value) })}
                                        className="w-full h-2 bg-border-default rounded-lg appearance-none cursor-pointer"
                                        disabled={loading}
                                        title={`Umbral de confianza: ${Math.round(config.threshold * 100)}%`}
                                        aria-label={`Umbral de confianza: ${Math.round(config.threshold * 100)}%`}
                                    />
                                    <p className="text-xs text-text-muted mt-1">
                                        Solo mostrar resultados con alta confianza
                                    </p>
                                </div>

                                {/* Batch Size */}
                                <div>
                                    <label htmlFor={batchSizeId} className="block text-xs font-medium text-text-secondary mb-1">
                                        Tarjetas por lote: {config.batchSize}
                                    </label>
                                    <input
                                        id={batchSizeId}
                                        type="range"
                                        min="1"
                                        max="10"
                                        step="1"
                                        value={config.batchSize}
                                        onChange={(e) => onConfigUpdate({ batchSize: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-border-default rounded-lg appearance-none cursor-pointer"
                                        disabled={loading}
                                        title={`Tarjetas por lote: ${config.batchSize}`}
                                        aria-label={`Tarjetas por lote: ${config.batchSize}`}
                                    />
                                    <p className="text-xs text-text-muted mt-1">
                                        Controla la velocidad de procesamiento
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* Quick Actions */}
            {enabled && ready && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="pt-2 border-t border-border-default"
                >
                    <div className="text-xs text-text-muted">
                        💡 Los badges de sentimiento aparecerán automáticamente en las tarjetas
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default SentimentControls;
