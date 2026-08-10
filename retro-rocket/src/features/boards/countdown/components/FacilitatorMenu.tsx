import React, { useState } from 'react';
import { FloatingPortal, FloatingFocusManager } from '@floating-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import { useCountdown } from '@/features/boards/countdown/hooks/useCountdown';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useSentimentContext } from '@/features/boards/sentiment';
import { useBoardMenuOverlay } from '@/features/boards/retrospective/hooks/useBoardMenuOverlay';
import BottomSheet from '@/lib/components/ui/BottomSheet';
import FacilitatorMenuTabs from '@/features/boards/facilitator/components/FacilitatorMenuTabs';
import FacilitatorTabList from '@/features/boards/facilitator/components/FacilitatorTabList';
import SentimentTab from '@/features/boards/facilitator/components/SentimentTab';
import NotesTab from '@/features/boards/facilitator/components/NotesTab';
import TeamMoodTab from '@/features/boards/facilitator/components/TeamMoodTab';
import ControlsTab from '@/features/boards/facilitator/components/ControlsTab';
import { Card } from '@/features/boards/types/card';
import { DynamicColumnConfig } from '@/features/boards/retrospective/hooks/useRetrospectiveColumns';
import type { CountdownTimer as CountdownTimerData, FacilitatorNote } from '@/features/boards/retrospective/services/backendRetrospectiveClient';

interface FacilitatorMenuProps {
    retrospectiveId: string;
    facilitatorId: string;
    isOwner: boolean;
    cards?: Card[];
    columnConfigs?: Record<string, DynamicColumnConfig>;
    /** Sourced from useRetrospectiveRealtimeSync's board state via BoardDataContext
     * (feature 019, US5). */
    timer: CountdownTimerData | null;
    /** Sourced from useRetrospectiveRealtimeSync's board state via BoardDataContext
     * (feature 019, US5) — never another facilitator's notes (FR-013). */
    myFacilitatorNotes: FacilitatorNote[];
}

/**
 * Owner-only facilitator panel, rebuilt on the Apple HIG-inspired "Adaptive
 * Sheet" direction (feature 036, clarity-forward: opaque panels, visible
 * borders) selected by the product owner. Desktop keeps the
 * `useBoardMenuOverlay`-anchored dialog introduced in feature 033/034; a new
 * mobile entry point (FR-013a) opens the same four tabs in a `BottomSheet`,
 * since no mobile path to this menu existed before this feature.
 *
 * The desktop panel's `open` state and the mobile sheet's `sheetOpen` state
 * are deliberately independent, not shared: the sheet is portaled to
 * `document.body`, outside the Floating-UI-anchored dialog's own DOM
 * subtree, so `useDismiss` would treat a press inside the sheet as a press
 * outside the dialog — closing (and unmounting) the sheet before its own
 * `onClick` fires. Found via a real failing test while building the
 * options menu's identical mobile entry point (`RetrospectiveTopbar.tsx`);
 * confirmed to apply here too before this file was written.
 */
