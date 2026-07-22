import React from 'react';
import { ThumbsUp } from 'lucide-react';
import { useLanguage } from '@/lib/hooks/useLanguage';

interface CardVoteControlProps {
    votes: number;
    onVote: (increment: boolean) => void;
}

/**
 * Vote up/down pill with the current count. Down-vote is disabled at zero. Labels
 * are localized; colors come from semantic tokens with a visible focus ring.
 */
const CardVoteControl: React.FC<CardVoteControlProps> = ({ votes, onVote }) => {
    const { t } = useLanguage();
    return (
        <div className="flex items-center gap-1 bg-surface rounded-full px-2 py-0.5">
            <button
                type="button"
                onClick={() => onVote(true)}
                className="text-text-secondary hover:text-info-fg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-full"
                aria-label={t('retrospective.card.voteUp')}
            >
                <ThumbsUp size={12} />
            </button>
            <span className="text-xs font-medium text-text-secondary">{votes}</span>
            <button
                type="button"
                onClick={() => onVote(false)}
                className="text-text-secondary hover:text-error-fg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded-full disabled:opacity-40"
                aria-label={t('retrospective.card.voteDown')}
                disabled={votes === 0}
            >
                <ThumbsUp size={12} className="rotate-180" />
            </button>
        </div>
    );
};

export default CardVoteControl;
