import React from 'react';
import { SentimentBadgeProps, SENTIMENT_COLORS } from '../../types/sentiment';
import { useLanguage } from '../../hooks/useLanguage';

const SentimentBadge: React.FC<SentimentBadgeProps> = React.memo(({
    sentiment,
    confidence,
    size = 'sm',
    showTooltip = true
}) => {
    const { t } = useLanguage();
    const colors = SENTIMENT_COLORS[sentiment];

    // Size classes
    const sizeClasses = {
        sm: 'text-xs px-1.5 py-0.5',
        md: 'text-sm px-2 py-1',
        lg: 'text-base px-2.5 py-1.5'
    };

    const confidencePercentage = Math.round(confidence * 100);

    // Show badge with lower threshold to include more neutral results
    // This allows neutral sentiments to be displayed more frequently
    if (confidence < 0.2) {
        return null;
    }

    // Get sentiment label
    const getSentimentLabel = () => {
        return t(`sentiment.${sentiment}`);
    };

    const badge = (
        <span
            className={`
                inline-flex items-center gap-1 rounded-full font-medium
                ${colors.bg} ${colors.text} ${colors.border} border
                ${sizeClasses[size]}
                transition-all duration-200
            `}
        >
            <span className="leading-none">{colors.icon}</span>
            <span className="capitalize leading-none">
                {getSentimentLabel()}
            </span>
        </span>
    );

    if (!showTooltip) {
        return badge;
    }

    return (
        <div
            className="relative group"
            title={t('sentiment.tooltip', {
                sentiment: getSentimentLabel().toLowerCase(),
                confidence: confidencePercentage
            })}
        >
            {badge}

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 
                          bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg
                          opacity-0 group-hover:opacity-100 transition-opacity duration-200
                          pointer-events-none whitespace-nowrap z-50">
                {t('sentiment.tooltip', {
                    sentiment: getSentimentLabel().toLowerCase(),
                    confidence: confidencePercentage
                })}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 
                              border-l-4 border-r-4 border-t-4 border-transparent 
                              border-t-gray-900 dark:border-t-gray-700" />
            </div>
        </div>
    );
});

SentimentBadge.displayName = 'SentimentBadge';

export default SentimentBadge;
