/**
 * Barra de progreso para mostrar distribución de sentimientos
 * Evita el uso de estilos inline usando clases CSS dinámicas
 */

import React from 'react';

interface SentimentProgressBarProps {
    positivePercentage: number;
    neutralPercentage: number;
    negativePercentage: number;
}

const SentimentProgressBar: React.FC<SentimentProgressBarProps> = ({
    positivePercentage,
    neutralPercentage,
    negativePercentage
}) => {
    // Crear segmentos basados en porcentajes
    const segments = [
        { type: 'positive', percentage: positivePercentage, className: 'bg-green-500' },
        { type: 'neutral', percentage: neutralPercentage, className: 'bg-slate-400' },
        { type: 'negative', percentage: negativePercentage, className: 'bg-red-500' }
    ].filter(segment => segment.percentage > 0);

    return (
        <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2 mb-2 overflow-hidden">
            <div className="h-full flex">
                {segments.map((segment) => (
                    <div
                        key={segment.type}
                        className={`${segment.className} transition-all duration-300 h-full`}
                        style={{
                            width: `${segment.percentage}%`
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default SentimentProgressBar;
