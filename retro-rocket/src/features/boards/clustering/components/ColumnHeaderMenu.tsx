import React, { useCallback } from 'react';
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
import { GroupSuggestionModal } from '@/features/boards/clustering/components/GroupSuggestionModal';
import { GroupSuggestion, Card } from '@/features/boards/types/card';

interface ColumnHeaderMenuProps {
    currentGrouping: GroupingCriteria;
    onGroupingChange: (criteria: GroupingCriteria) => void;
    disabled?: boolean;
    hasCards?: boolean;
    // Grouping-suggestions panel (spec 044) — anchored to this same trigger button,
    // independently of the grouping-mode dropdown below. Data/state stays owned by
    // the caller (GroupableColumn.tsx); this component only owns the trigger and the
    // panel's positioning/animation/dismissal.
    suggestionsOpen?: boolean;
    suggestions?: GroupSuggestion[];
    suggestionCards?: Card[];
    suggestionsLoading?: boolean;
    suggestionsError?: string | null;
    onAcceptSuggestion?: (suggestion: GroupSuggestion) => void;
    onRejectSuggestion?: (suggestionId: string) => void;
    onCloseSuggestions?: () => void;
}

/**
 * Grouping-mode menu for a column, rebuilt on the shared `useBoardMenuOverlay`
 * (feature 033, tasks.md T013/T036) — previously hand-rolled outside-click-only
 * dismissal (no Escape key, no viewport-aware positioning), a real gap against
 * FR-012's "dismissible via Escape and outside-click" requirement, now fixed by
 * construction via the shared hook.
 *
 * Both floating overlays below (the grouping-mode dropdown and the suggestions
 * panel) use the split-node pattern: an outer plain `<div>` carries Floating UI's
 * `ref`/`style`/`getFloatingProps()` (positioning only), and a nested `motion.div`
 * carries only Framer Motion's `initial`/`animate`/`exit` (animation only). Putting
 * both sets of props on the same node lets Framer Motion's own `transform` silently
 * overwrite Floating UI's positioning `transform` on every frame, pinning the panel
 * to the viewport's top-left corner — the defect feature 039 first identified and
 * fixed in `CardMenu.tsx`, spec 044 fixed for the suggestions panel below, and
 * spec 045 fixed for this dropdown, closing the last block feature 039 had deferred.
 */
const ColumnHeaderMenu: React.FC<ColumnHeaderMenuProps> = ({
    currentGrouping,
    onGroupingChange,
    disabled = false,
    hasCards = true,
    suggestionsOpen = false,
    suggestions = [],
    suggestionCards = [],
    suggestionsLoading = false,
    suggestionsError = null,
    onAcceptSuggestion,
    onRejectSuggestion,
    onCloseSuggestions,
}) => {
    const { t } = useTranslation();
    const { open, setOpen, context, refs, floatingStyles, getReferenceProps, getFloatingProps } = useBoardMenuOverlay({
        placement: 'bottom-end',
    });

    // Second, independent overlay anchored to the *same* trigger button (merged ref
    // below) so the suggestions panel opens right next to it, like every other popup
    // in the app — fixing the reported defect where it rendered pinned to the
    // viewport's top-left corner (research.md §1). `open` is fully controlled by the
    // caller (GroupableColumn.tsx owns when suggestions are being generated/shown);
    // this instance's own `useClick` is intentionally never wired to the trigger
    // button (only its `refs.setReference`/positioning is), so clicking the button
    // opens the grouping-mode dropdown above, never this panel directly.
    const suggestionsOverlay = useBoardMenuOverlay({
        open: suggestionsOpen,
        onOpenChange: (next) => {
            if (!next) onCloseSuggestions?.();
        },
        placement: 'bottom-end',
        role: 'dialog',
    });

    const setTriggerRef = useCallback(
        (node: HTMLButtonElement | null) => {
            refs.setReference(node);
            suggestionsOverlay.refs.setReference(node);
        },
        [refs, suggestionsOverlay.refs]
    );

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
                ref={setTriggerRef}
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
                            {/* Positioning wrapper: carries Floating UI's `ref`/`style` (whose
                                `transform` encodes the anchor offset), not a `motion.div` — see
                                the split-node explanation in this component's doc comment above. */}
                            <div
                                ref={refs.setFloating}
                                style={floatingStyles}
                                {...getFloatingProps()}
                                aria-label={t('retrospective.grouping.menuLabel')}
                                className="z-50"
                            >
                                <motion.div
                                    initial={{ opacity: 0, transform: 'translateY(-8px) scale(0.95)' }}
                                    animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
                                    exit={{ opacity: 0, transform: 'translateY(-8px) scale(0.95)' }}
                                    transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                                    className="bg-surface-raised/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border-default/40 py-1 min-w-[220px]"
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
                            </div>
                        </FloatingFocusManager>
                    )}
                </AnimatePresence>
            </FloatingPortal>

            <FloatingPortal>
                <AnimatePresence>
                    {suggestionsOverlay.open && (
                        <FloatingFocusManager context={suggestionsOverlay.context} modal={false}>
                            {/* Positioning wrapper: carries Floating UI's `ref`/`style` (whose
                                `transform` encodes the anchor offset), not a `motion.div` — Framer
                                Motion's own `animate`/`exit` write their own `transform` onto
                                whatever node they're applied to, which would silently overwrite
                                Floating UI's positioning transform and pin the panel to the
                                viewport's top-left corner (research.md §1). The entrance/exit
                                animation lives on the nested `motion.div` below instead, matching
                                FacilitatorMenu.tsx's already-correct split-node pattern. */}
                            <div
                                ref={suggestionsOverlay.refs.setFloating}
                                style={suggestionsOverlay.floatingStyles}
                                {...suggestionsOverlay.getFloatingProps()}
                                aria-label={t('groupSuggestion.title')}
                                className="z-[9999]"
                            >
                                <motion.div
                                    initial={{ opacity: 0, transform: 'translateY(-4px) scale(0.97)' }}
                                    animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
                                    exit={{ opacity: 0, transform: 'translateY(-4px) scale(0.97)' }}
                                    transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                                >
                                    <GroupSuggestionModal
                                        onClose={() => suggestionsOverlay.setOpen(false)}
                                        suggestions={suggestions}
                                        cards={suggestionCards}
                                        onAcceptSuggestion={(s) => onAcceptSuggestion?.(s)}
                                        onRejectSuggestion={(id) => onRejectSuggestion?.(id)}
                                        loading={suggestionsLoading}
                                        error={suggestionsError}
                                    />
                                </motion.div>
                            </div>
                        </FloatingFocusManager>
                    )}
                </AnimatePresence>
            </FloatingPortal>
        </>
    );
};

export default ColumnHeaderMenu;
