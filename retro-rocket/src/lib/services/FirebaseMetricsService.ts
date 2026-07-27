/**
 * Servicio de métricas para monitorear el uso de Firebase y detectar oportunidades de optimización
 */
export class FirebaseMetricsService {
    private static readonly metrics = {
        reads: 0,
        writes: 0,
        listeners: 0,
        errors: 0,
        cacheHits: 0,
        cacheMisses: 0,
    };

    private static readonly operationCosts = new Map<string, number>();
    private static readonly operationCounts = new Map<string, number>();
    private static readonly errorCounts = new Map<string, number>();

    private static startTime = Date.now();

    /**
     * Registrar una operación de lectura
     * @param operation - Nombre de la operación
     * @param documentsRead - Número de documentos leídos
     */
    static recordRead(operation: string, documentsRead: number = 1): void {
        this.metrics.reads += documentsRead;
        this.recordOperation(operation, documentsRead);
    }

    /**
     * Registrar una operación de escritura
     * @param operation - Nombre de la operación
     * @param documentsWritten - Número de documentos escritos
     */
    static recordWrite(operation: string, documentsWritten: number = 1): void {
        this.metrics.writes += documentsWritten;
        this.recordOperation(operation, documentsWritten);
    }

    /**
     * Registrar un listener activo
     * @param operation - Nombre de la operación del listener
     */
    static recordListener(operation: string): void {
        this.metrics.listeners++;
        this.recordOperation(operation, 1);
    }

    /**
     * Registrar un error
     * @param operation - Operación que falló
     * @param error - Error ocurrido
     */
    static recordError(operation: string, error: Error): void {
        this.metrics.errors++;
        const errorKey = `${operation}:${error.message}`;
        this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
    }

    /**
     * Registrar hit de caché
     * @param cacheType - Tipo de caché (user-profiles, etc.)
     */
    static recordCacheHit(cacheType: string): void {
        this.metrics.cacheHits++;
        this.recordOperation(`cache-hit-${cacheType}`, 1);
    }

    /**
     * Registrar miss de caché
     * @param cacheType - Tipo de caché
     */
    static recordCacheMiss(cacheType: string): void {
        this.metrics.cacheMisses++;
        this.recordOperation(`cache-miss-${cacheType}`, 1);
    }

    /**
     * Registrar operación genérica
     * @param operation - Nombre de la operación
     * @param cost - Costo de la operación
     */
    private static recordOperation(operation: string, cost: number): void {
        this.operationCosts.set(operation, (this.operationCosts.get(operation) || 0) + cost);
        this.operationCounts.set(operation, (this.operationCounts.get(operation) || 0) + 1);
    }

    /**
     * Obtener métricas resumidas
     */
    static getMetrics(): {
        summary: typeof FirebaseMetricsService.metrics;
        uptime: number;
        averageReadsPerMinute: number;
        averageWritesPerMinute: number;
        errorRate: number;
        cacheHitRate: number;
    } {
        const uptimeMinutes = (Date.now() - this.startTime) / 60000;
        const totalOperations = this.metrics.reads + this.metrics.writes;
        const totalCacheOperations = this.metrics.cacheHits + this.metrics.cacheMisses;

        return {
            summary: { ...this.metrics },
            uptime: uptimeMinutes,
            averageReadsPerMinute: uptimeMinutes > 0 ? this.metrics.reads / uptimeMinutes : 0,
            averageWritesPerMinute: uptimeMinutes > 0 ? this.metrics.writes / uptimeMinutes : 0,
            errorRate: totalOperations > 0 ? this.metrics.errors / totalOperations : 0,
            cacheHitRate: totalCacheOperations > 0 ? this.metrics.cacheHits / totalCacheOperations : 0,
        };
    }

    /**
     * Obtener las operaciones más costosas
     * @param limit - Número de operaciones a retornar
     */
    static getMostExpensiveOperations(limit: number = 10): Array<{
        operation: string;
        totalCost: number;
        count: number;
        averageCost: number;
    }> {
        return Array.from(this.operationCosts.entries())
            .map(([operation, totalCost]) => ({
                operation,
                totalCost,
                count: this.operationCounts.get(operation) || 0,
                averageCost: totalCost / (this.operationCounts.get(operation) || 1),
            }))
            .sort((a, b) => b.totalCost - a.totalCost)
            .slice(0, limit);
    }

