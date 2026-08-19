import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TeamCreateForm from '@/features/teams/components/TeamCreateForm';

// 054-team-management, T011 (spec.md User Story 1 / FR-001, FR-002):
//
//   AC1: "Given an authenticated user on the team creation screen, When they submit
//   a team name only, Then the team is created and the user is shown as its owner."
//   AC2: "...When they submit a team name and a description, Then the team is
//   created with both the name and description stored and visible."
//   AC3: "...When they submit the form without a name, Then the system rejects the
//   submission and explains that a name is required."
//
// react-i18next and framer-motion are already mocked globally in src/test/setup.ts
// (t returns the raw key; motion.* map to plain host elements) — this file adds no
// extra mocks of its own.
//
// TeamCreateForm does not exist yet — this file is expected to fail with a
// "Cannot find module" / "Failed to resolve import" error until
// src/features/teams/components/TeamCreateForm.tsx is implemented (T017).
//
// Contract this test establishes for the not-yet-written component: it takes an
// `onCreate({ name, description? })` callback prop and owns its own client-side
// validation — it does not call the backend teams client directly (that stays the
// page's/hook's responsibility, per T015/T016/T018).
describe('TeamCreateForm', () => {
    const onCreate = vi.fn();

    beforeEach(() => {
        onCreate.mockReset();
    });

    it('shows an inline validation error and does not call onCreate when the name is empty (User Story 1 AC3)', async () => {
        const user = userEvent.setup();
        render(<TeamCreateForm onCreate={onCreate} />);

        await user.click(screen.getByRole('button', { name: 'teams.create.submit' }));

        expect(await screen.findByText('teams.create.nameRequired')).toBeInTheDocument();
        expect(onCreate).not.toHaveBeenCalled();
    });

    it('shows an inline validation error and does not call onCreate when the name is whitespace-only', async () => {
        const user = userEvent.setup();
        render(<TeamCreateForm onCreate={onCreate} />);

        await user.type(screen.getByLabelText('teams.create.nameLabel'), '   ');
        await user.click(screen.getByRole('button', { name: 'teams.create.submit' }));

        expect(await screen.findByText('teams.create.nameRequired')).toBeInTheDocument();
        expect(onCreate).not.toHaveBeenCalled();
    });

    it('calls onCreate with the entered name when no description is provided (User Story 1 AC1)', async () => {
        const user = userEvent.setup();
        render(<TeamCreateForm onCreate={onCreate} />);

        await user.type(screen.getByLabelText('teams.create.nameLabel'), 'Platform Team');
        await user.click(screen.getByRole('button', { name: 'teams.create.submit' }));

        expect(onCreate).toHaveBeenCalledTimes(1);
        expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Platform Team' }));
    });

    it('calls onCreate with both the entered name and description (User Story 1 AC2)', async () => {
        const user = userEvent.setup();
        render(<TeamCreateForm onCreate={onCreate} />);

        await user.type(screen.getByLabelText('teams.create.nameLabel'), 'Growth Team');
        await user.type(
            screen.getByLabelText('teams.create.descriptionLabel'),
            'Owns activation and retention',
        );
        await user.click(screen.getByRole('button', { name: 'teams.create.submit' }));

        expect(onCreate).toHaveBeenCalledTimes(1);
        expect(onCreate).toHaveBeenCalledWith({
            name: 'Growth Team',
            description: 'Owns activation and retention',
        });
    });

    it('does not block submission when the description is left empty (it is optional)', async () => {
        const user = userEvent.setup();
        render(<TeamCreateForm onCreate={onCreate} />);

        await user.type(screen.getByLabelText('teams.create.nameLabel'), 'Solo Team');
        await user.click(screen.getByRole('button', { name: 'teams.create.submit' }));

        expect(onCreate).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('teams.create.nameRequired')).not.toBeInTheDocument();
    });
});
