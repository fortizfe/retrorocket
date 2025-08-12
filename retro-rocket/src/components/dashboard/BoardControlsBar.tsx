import React from 'react';
import { Search, SortAsc, Grid, List, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';

export type SortBy = 'name' | 'date';
export type ViewMode = 'grid' | 'list';

interface BoardControlsBarProps {
    sortBy: SortBy;
    onSortChange: (sortBy: SortBy) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    totalCount: number;
    filteredCount: number;
}

const BoardControlsBar: React.FC<BoardControlsBarProps> = ({
    sortBy,
    onSortChange,
    searchQuery,
    onSearchChange,
    viewMode,
    onViewModeChange,
    totalCount,
    filteredCount
}) => {
    const { t } = useTranslation();

    const handleClearSearch = () => {
        onSearchChange('');
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                {/* Left side - Search and Sort */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
                    {/* Search */}
                    <div className="relative flex-1 sm:max-w-sm">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <input
                            type="text"
                            placeholder={t('dashboard.controls.filterPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-10 pr-10 py-2 border border-slate-300 dark:border-slate-600 rounded-md 
                                     bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                                     placeholder-slate-500 dark:placeholder-slate-400
                                     focus:ring-2 focus:ring-primary-500 focus:border-transparent
                                     transition-colors duration-200"
                        />
                        {searchQuery && (
                            <button
                                onClick={handleClearSearch}
                                title={t('dashboard.controls.clearFilter')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-2">
                        <SortAsc className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        <span className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {t('dashboard.controls.sortBy')}
                        </span>
                        <select
                            value={sortBy}
                            onChange={(e) => onSortChange(e.target.value as SortBy)}
                            title={t('dashboard.controls.sortBy')}
                            className="px-3 py-1 border border-slate-300 dark:border-slate-600 rounded-md
                                     bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                                     focus:ring-2 focus:ring-primary-500 focus:border-transparent
                                     transition-colors duration-200"
                        >
                            <option value="name">{t('dashboard.controls.sortByName')}</option>
                            <option value="date">{t('dashboard.controls.sortByDate')}</option>
                        </select>
                    </div>
                </div>

                {/* Right side - View Toggle and Results Count */}
                <div className="flex items-center gap-4">
                    {/* Results count */}
                    {searchQuery && (
                        <span className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {filteredCount} de {totalCount}
                        </span>
                    )}

                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {t('dashboard.controls.viewMode')}
                        </span>
                        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-md p-1">
                            <Button
                                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                                size="sm"
                                onClick={() => onViewModeChange('grid')}
                                className="px-3 py-1 text-xs"
                            >
                                <Grid className="h-3 w-3 mr-1" />
                                {t('dashboard.controls.gridView')}
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                                size="sm"
                                onClick={() => onViewModeChange('list')}
                                className="px-3 py-1 text-xs"
                            >
                                <List className="h-3 w-3 mr-1" />
                                {t('dashboard.controls.listView')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BoardControlsBar;
