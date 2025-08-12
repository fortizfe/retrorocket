import React from 'react';
import { Search, SortAsc, SortDesc, Grid, List, X, Calendar, Type, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';

export type SortBy = 'name' | 'date';
export type SortOrder = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list';
export type FilterBy = 'all' | 'created' | 'joined';

interface BoardControlsBarProps {
    sortBy: SortBy;
    sortOrder: SortOrder;
    onSortChange: (sortBy: SortBy, sortOrder: SortOrder) => void;
    filterBy: FilterBy;
    onFilterChange: (filterBy: FilterBy) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    totalCount: number;
    filteredCount: number;
    createdCount?: number;
    joinedCount?: number;
}

const BoardControlsBar: React.FC<BoardControlsBarProps> = ({
    sortBy,
    sortOrder,
    onSortChange,
    filterBy,
    onFilterChange,
    searchQuery,
    onSearchChange,
    viewMode,
    onViewModeChange,
    totalCount,
    filteredCount,
    createdCount = 0,
    joinedCount = 0
}) => {
    const { t } = useTranslation();

    const handleClearSearch = () => {
        onSearchChange('');
    };

    const handleSortClick = (newSortBy: SortBy) => {
        if (sortBy === newSortBy) {
            // Si es el mismo campo, cambia el orden
            const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
            onSortChange(newSortBy, newOrder);
        } else {
            // Si es un campo diferente, comienza con ascendente
            onSortChange(newSortBy, 'asc');
        }
    };

    const getSortIcon = (field: SortBy) => {
        if (sortBy !== field) {
            return null; // No mostrar icono si no está activo
        }
        return sortOrder === 'asc' ? (
            <SortAsc className="h-3 w-3 ml-1" />
        ) : (
            <SortDesc className="h-3 w-3 ml-1" />
        );
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

                    {/* Filter by Type */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {t('dashboard.controls.filterBy')}
                        </span>
                        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-md p-1">
                            <Button
                                variant={filterBy === 'all' ? 'primary' : 'ghost'}
                                size="sm"
                                onClick={() => onFilterChange('all')}
                                className="px-3 py-1 text-xs"
                            >
                                {t('dashboard.controls.showAll')}
                                <span className="ml-1 text-xs opacity-75">({totalCount})</span>
                            </Button>
                            <Button
                                variant={filterBy === 'created' ? 'primary' : 'ghost'}
                                size="sm"
                                onClick={() => onFilterChange('created')}
                                className="px-3 py-1 text-xs"
                            >
                                {t('dashboard.controls.showCreated')}
                                <span className="ml-1 text-xs opacity-75">({createdCount})</span>
                            </Button>
                            <Button
                                variant={filterBy === 'joined' ? 'primary' : 'ghost'}
                                size="sm"
                                onClick={() => onFilterChange('joined')}
                                className="px-3 py-1 text-xs"
                            >
                                {t('dashboard.controls.showJoined')}
                                <span className="ml-1 text-xs opacity-75">({joinedCount})</span>
                            </Button>
                        </div>
                    </div>

                    {/* Sort Controls */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {t('dashboard.controls.sortBy')}
                        </span>
                        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-md p-1">
                            <Button
                                variant={sortBy === 'name' ? 'primary' : 'ghost'}
                                size="sm"
                                onClick={() => handleSortClick('name')}
                                className="px-3 py-1 text-xs flex items-center"
                                title={t('dashboard.controls.sortByName')}
                            >
                                <Type className="h-3 w-3 mr-1" />
                                {t('dashboard.controls.sortByName')}
                                {getSortIcon('name')}
                            </Button>
                            <Button
                                variant={sortBy === 'date' ? 'primary' : 'ghost'}
                                size="sm"
                                onClick={() => handleSortClick('date')}
                                className="px-3 py-1 text-xs flex items-center"
                                title={t('dashboard.controls.sortByDate')}
                            >
                                <Calendar className="h-3 w-3 mr-1" />
                                {t('dashboard.controls.sortByDate')}
                                {getSortIcon('date')}
                            </Button>
                        </div>
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