    /**
     * Obtener errores más frecuentes
     * @param limit - Número de errores a retornar
     */
    static getMostFrequentErrors(limit: number = 5): Array<{
        error: string;
        count: number;
    }> {
        return Array.from(this.errorCounts.entries())
            .map(([error, count]) => ({ error, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    /**
     * Generar reporte de optimización
     */
    static generateOptimizationReport(): {
        recommendations: string[];
        warnings: string[];
        metrics: ReturnType<typeof FirebaseMetricsService.getMetrics>;
    } {
        const metrics = this.getMetrics();
        const recommendations: string[] = [];
        const warnings: string[] = [];

        // Analizar tasa de lectura
        if (metrics.averageReadsPerMinute > 100) {
            warnings.push(`Alta tasa de lecturas: ${metrics.averageReadsPerMinute.toFixed(1)} lecturas/min`);
            recommendations.push('Considere implementar caché local o reducir frecuencia de consultas');
        }

        // Analizar tasa de escritura
        if (metrics.averageWritesPerMinute > 50) {
            warnings.push(`Alta tasa de escrituras: ${metrics.averageWritesPerMinute.toFixed(1)} escrituras/min`);
            recommendations.push('Considere implementar debouncing o batch writes');
        }

        // Analizar tasa de errores
        if (metrics.errorRate > 0.05) {
            warnings.push(`Alta tasa de errores: ${(metrics.errorRate * 100).toFixed(1)}%`);
            recommendations.push('Revisar manejo de errores y conectividad');
        }

        // Analizar eficiencia de caché
        if (metrics.cacheHitRate < 0.8 && metrics.cacheHitRate > 0) {
            warnings.push(`Baja eficiencia de caché: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);
            recommendations.push('Optimizar estrategia de caché o aumentar TTL');
        }

        // Analizar número de listeners
        if (metrics.summary.listeners > 20) {
            warnings.push(`Muchos listeners activos: ${metrics.summary.listeners}`);
            recommendations.push('Implementar gestión centralizada de listeners');
        }

        return {
            recommendations,
            warnings,
            metrics,
        };
    }

    /**
     * Exportar métricas en formato CSV
     */
    static exportMetricsCSV(): string {
        const operations = this.getMostExpensiveOperations(50);
        const headers = ['Operation', 'Total Cost', 'Count', 'Average Cost'];
        const rows = operations.map(op =>
            [op.operation, op.totalCost, op.count, op.averageCost.toFixed(2)].join(',')
        );

        return [headers.join(','), ...rows].join('\n');
    }

    /**
     * Resetear todas las métricas
     */
    static reset(): void {
        (Object.keys(this.metrics) as (keyof typeof FirebaseMetricsService.metrics)[]).forEach(key => {
            this.metrics[key] = 0;
        });
        this.operationCosts.clear();
        this.operationCounts.clear();
        this.errorCounts.clear();
        this.startTime = Date.now();
    }

    /**
     * Configurar alerta automática para consumo excesivo
     * @param thresholds - Umbrales para disparar alertas
     * @param callback - Función a llamar cuando se supere un umbral
     */
    static setupAlerts(
        thresholds: {
            readsPerMinute?: number;
            writesPerMinute?: number;
            errorRate?: number;
        },
        callback: (alert: { type: string; value: number; threshold: number }) => void
    ): () => void {
        const checkInterval = setInterval(() => {
            const metrics = this.getMetrics();

            if (thresholds.readsPerMinute && metrics.averageReadsPerMinute > thresholds.readsPerMinute) {
                callback({
                    type: 'reads',
                    value: metrics.averageReadsPerMinute,
                    threshold: thresholds.readsPerMinute
                });
            }

            if (thresholds.writesPerMinute && metrics.averageWritesPerMinute > thresholds.writesPerMinute) {
                callback({
                    type: 'writes',
                    value: metrics.averageWritesPerMinute,
                    threshold: thresholds.writesPerMinute
                });
            }

            if (thresholds.errorRate && metrics.errorRate > thresholds.errorRate) {
                callback({
                    type: 'errors',
                    value: metrics.errorRate,
                    threshold: thresholds.errorRate
                });
            }
        }, 60000); // Check every minute

        return () => clearInterval(checkInterval);
    }
}
