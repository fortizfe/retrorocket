import React, { useRef } from 'react';
import { Search, X, Type, Calendar, SortAsc, SortDesc } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Input from '@/lib/components/ui/Input';
import type { ScopeFilter, SortKey, SortDirection, BoardScopeCounts } from '@/features/dashboard/hooks/useBoardListQuery';

/**
 * Search / scope-filter / sort toolbar for the "Mis Tableros" dashboard
 * (spec 031, selected Direction B — "Structured Table"). The scope filter
 * is a real `role="radiogroup"`/`role="radio"` segmented control,
 * arrow-key navigable, rather than a set of plain buttons — Direction B's
 * distinguishing choice per data-model.md. There is no grid/list view-mode
 * toggle: this direction has a single adaptive layout (FR-002-FR-011).
 */

export interface BoardControlsBarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    scopeFilter: ScopeFilter;
    onScopeFilterChange: (filter: ScopeFilter) => void;
    sortKey: SortKey;
    sortDirection: SortDirection;
    onSortChange: (sortKey: SortKey, sortDirection: SortDirection) => void;
    counts: BoardScopeCounts;
}

const SCOPE_OPTIONS: { value: ScopeFilter; labelKey: string }[] = [
    { value: 'all', labelKey: 'dashboard.controls.showAll' },
    { value: 'created', labelKey: 'dashboard.controls.showCreated' },
    { value: 'joined', labelKey: 'dashboard.controls.showJoined' },
];

const BoardControlsBar: React.FC<BoardControlsBarProps> = ({
    searchQuery,
    onSearchChange,
    scopeFilter,
    onScopeFilterChange,
    sortKey,
    sortDirection,
    onSortChange,
    counts,
}) => {
    const { t } = useTranslation();
    const segmentRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const handleSortClick = (key: SortKey) => {
        if (sortKey === key) {
            onSortChange(key, sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            onSortChange(key, 'asc');
        }
    };

    const handleSegmentKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, current: ScopeFilter) => {
        const idx = SCOPE_OPTIONS.findIndex((o) => o.value === current);
        let nextIdx = idx;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            nextIdx = (idx + 1) % SCOPE_OPTIONS.length;
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            nextIdx = (idx - 1 + SCOPE_OPTIONS.length) % SCOPE_OPTIONS.length;
        } else {
            return;
        }
        event.preventDefault();
        const next = SCOPE_OPTIONS[nextIdx].value;
        onScopeFilterChange(next);
        requestAnimationFrame(() => segmentRefs.current[nextIdx]?.focus());
    };

    const countFor = (scope: ScopeFilter) =>
        scope === 'all' ? counts.all : scope === 'created' ? counts.created : counts.joined;

    return (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border-default bg-surface-raised/80 p-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <Input
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={t('dashboard.controls.filterPlaceholder')}
                    aria-label={t('dashboard.controls.filterPlaceholder')}
                    className="pl-9 pr-9"
                />
                {searchQuery && (
                    <button
                        type="button"
                        onClick={() => onSearchChange('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                        title={t('dashboard.controls.clearFilter')}
                        aria-label={t('dashboard.controls.clearFilter')}
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
                {/* Segmented control — real role="radiogroup"/role="radio", arrow-key navigable */}
                <div
                    role="radiogroup"
                    aria-label={t('dashboard.table.scopeFilterLabel')}
                    className="inline-flex gap-1 rounded-lg border border-border-default bg-surface p-1"
                >
                    {SCOPE_OPTIONS.map((opt, idx) => {
                        const checked = scopeFilter === opt.value;
                        return (
                            <button
                                key={opt.value}
                                ref={(el) => {
                                    segmentRefs.current[idx] = el;
                                }}
                                type="button"
                                role="radio"
                                aria-checked={checked}
                                tabIndex={checked ? 0 : -1}
                                onClick={() => onScopeFilterChange(opt.value)}
                                onKeyDown={(e) => handleSegmentKeyDown(e, opt.value)}
                                className={clsx(
                                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:text-sm',
                                    checked
                                        ? 'bg-action text-text-inverse shadow-sm'
                                        : 'text-text-secondary hover:bg-surface-raised'
                                )}
                            >
                                {t(opt.labelKey)}{' '}
                                <span className={clsx('tabular-nums', checked ? 'text-text-inverse/80' : 'text-text-muted')}>
                                    ({countFor(opt.value)})
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Sort controls */}
                <div className="inline-flex items-center gap-1 rounded-lg border border-border-default bg-surface p-1">
                    <button
                        type="button"
                        onClick={() => handleSortClick('name')}
                        className={clsx(
                            'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:text-sm',
                            sortKey === 'name'
                                ? 'bg-action text-text-inverse shadow-sm'
                                : 'text-text-secondary hover:bg-surface-raised'
                        )}
                        title={t('dashboard.controls.sortByName')}
                    >
                        <Type className="h-3.5 w-3.5" />
                        {t('dashboard.controls.sortByName')}
                        {sortKey === 'name' &&
                            (sortDirection === 'asc' ? (
                                <SortAsc className="h-3.5 w-3.5" />
                            ) : (
                                <SortDesc className="h-3.5 w-3.5" />
                            ))}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSortClick('createdAt')}
                        className={clsx(
                            'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:text-sm',
                            sortKey === 'createdAt'
                                ? 'bg-action text-text-inverse shadow-sm'
                                : 'text-text-secondary hover:bg-surface-raised'
                        )}
                        title={t('dashboard.controls.sortByDate')}
                    >
                        <Calendar className="h-3.5 w-3.5" />
                        {t('dashboard.controls.sortByDate')}
                        {sortKey === 'createdAt' &&
                            (sortDirection === 'asc' ? (
                                <SortAsc className="h-3.5 w-3.5" />
                            ) : (
                                <SortDesc className="h-3.5 w-3.5" />
                            ))}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BoardControlsBar;
