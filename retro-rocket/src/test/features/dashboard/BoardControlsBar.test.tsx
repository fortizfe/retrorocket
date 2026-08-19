import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BoardControlsBar from '@/features/dashboard/components/BoardControlsBar';
import type { TeamSummary } from '@/features/teams/types/team';

describe('BoardControlsBar', () => {
    const defaultProps = {
        searchQuery: '',
        onSearchChange: vi.fn(),
        scopeFilter: 'all' as const,
        onScopeFilterChange: vi.fn(),
        sortKey: 'createdAt' as const,
        sortDirection: 'desc' as const,
        onSortChange: vi.fn(),
        counts: { all: 12, created: 7, joined: 5 },
    };

    // 055-retro-team-association, T016 (US2): the dashboard's team-filter control isn't
    // implemented yet — `teams`/`teamFilter`/`onTeamFilterChange` don't exist on
    // `BoardControlsBarProps` (that's T018's job). These fixtures/props describe the
    // contract the next implementation task must satisfy.
    const fixtureTeams: TeamSummary[] = [
        {
            id: 'team-a',
            name: 'Team Alpha',
            description: null,
            ownerId: 'user-1',
            createdAt: new Date('2026-01-01T00:00:00Z'),
            updatedAt: new Date('2026-01-01T00:00:00Z'),
            memberCount: 3,
            myRole: 'owner',
        },
        {
            id: 'team-b',
            name: 'Team Beta',
            description: null,
            ownerId: 'user-2',
            createdAt: new Date('2026-01-01T00:00:00Z'),
            updatedAt: new Date('2026-01-01T00:00:00Z'),
            memberCount: 1,
            myRole: 'member',
        },
    ];

    const teamFilterProps = {
        ...defaultProps,
        teams: fixtureTeams,
        teamFilter: 'all' as const,
        onTeamFilterChange: vi.fn(),
    };

    it('renders the search input and reports changes', () => {
        const onSearchChange = vi.fn();
        render(<BoardControlsBar {...defaultProps} onSearchChange={onSearchChange} />);

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'sprint' } });
        expect(onSearchChange).toHaveBeenCalledWith('sprint');
    });

    it('shows a clear button only when the search query is non-empty, and clears it', () => {
        const onSearchChange = vi.fn();
        const { rerender } = render(<BoardControlsBar {...defaultProps} onSearchChange={onSearchChange} />);
        expect(screen.queryByTitle('dashboard.controls.clearFilter')).not.toBeInTheDocument();

        rerender(<BoardControlsBar {...defaultProps} searchQuery="sprint" onSearchChange={onSearchChange} />);
        fireEvent.click(screen.getByTitle('dashboard.controls.clearFilter'));
        expect(onSearchChange).toHaveBeenCalledWith('');
    });

    describe('Scope segmented control (real radiogroup, FR-010)', () => {
        it('renders all three scope options as ARIA radios with live counts', () => {
            render(<BoardControlsBar {...defaultProps} />);

            const group = screen.getByRole('radiogroup');
            const radios = screen.getAllByRole('radio');
            expect(group).toBeInTheDocument();
            expect(radios).toHaveLength(3);
            expect(screen.getByText('(12)')).toBeInTheDocument();
            expect(screen.getByText('(7)')).toBeInTheDocument();
            expect(screen.getByText('(5)')).toBeInTheDocument();
        });

        it('marks the active scope as checked and the others as not', () => {
            render(<BoardControlsBar {...defaultProps} scopeFilter="created" />);
            const radios = screen.getAllByRole('radio');
            const checked = radios.filter((r) => r.getAttribute('aria-checked') === 'true');
            expect(checked).toHaveLength(1);
            expect(checked[0]).toHaveTextContent('(7)');
        });

        it('calls onScopeFilterChange when a scope option is clicked', () => {
            const onScopeFilterChange = vi.fn();
            render(<BoardControlsBar {...defaultProps} onScopeFilterChange={onScopeFilterChange} />);

            fireEvent.click(screen.getByText('(5)'));
            expect(onScopeFilterChange).toHaveBeenCalledWith('joined');
        });

        it('moves selection with ArrowRight/ArrowLeft, wrapping at the ends (keyboard operability)', () => {
            const onScopeFilterChange = vi.fn();
            render(<BoardControlsBar {...defaultProps} scopeFilter="all" onScopeFilterChange={onScopeFilterChange} />);

            const radios = screen.getAllByRole('radio');
            fireEvent.keyDown(radios[0], { key: 'ArrowRight' });
            expect(onScopeFilterChange).toHaveBeenCalledWith('created');

            fireEvent.keyDown(radios[0], { key: 'ArrowLeft' });
            expect(onScopeFilterChange).toHaveBeenCalledWith('joined');
        });
    });

    describe('Sort controls (FR-011)', () => {
        it('starts a new sort key at ascending direction', () => {
            const onSortChange = vi.fn();
            render(<BoardControlsBar {...defaultProps} sortKey="createdAt" onSortChange={onSortChange} />);

            fireEvent.click(screen.getByTitle('dashboard.controls.sortByName'));
            expect(onSortChange).toHaveBeenCalledWith('name', 'asc');
        });

        it('toggles direction when the active sort key is clicked again', () => {
            const onSortChange = vi.fn();
            render(
                <BoardControlsBar
                    {...defaultProps}
                    sortKey="name"
                    sortDirection="asc"
                    onSortChange={onSortChange}
                />
            );

            fireEvent.click(screen.getByTitle('dashboard.controls.sortByName'));
            expect(onSortChange).toHaveBeenCalledWith('name', 'desc');
        });
    });

    // 055-retro-team-association, T016 (US2, FR-007-FR-009)
    describe('Team filter (does not exist yet — describes T018)', () => {
        it('renders one option per team plus a "no team" option, even when a team has zero currently-visible boards', () => {
            render(<BoardControlsBar {...teamFilterProps} />);

            const select = screen.getByRole('combobox', { name: 'dashboard.controls.team.label' });
            const optionLabels = within(select)
                .getAllByRole('option')
                .map((option) => option.textContent);

            // Both teams appear regardless of how many boards currently match them —
            // this control's options come from `teams` (useTeamsQuery()), never from
            // counting the currently-displayed board list (per spec.md's Clarifications).
            expect(optionLabels).toContain('Team Alpha');
            expect(optionLabels).toContain('Team Beta');
            expect(optionLabels).toContain('dashboard.controls.team.noTeam');
        });

        it('calls onTeamFilterChange with the team id when a specific team is selected', () => {
            const onTeamFilterChange = vi.fn();
            render(<BoardControlsBar {...teamFilterProps} onTeamFilterChange={onTeamFilterChange} />);

            const select = screen.getByRole('combobox', { name: 'dashboard.controls.team.label' });
            fireEvent.change(select, { target: { value: 'team-a' } });
            expect(onTeamFilterChange).toHaveBeenCalledWith('team-a');
        });

        it('calls onTeamFilterChange with the "none" sentinel when "no team" is selected', () => {
            const onTeamFilterChange = vi.fn();
            render(<BoardControlsBar {...teamFilterProps} onTeamFilterChange={onTeamFilterChange} />);

            const select = screen.getByRole('combobox', { name: 'dashboard.controls.team.label' });
            fireEvent.change(select, { target: { value: 'none' } });
            expect(onTeamFilterChange).toHaveBeenCalledWith('none');
        });

        it('calls onTeamFilterChange with the "all" sentinel when cleared back to every team', () => {
            const onTeamFilterChange = vi.fn();
            render(
                <BoardControlsBar
                    {...teamFilterProps}
                    teamFilter="team-a"
                    onTeamFilterChange={onTeamFilterChange}
                />
            );

            const select = screen.getByRole('combobox', { name: 'dashboard.controls.team.label' });
            fireEvent.change(select, { target: { value: 'all' } });
            expect(onTeamFilterChange).toHaveBeenCalledWith('all');
        });
    });
});