const FacilitatorMenu: React.FC<FacilitatorMenuProps> = ({
    retrospectiveId,
    facilitatorId,
    isOwner,
    cards = [],
    columnConfigs = {},
    timer,
    myFacilitatorNotes,
}) => {
    const { t } = useLanguage();
    const sentimentAnalysis = useSentimentContext();
    const [activeTab, setActiveTab] = useState('controls');
    const [sheetOpen, setSheetOpen] = useState(false);

    const { open, setOpen, context, refs, floatingStyles, getReferenceProps, getFloatingProps } = useBoardMenuOverlay({
        placement: 'bottom-end',
        role: 'dialog',
    });

    const { countdownState } = useCountdown(retrospectiveId, timer);

    // Lock body scroll while either surface is open (unrelated to positioning).
    useBodyScrollLock(open || sheetOpen);

    const label = t('retrospective.facilitator.controls');

    // Calculate badges for tabs
    const getTimerBadge = () => {
        if (!timer) return undefined;
        if (countdownState.isFinished) return '!';
        if (countdownState.isRunning) return '▶';
        if (countdownState.isPaused) return '⏸';
        return '⏲';
    };

    const getSentimentBadge = () => {
        if (!sentimentAnalysis) return undefined;
        if (!sentimentAnalysis.enabled) return 'OFF';
        if (sentimentAnalysis.loading) return '...';
        if (sentimentAnalysis.error) return '!';
        if (sentimentAnalysis.ready) return '✓';
        return '?';
    };

    const getTeamMoodBadge = () => {
        if (!sentimentAnalysis?.enabled || !sentimentAnalysis.ready) return '⚪';
        const counts = sentimentAnalysis.getSentimentCounts();
        if (counts.total === 0) return '📊';

        const negativeRatio = counts.negative / counts.total;
        if (negativeRatio > 0.4) return '🚨'; // Crítico
        if (negativeRatio > 0.25) return '⚠️'; // Advertencia
        if (counts.positive / counts.total > 0.6) return '😊'; // Excelente
        return '📈'; // Normal/Bueno
    };

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
    };

    const handleClose = () => {
        setOpen(false);
    };

    // Render tab content
    const renderTabContent = () => {
        switch (activeTab) {
            case 'sentiment':
                return sentimentAnalysis ? (
                    <SentimentTab
                        enabled={sentimentAnalysis.enabled}
                        ready={sentimentAnalysis.ready}
                        loading={sentimentAnalysis.loading}
                        error={sentimentAnalysis.error}
                        config={sentimentAnalysis.config}
                        onToggle={sentimentAnalysis.setEnabled}
                        onConfigUpdate={sentimentAnalysis.updateConfig}
                        cardCount={sentimentAnalysis.getSentimentCounts().total}
                    />
                ) : (
                    <div className="text-center py-8 text-text-muted">
                        <p>{t('retrospective.facilitator.sentiment.notAvailable')}</p>
                    </div>
                );
            case 'team-mood':
                return (
                    <TeamMoodTab
                        cards={cards}
                        sentimentResults={sentimentAnalysis?.results || new Map()}
                        sentimentEnabled={sentimentAnalysis?.enabled || false}
                        sentimentReady={sentimentAnalysis?.ready || false}
                        columnConfigs={columnConfigs}
                    />
                );
            case 'notes':
                return (
                    <NotesTab
                        retrospectiveId={retrospectiveId}
                        facilitatorId={facilitatorId}
                        notes={myFacilitatorNotes}
                    />
                );
            case 'controls':
                return <ControlsTab retrospectiveId={retrospectiveId} timer={timer} />;
            default:
                return null;
        }
    };

    // Owner-only: absent (not disabled) for every other viewer.
    if (!isOwner) {
        return null;
    }

    return (
        <>
            <button
                ref={refs.setReference}
                {...getReferenceProps()}
                className="hidden md:inline-flex p-2.5 rounded-lg bg-surface hover:bg-surface-raised text-text-secondary hover:text-text-primary border border-border-default shadow-sm transition-colors items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                title={label}
                aria-label={label}
            >
                <SlidersHorizontal className="w-5 h-5" />
                <span className="font-medium text-sm">{t('retrospective.facilitator.menu')}</span>
            </button>

            <FloatingPortal>
                <AnimatePresence>
                    {open && (
                        <FloatingFocusManager context={context} modal={false}>
                            {/* Positioning wrapper: carries Floating UI's `ref`/`style` (whose
                                `transform` encodes the anchor offset), not a `motion.div` — Framer
                                Motion's own `animate`/`exit` write their own `transform` (from
                                `y`/`scale`) onto whatever node they're applied to, which would
                                silently overwrite Floating UI's positioning transform and pin the
                                panel to the viewport's top-left corner (research.md §1, feature
                                034). The entrance/exit animation lives on the nested `motion.div`
                                below instead, matching ReactionPicker.tsx's already-correct pattern. */}
                            <div
                                ref={refs.setFloating}
                                style={floatingStyles}
                                {...getFloatingProps()}
                                aria-label={label}
                                className="z-[99999]"
                            >
                                <motion.div
                                    initial={{ opacity: 0, transform: 'translateY(-4px)' }}
                                    animate={{ opacity: 1, transform: 'translateY(0px)' }}
                                    exit={{ opacity: 0, transform: 'translateY(-4px)' }}
                                    transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                                >
                                    <FacilitatorMenuTabs
                                        activeTab={activeTab}
                                        onTabChange={handleTabChange}
                                        onClose={handleClose}
                                        timerBadge={getTimerBadge()}
                                        sentimentBadge={getSentimentBadge()}
                                        teamMoodBadge={getTeamMoodBadge()}
                                        notesBadge={undefined} // Could add notes count here later
                                    >
                                        {renderTabContent()}
                                    </FacilitatorMenuTabs>
                                </motion.div>
                            </div>
                        </FloatingFocusManager>
                    )}
                </AnimatePresence>
            </FloatingPortal>

            {/* Mobile entry point (FR-013a) — no reachable path below the `md`
                breakpoint existed before this feature. */}
            <button
                onClick={() => setSheetOpen(true)}
                className="md:hidden inline-flex p-3 rounded-lg bg-surface hover:bg-surface-raised text-text-secondary border border-border-default shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                title={label}
                aria-label={label}
            >
                <SlidersHorizontal className="w-5 h-5" />
            </button>

            <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={label}>
                <FacilitatorTabList
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    timerBadge={getTimerBadge()}
                    sentimentBadge={getSentimentBadge()}
                    teamMoodBadge={getTeamMoodBadge()}
                    notesBadge={undefined}
                    idPrefix="facilitator-mobile"
                />
                <div
                    id={`facilitator-mobile-tabpanel-${activeTab}`}
                    role="tabpanel"
                    aria-labelledby={`facilitator-mobile-tab-${activeTab}`}
                    tabIndex={0}
                    className="p-4"
                >
                    {renderTabContent()}
                </div>
            </BottomSheet>
        </>
    );
};

export default FacilitatorMenu;
