import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CardVoteControl from '@/features/boards/retrospective/components/CardVoteControl';

describe('CardVoteControl', () => {
    it('renders the current vote count', () => {
        render(<CardVoteControl votes={3} onVote={vi.fn()} />);
        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('calls onVote(true) when the up-vote button is clicked', async () => {
        const user = userEvent.setup();
        const onVote = vi.fn();
        render(<CardVoteControl votes={1} onVote={onVote} />);

        await user.click(screen.getByLabelText('retrospective.card.voteUp'));

        expect(onVote).toHaveBeenCalledWith(true);
    });

    it('calls onVote(false) when the down-vote button is clicked', async () => {
        const user = userEvent.setup();
        const onVote = vi.fn();
        render(<CardVoteControl votes={1} onVote={onVote} />);

        await user.click(screen.getByLabelText('retrospective.card.voteDown'));

        expect(onVote).toHaveBeenCalledWith(false);
    });

    it('disables the down-vote button at zero votes', () => {
        render(<CardVoteControl votes={0} onVote={vi.fn()} />);
        expect(screen.getByLabelText('retrospective.card.voteDown')).toBeDisabled();
    });

    it('gives both vote buttons subtle press feedback (design audit finding, spec 028: previously zero press feedback on a frequently-clicked control)', () => {
        render(<CardVoteControl votes={1} onVote={vi.fn()} />);

        expect(screen.getByLabelText('retrospective.card.voteUp')).toHaveClass('active:scale-95');
        expect(screen.getByLabelText('retrospective.card.voteDown')).toHaveClass('active:scale-95');
    });
});
