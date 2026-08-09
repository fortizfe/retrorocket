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
        { type: 'positive', percentage: positivePercentage, className: 'bg-success-fg' },
        { type: 'neutral', percentage: neutralPercentage, className: 'bg-text-muted' },
        { type: 'negative', percentage: negativePercentage, className: 'bg-error-fg' }
    ].filter(segment => segment.percentage > 0);

    return (
        <div className="w-full bg-border-default rounded-full h-2 mb-2 overflow-hidden">
            <div className="h-full flex">
                {segments.map((segment) => (
                    <div
                        key={segment.type}
                        className={`${segment.className} transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] h-full`}
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
