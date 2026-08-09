import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BoardControlsBar from '@/features/dashboard/components/BoardControlsBar';

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
});
