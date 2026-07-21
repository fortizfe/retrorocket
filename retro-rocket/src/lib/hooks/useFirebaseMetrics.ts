import { useState, useEffect } from 'react';
import { FirebaseMetricsService } from '@/lib/services/FirebaseMetricsService';

interface MetricsData {
    summary: {
        reads: number;
        writes: number;
        listeners: number;
        errors: number;
        cacheHits: number;
        cacheMisses: number;
    };
    uptime: number;
    averageReadsPerMinute: number;
    averageWritesPerMinute: number;
    errorRate: number;
    cacheHitRate: number;
}

/**
 * Hook personalizado para manejar los datos de métricas de Firebase
 * Principio de Responsabilidad Única: Se encarga únicamente de la lógica de datos
 * Principio de Inversión de Dependencias: Depende de abstracciones (FirebaseMetricsService)
 * 
 * @param updateInterval - Intervalo de actualización en milisegundos (por defecto 5000ms)
 */
export function useFirebaseMetrics(updateInterval: number = 5000) {
    const [metrics, setMetrics] = useState<MetricsData | null>(null);

    useEffect(() => {
        const updateMetrics = () => {
            try {
                const newMetrics = FirebaseMetricsService.getMetrics();
                setMetrics(newMetrics);
            } catch (error) {
                console.warn('Error updating Firebase metrics:', error);
                // Optionally set metrics to null on error
                setMetrics(null);
            }
        };

        // Actualización inicial
        updateMetrics();

        // Configurar intervalo de actualización
        const interval = setInterval(updateMetrics, updateInterval);

        // Cleanup
        return () => clearInterval(interval);
    }, [updateInterval]);

    return { metrics };
}
