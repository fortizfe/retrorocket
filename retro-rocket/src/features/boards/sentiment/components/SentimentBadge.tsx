import React from 'react';
import { TFunction } from 'i18next';
import { SentimentBadgeProps, SENTIMENT_COLORS, SentimentType } from '@/features/boards/types/sentiment';
import { useLanguage } from '@/lib/hooks/useLanguage';

const SENTIMENT_CYCLE: SentimentType[] = ['positive', 'neutral', 'negative'];

function nextSentiment(current: SentimentType): SentimentType {
    return SENTIMENT_CYCLE[(SENTIMENT_CYCLE.indexOf(current) + 1) % SENTIMENT_CYCLE.length];
}

function buildTooltip(t: TFunction, sentiment: SentimentType, confidence: number, isOverride: boolean): string {
    const base = t('sentiment.tooltip', {
        sentiment: t(`sentiment.${sentiment}`).toLowerCase(),
        confidence: Math.round(confidence * 100),
    });
    const suffix = isOverride ? ' (' + t('sentiment.overridden') + ')' : '';
    return base + suffix;
}

const SIZE_CLASSES = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-2.5 py-1.5',
};

const SentimentBadge: React.FC<SentimentBadgeProps> = React.memo(({
    sentiment,
    confidence,
    size = 'sm',
    showTooltip = true,
    isOverride = false,
    canOverride = false,
    onOverride,
}) => {
    const { t } = useLanguage();

    if (confidence < 0.2) return null;

    const colors = SENTIMENT_COLORS[sentiment];
    const tooltip = showTooltip ? buildTooltip(t, sentiment, confidence, isOverride) : undefined;
    const badgeClass = `inline-flex items-center gap-1 rounded-full font-medium border ${colors.bg} ${colors.text} ${colors.border} ${SIZE_CLASSES[size]} transition-all duration-200`;

    const content = (
        <>
            <span className="leading-none">{colors.icon}</span>
            <span className="capitalize leading-none">{t(`sentiment.${sentiment}`)}</span>
            {isOverride && <span className="leading-none opacity-70">✏️</span>}
        </>
    );

    if (canOverride && onOverride) {
        return (
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOverride(nextSentiment(sentiment)); }}
                className={`${badgeClass} cursor-pointer hover:opacity-80`}
                title={tooltip}
            >
                {content}
            </button>
        );
    }

    return (
        <span className={badgeClass} title={tooltip}>
            {content}
        </span>
    );
});

SentimentBadge.displayName = 'SentimentBadge';

export default SentimentBadge;
