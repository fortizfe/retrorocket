import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (itemsPerPage: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems,
    onPageChange,
    onItemsPerPageChange
}) => {
    const { t } = useTranslation();

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const getVisiblePages = () => {
        const delta = 2;
        const range = [];
        const rangeWithDots = [];

        for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
            range.push(i);
        }

        if (currentPage - delta > 2) {
            rangeWithDots.push(1, '...');
        } else {
            rangeWithDots.push(1);
        }

        rangeWithDots.push(...range);

        if (currentPage + delta < totalPages - 1) {
            rangeWithDots.push('...', totalPages);
        } else if (totalPages > 1) {
            rangeWithDots.push(totalPages);
        }

        return rangeWithDots;
    };

    if (totalPages <= 1) {
        return (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                    {t('dashboard.controls.showingResults', { start: startItem, end: endItem, total: totalItems })}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                        {t('dashboard.controls.itemsPerPage')}:
                    </span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                        title={t('dashboard.controls.itemsPerPage')}
                        className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded
                                 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                                 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            {/* Results info */}
            <div className="text-sm text-slate-600 dark:text-slate-400">
                {t('dashboard.controls.showingResults', { start: startItem, end: endItem, total: totalItems })}
            </div>

            {/* Pagination controls */}
            <div className="flex items-center gap-2">
                {/* Items per page */}
                <div className="flex items-center gap-2 mr-4">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                        {t('dashboard.controls.itemsPerPage')}:
                    </span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                        title={t('dashboard.controls.itemsPerPage')}
                        className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded
                                 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                                 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                </div>

                {/* Previous button */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Page numbers */}
                {getVisiblePages().map((page) => (
                    <React.Fragment key={`page-${page}`}>
                        {page === '...' ? (
                            <span className="px-3 py-1 text-slate-400 dark:text-slate-500">...</span>
                        ) : (
                            <Button
                                variant={currentPage === page ? 'primary' : 'outline'}
                                size="sm"
                                onClick={() => onPageChange(page as number)}
                                className="px-3 py-1 min-w-[2.5rem]"
                            >
                                {page}
                            </Button>
                        )}
                    </React.Fragment>
                ))}

                {/* Next button */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

export default Pagination;
