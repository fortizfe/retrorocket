import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CardHeader from '@/features/boards/retrospective/components/CardHeader';
import CardVoteControl from '@/features/boards/retrospective/components/CardVoteControl';

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'es' }),
}));

vi.mock('lucide-react', () => ({
    User: () => <span data-testid="user-icon" />,
    ThumbsUp: () => <span data-testid="thumb-icon" />,
}));

describe('CardHeader', () => {
    it('renders the author name and an optional badge', () => {
        render(<CardHeader author="Alice" badge={<span>badge!</span>} />);
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('badge!')).toBeInTheDocument();
    });

    it('uses semantic text tokens', () => {
        const { container } = render(<CardHeader author="Bob" />);
        expect(container.firstChild).toHaveClass('text-text-muted');
    });
});

describe('CardVoteControl', () => {
    it('shows the vote count and localized labels', () => {
        render(<CardVoteControl votes={4} onVote={vi.fn()} />);
        expect(screen.getByText('4')).toBeInTheDocument();
        expect(screen.getByLabelText('retrospective.card.voteUp')).toBeInTheDocument();
        expect(screen.getByLabelText('retrospective.card.voteDown')).toBeInTheDocument();
    });

    it('disables the down-vote at zero and calls onVote otherwise', async () => {
        const onVote = vi.fn();
        const { rerender } = render(<CardVoteControl votes={0} onVote={onVote} />);
        expect(screen.getByLabelText('retrospective.card.voteDown')).toBeDisabled();

        rerender(<CardVoteControl votes={2} onVote={onVote} />);
        await userEvent.click(screen.getByLabelText('retrospective.card.voteUp'));
        expect(onVote).toHaveBeenCalledWith(true);
        await userEvent.click(screen.getByLabelText('retrospective.card.voteDown'));
        expect(onVote).toHaveBeenCalledWith(false);
    });
});
