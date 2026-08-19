import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AddMemberByEmailForm from '@/features/teams/components/AddMemberByEmailForm';
import { TeamApiError } from '@/features/teams/services/backendTeamsClient';
import type { TeamMember } from '@/features/teams/types/team';

// 054-team-management, T036 (User Story 2 — "Owner manages team membership").
//
// react-i18next and framer-motion are already mocked globally in src/test/setup.ts
// (t returns the raw key) — this file adds no extra mocks of its own beyond the
// onAdd prop, matching TeamCreateForm.test.tsx's convention.
//
// Contract under test (per the component's own doc comment): `onAdd(email)` either
// resolves with the new TeamMember, or throws a TeamApiError whose `.code` selects a
// specific inline message — `user_not_found` vs `conflict` render distinct copy, never
// a single generic failure string.

const newMember: TeamMember = {
    userId: 'u2',
    displayName: 'New Member',
    email: 'new@example.com',
    photoURL: null,
    role: 'member',
    joinedAt: new Date('2026-01-05'),
};

describe('AddMemberByEmailForm', () => {
    const onAdd = vi.fn();

    beforeEach(() => {
        onAdd.mockReset();
    });

    it('shows an inline validation error and does not call onAdd when the email is empty', async () => {
        const user = userEvent.setup();
        render(<AddMemberByEmailForm onAdd={onAdd} />);

        await user.click(screen.getByRole('button', { name: 'teams.members.addSubmit' }));

        expect(await screen.findByText('teams.members.emailRequired')).toBeInTheDocument();
        expect(onAdd).not.toHaveBeenCalled();
    });

    it('shows an inline validation error and does not call onAdd when the email is malformed', async () => {
        const user = userEvent.setup();
        render(<AddMemberByEmailForm onAdd={onAdd} />);

        await user.type(screen.getByLabelText('teams.members.addLabel'), 'not-an-email');
        await user.click(screen.getByRole('button', { name: 'teams.members.addSubmit' }));

        expect(await screen.findByText('teams.members.emailInvalid')).toBeInTheDocument();
        expect(onAdd).not.toHaveBeenCalled();
    });

    it('calls onAdd with the trimmed email and clears the field on success', async () => {
        onAdd.mockResolvedValue(newMember);
        const user = userEvent.setup();
        render(<AddMemberByEmailForm onAdd={onAdd} />);

        const input = screen.getByLabelText('teams.members.addLabel') as HTMLInputElement;
        await user.type(input, '  new@example.com  ');
        await user.click(screen.getByRole('button', { name: 'teams.members.addSubmit' }));

        expect(onAdd).toHaveBeenCalledTimes(1);
        expect(onAdd).toHaveBeenCalledWith('new@example.com');
        expect(await screen.findByLabelText('teams.members.addLabel')).toHaveValue('');
    });

    it('renders the "no account found" message for a user_not_found TeamApiError, distinct from other errors', async () => {
        onAdd.mockRejectedValue(new TeamApiError('user_not_found', 'no account'));
        const user = userEvent.setup();
        render(<AddMemberByEmailForm onAdd={onAdd} />);

        await user.type(screen.getByLabelText('teams.members.addLabel'), 'ghost@example.com');
        await user.click(screen.getByRole('button', { name: 'teams.members.addSubmit' }));

        expect(await screen.findByText('teams.members.addNotFoundError')).toBeInTheDocument();
        expect(screen.queryByText('teams.members.addDuplicateError')).not.toBeInTheDocument();
        expect(screen.queryByText('teams.members.addGenericError')).not.toBeInTheDocument();
    });

    it('renders the "already a member" message for a conflict TeamApiError, distinct from other errors', async () => {
        onAdd.mockRejectedValue(new TeamApiError('conflict', 'already a member'));
        const user = userEvent.setup();
        render(<AddMemberByEmailForm onAdd={onAdd} />);

        await user.type(screen.getByLabelText('teams.members.addLabel'), 'existing@example.com');
        await user.click(screen.getByRole('button', { name: 'teams.members.addSubmit' }));

        expect(await screen.findByText('teams.members.addDuplicateError')).toBeInTheDocument();
        expect(screen.queryByText('teams.members.addNotFoundError')).not.toBeInTheDocument();
        expect(screen.queryByText('teams.members.addGenericError')).not.toBeInTheDocument();
    });

    it('renders the generic error message for a non-TeamApiError failure', async () => {
        onAdd.mockRejectedValue(new Error('network down'));
        const user = userEvent.setup();
        render(<AddMemberByEmailForm onAdd={onAdd} />);

        await user.type(screen.getByLabelText('teams.members.addLabel'), 'someone@example.com');
        await user.click(screen.getByRole('button', { name: 'teams.members.addSubmit' }));

        expect(await screen.findByText('teams.members.addGenericError')).toBeInTheDocument();
    });

    it('clears a prior error as soon as the user edits the email again', async () => {
        const user = userEvent.setup();
        render(<AddMemberByEmailForm onAdd={onAdd} />);

        await user.click(screen.getByRole('button', { name: 'teams.members.addSubmit' }));
        expect(await screen.findByText('teams.members.emailRequired')).toBeInTheDocument();

        await user.type(screen.getByLabelText('teams.members.addLabel'), 'a');
        expect(screen.queryByText('teams.members.emailRequired')).not.toBeInTheDocument();
    });
});
