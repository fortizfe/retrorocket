import React, { useState } from 'react';
import { useKeyboardShortcut } from '@/lib/hooks/useKeyboardShortcut';
import { useFirebaseMetrics } from '@/lib/hooks/useFirebaseMetrics';

/**
 * Componente que muestra las métricas de Firebase en tiempo real
 * 
 * Principios SOLID aplicados:
 * - SRP: El componente se encarga únicamente de la presentación
 * - OCP: Extensible sin modificar el código existente
 * - DIP: Depende de abstracciones (hooks) en lugar de implementaciones concretas
 * 
 * Se puede mostrar/ocultar con Ctrl+Shift+M
 */
const MetricsDashboard: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const { metrics } = useFirebaseMetrics(5000); // Actualizar cada 5 segundos

    // Configurar atajo de teclado Ctrl+Shift+M
    useKeyboardShortcut(
        () => setIsVisible(prev => !prev),
        {
            key: 'm',
            ctrlKey: true,
            shiftKey: true,
            preventDefault: true,
        }
    );

    // No renderizar si las métricas no están disponibles o el panel está oculto
    if (!metrics || !isVisible) {
        return null;
    }

    const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
        if (value <= thresholds.good) return 'text-green-600';
        if (value <= thresholds.warning) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getCacheHitRateColor = (rate: number) => {
        if (rate > 0.8) return 'text-green-600';
        if (rate > 0.6) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getErrorRateColor = (rate: number) => {
        if (rate < 0.02) return 'text-green-600';
        if (rate < 0.05) return 'text-yellow-600';
        return 'text-red-600';
    };

    const formatUptime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = Math.floor(minutes % 60);
        return `${hours}h ${mins}m`;
    };

    return (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 text-xs font-mono max-w-sm z-50">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-sm text-gray-800">🔥 Firebase Metrics</h3>
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-gray-400 hover:text-gray-600"
                >
                    ×
                </button>
            </div>

            <div className="space-y-1">
                <div className="flex justify-between">
                    <span>Uptime:</span>
                    <span className="text-blue-600">{formatUptime(metrics.uptime)}</span>
                </div>

                <div className="flex justify-between">
                    <span>Reads/min:</span>
                    <span className={getStatusColor(metrics.averageReadsPerMinute, { good: 30, warning: 60 })}>
                        {metrics.averageReadsPerMinute.toFixed(1)}
                    </span>
                </div>

                <div className="flex justify-between">
                    <span>Writes/min:</span>
                    <span className={getStatusColor(metrics.averageWritesPerMinute, { good: 20, warning: 40 })}>
                        {metrics.averageWritesPerMinute.toFixed(1)}
                    </span>
                </div>

                <div className="flex justify-between">
                    <span>Active Listeners:</span>
                    <span className={getStatusColor(metrics.summary.listeners, { good: 5, warning: 15 })}>
                        {metrics.summary.listeners}
                    </span>
                </div>

                <div className="flex justify-between">
                    <span>Cache Hit Rate:</span>
                    <span className={getCacheHitRateColor(metrics.cacheHitRate)}>
                        {(metrics.cacheHitRate * 100).toFixed(1)}%
                    </span>
                </div>

                <div className="flex justify-between">
                    <span>Error Rate:</span>
                    <span className={getErrorRateColor(metrics.errorRate)}>
                        {(metrics.errorRate * 100).toFixed(2)}%
                    </span>
                </div>

                <div className="border-t pt-1 mt-2 text-gray-500">
                    <div className="flex justify-between">
                        <span>Total Reads:</span>
                        <span>{metrics.summary.reads}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Total Writes:</span>
                        <span>{metrics.summary.writes}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Total Errors:</span>
                        <span>{metrics.summary.errors}</span>
                    </div>
                </div>
            </div>

            {import.meta.env.DEV && (
                <div className="mt-2 text-xs text-gray-400">
                    Press Ctrl+Shift+M to toggle
                </div>
            )}
        </div>
    );
};

export default MetricsDashboard;
