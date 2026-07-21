import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { animations, interactiveStates, a11y } from '@/lib/utils/designSystem';
import Button from '@/lib/components/ui/Button';

interface ColumnNavigationTab {
    id: string;
    title: string;
    icon: string;
    count?: number;
}

interface MobileColumnNavigationProps {
    columns: ColumnNavigationTab[];
    activeColumnId: string;
    onColumnChange: (columnId: string) => void;
    className?: string;
}

const MobileColumnNavigation: React.FC<MobileColumnNavigationProps> = ({
    columns,
    activeColumnId,
    onColumnChange,
    className = ''
}) => {
    const { t } = useLanguage();
    const [dragProgress, setDragProgress] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const activeIndex = columns.findIndex(col => col.id === activeColumnId);

    // Handle swipe gestures
    const handlePanEnd = (_event: PointerEvent, info: PanInfo) => {
        const threshold = 50; // Minimum swipe distance
        const velocity = Math.abs(info.velocity.x);

        // Require minimum velocity or distance for swipe
        if (Math.abs(info.offset.x) > threshold || velocity > 500) {
            if (info.offset.x > 0 && activeIndex > 0) {
                // Swipe right - go to previous column
                onColumnChange(columns[activeIndex - 1].id);
            } else if (info.offset.x < 0 && activeIndex < columns.length - 1) {
                // Swipe left - go to next column  
                onColumnChange(columns[activeIndex + 1].id);
            }
        }

        setDragProgress(0);
    };

    const handlePan = (_event: PointerEvent, info: PanInfo) => {
        const containerWidth = containerRef.current?.offsetWidth || 0;
        const progress = Math.abs(info.offset.x) / (containerWidth / 3);
        setDragProgress(Math.min(progress, 1));
    };

    // Navigation functions
    const goToPrevious = () => {
        if (activeIndex > 0) {
            onColumnChange(columns[activeIndex - 1].id);
        }
    };

    const goToNext = () => {
        if (activeIndex < columns.length - 1) {
            onColumnChange(columns[activeIndex + 1].id);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft' && activeIndex > 0) {
                event.preventDefault();
                goToPrevious();
            } else if (event.key === 'ArrowRight' && activeIndex < columns.length - 1) {
                event.preventDefault();
                goToNext();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [activeIndex, columns.length]);

    return (
        <div className={`lg:hidden ${className}`}>
            {/* Tab Navigation */}
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50 sticky top-16 z-30">
                <div className="flex items-center justify-between px-4 py-3">
                    {/* Previous Button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={goToPrevious}
                        disabled={activeIndex === 0}
                        className={`${interactiveStates.touchTarget} flex items-center gap-2`}
                        aria-label={t('navigation.previousColumn')}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span className={a11y.srOnly}>{t('navigation.previous')}</span>
                    </Button>

                    {/* Tab Pills */}
                    <div className="flex-1 flex justify-center">
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 max-w-sm overflow-x-auto">
                            {columns.map((column, index) => {
                                const isActive = column.id === activeColumnId;
                                return (
                                    <button
                                        key={column.id}
                                        onClick={() => onColumnChange(column.id)}
                                        className={`
                      ${interactiveStates.touchTarget}
                      ${animations.default}
                      flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap
                      ${isActive
                                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                                            }
                    `}
                                        aria-pressed={isActive ? 'true' : 'false'}
                                        aria-label={column.count ? `${column.title} (${column.count} tarjetas)` : column.title}
                                    >
                                        <span className="text-base">{column.icon}</span>
                                        <span className="hidden sm:inline text-xs">{column.title}</span>
                                        {column.count !== undefined && (
                                            <span className="bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-full px-2 py-0.5 text-xs min-w-[20px] text-center">
                                                {column.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Next Button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={goToNext}
                        disabled={activeIndex === columns.length - 1}
                        className={`${interactiveStates.touchTarget} flex items-center gap-2`}
                        aria-label={t('navigation.nextColumn')}
                    >
                        <span className={a11y.srOnly}>{t('navigation.next')}</span>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>

                {/* Progress Indicator */}
                <div className="h-0.5 bg-slate-200 dark:bg-slate-700">
                    <motion.div
                        className="h-full bg-blue-500"
                        initial={false}
                        animate={{
                            width: `${((activeIndex + 1) / columns.length) * 100}%`,
                            opacity: dragProgress > 0 ? 0.5 + dragProgress * 0.5 : 1
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                </div>
            </div>

            {/* Swipe Hint (only shown on first visit) */}
            <AnimatePresence>
                {/* You could add a swipe hint here if needed */}
            </AnimatePresence>

            {/* Hidden swipe detector overlay */}
            <motion.div
                ref={containerRef}
                className="fixed inset-x-0 top-32 bottom-0 pointer-events-auto lg:pointer-events-none"
                onPan={handlePan}
                onPanEnd={handlePanEnd}
                style={{
                    touchAction: 'pan-x',
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    userSelect: 'none'
                }}
            >
                <div className="absolute inset-0 pointer-events-none">
                    {/* Visual feedback for swipe gesture */}
                    {dragProgress > 0 && (
                        <motion.div
                            className="absolute inset-y-0 left-0 w-1 bg-blue-500 opacity-50"
                            style={{
                                scaleX: dragProgress,
                                originX: 0
                            }}
                        />
                    )}
                </div>
            </motion.div>
        </div>
    );
};

/**
 * Column Content Container with swipe support
 */
interface SwipeableColumnContainerProps {
    children: React.ReactNode;
    columnId: string;
    isActive: boolean;
    onSwipe?: (direction: 'left' | 'right') => void;
    className?: string;
}

export const SwipeableColumnContainer: React.FC<SwipeableColumnContainerProps> = ({
    children,
    columnId,
    isActive,
    onSwipe,
    className = ''
}) => {
    const handlePanEnd = (_event: PointerEvent, info: PanInfo) => {
        const threshold = 50;
        const velocity = Math.abs(info.velocity.x);

        if ((Math.abs(info.offset.x) > threshold || velocity > 500) && onSwipe) {
            if (info.offset.x > 0) {
                onSwipe('right');
            } else if (info.offset.x < 0) {
                onSwipe('left');
            }
        }
    };

    return (
        <AnimatePresence mode="wait">
            {isActive && (
                <motion.div
                    key={columnId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                        duration: 0.3
                    }}
                    className={`lg:hidden ${className}`}
                    onPanEnd={handlePanEnd}
                    style={{ touchAction: 'pan-x' }}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MobileColumnNavigation;
