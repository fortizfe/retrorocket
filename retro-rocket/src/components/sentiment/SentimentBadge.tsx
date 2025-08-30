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

    return (
        <span
            className={`
                inline-flex items-center gap-1 rounded-full font-medium
                ${colors.bg} ${colors.text} ${colors.border} border
                ${sizeClasses[size]}
                transition-all duration-200
            `}
            title={showTooltip ? t('sentiment.tooltip', {
                sentiment: getSentimentLabel().toLowerCase(),
                confidence: confidencePercentage
            }) : undefined}
        >
            <span className="leading-none">{colors.icon}</span>
            <span className="capitalize leading-none">
                {getSentimentLabel()}
            </span>
        </span>
    );
});

SentimentBadge.displayName = 'SentimentBadge';

export default SentimentBadge;
