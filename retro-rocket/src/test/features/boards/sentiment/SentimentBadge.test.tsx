import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SentimentBadge from '@/features/boards/sentiment/components/SentimentBadge';

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({
        t: (key: string, opts?: Record<string, unknown>) => {
            if (key === 'sentiment.tooltip') return `${opts?.sentiment} sentiment with ${opts?.confidence}% confidence`;
            if (key.startsWith('sentiment.')) return key.replace('sentiment.', '');
            return key;
        },
    }),
}));

describe('SentimentBadge', () => {
    it('renders nothing below the confidence floor (FR-004)', () => {
        const { container } = render(<SentimentBadge sentiment="positive" confidence={0.1} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders the sentiment label and icon as a static badge by default', () => {
        render(<SentimentBadge sentiment="positive" confidence={0.9} />);
        expect(screen.getByText('positive')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders as an interactive button when canOverride is set, cycling to the next sentiment on click', () => {
        const onOverride = vi.fn();
        render(<SentimentBadge sentiment="positive" confidence={0.9} canOverride onOverride={onOverride} />);

        fireEvent.click(screen.getByRole('button'));
        expect(onOverride).toHaveBeenCalledWith('neutral');
    });

    it('shows the override marker when isOverride is true', () => {
        render(<SentimentBadge sentiment="negative" confidence={0.9} isOverride />);
        expect(screen.getByText('✏️')).toBeInTheDocument();
    });
});
