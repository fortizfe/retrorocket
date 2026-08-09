import React from 'react';
import { FloatingPortal, FloatingFocusManager } from '@floating-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
    ChevronDown,
    CheckCircle,
    LayoutGrid
} from 'lucide-react';
import {
    GroupingCriteria,
    getGroupingOptions
} from '@/features/boards/types/columnGrouping';
import { useBoardMenuOverlay } from '@/features/boards/retrospective/hooks/useBoardMenuOverlay';

interface ColumnHeaderMenuProps {
    currentGrouping: GroupingCriteria;
    onGroupingChange: (criteria: GroupingCriteria) => void;
    disabled?: boolean;
    hasCards?: boolean;
}

/**
 * Grouping-mode menu for a column, rebuilt on the shared `useBoardMenuOverlay`
 * (feature 033, tasks.md T013/T036) — previously hand-rolled outside-click-only
 * dismissal (no Escape key, no viewport-aware positioning), a real gap against
 * FR-012's "dismissible via Escape and outside-click" requirement, now fixed by
 * construction via the shared hook.
 */
const ColumnHeaderMenu: React.FC<ColumnHeaderMenuProps> = ({
    currentGrouping,
    onGroupingChange,
    disabled = false,
    hasCards = true
}) => {
    const { t } = useTranslation();
    const { open, setOpen, context, refs, floatingStyles, getReferenceProps, getFloatingProps } = useBoardMenuOverlay({
        placement: 'bottom-end',
    });

    // Get grouping options dynamically to respond to language changes
    const groupingOptions = getGroupingOptions(t);

    const handleGroupingSelect = (criteria: GroupingCriteria) => {
        onGroupingChange(criteria);
        setOpen(false);
    };

    const getGroupingIcon = (criteria: GroupingCriteria) => {
        const option = groupingOptions.find(opt => opt.value === criteria);
        const IconComponent = option?.icon;
        return IconComponent ? <IconComponent className="w-3 h-3" /> : null;
    };

    if (disabled || !hasCards) return null;

    return (
        <>
            <button
                ref={refs.setReference}
                {...getReferenceProps()}
                className={`
                    flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium
                    transition-[background-color,box-shadow,color,border-color] duration-200 hover:bg-surface-raised
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus
                    ${open ? 'bg-surface shadow-sm' : ''}
                    ${currentGrouping !== 'none' ? 'bg-info-bg text-info-fg border border-info-fg' : 'text-text-secondary border border-border-default'}
                `}
                title={t('retrospective.grouping.menuTrigger')}
                aria-label={t('retrospective.grouping.menuLabel')}
            >
                {getGroupingIcon(currentGrouping)}
                <LayoutGrid className="w-3 h-3" />
                <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            <FloatingPortal>
                <AnimatePresence>
                    {open && (
                        <FloatingFocusManager context={context} modal={false}>
                            <motion.div
                                ref={refs.setFloating}
                                style={floatingStyles}
                                {...getFloatingProps()}
                                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                                className="bg-surface-raised/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border-default/40 py-1 z-50 min-w-[220px]"
                                aria-label={t('retrospective.grouping.menuLabel')}
                            >
                                {groupingOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => handleGroupingSelect(option.value)}
                                        role="menuitem"
                                        className={`
                                            w-full flex items-center justify-between px-3 py-2 text-xs
                                            transition-colors hover:bg-surface-raised
                                            ${currentGrouping === option.value ? 'text-info-fg bg-info-bg' : 'text-text-secondary'}
                                        `}
                                        aria-label={`${option.label}: ${option.description}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <option.icon className="w-4 h-4" />
                                            <div className="text-left">
                                                <div className="font-medium">{option.label}</div>
                                                {option.description && (
                                                    <div className="text-xs text-text-muted mt-0.5">
                                                        {option.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {currentGrouping === option.value && (
                                            <CheckCircle className="w-3 h-3 text-info-fg" />
                                        )}
                                    </button>
                                ))}
                            </motion.div>
                        </FloatingFocusManager>
                    )}
                </AnimatePresence>
            </FloatingPortal>
        </>
    );
};

export default ColumnHeaderMenu;
