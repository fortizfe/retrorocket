import React, { useState } from 'react';
import { FloatingPortal, FloatingFocusManager } from '@floating-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Menu,
    X
} from 'lucide-react';
import { useCountdown } from '@/features/boards/countdown/hooks/useCountdown';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useSentimentContext } from '@/features/boards/sentiment';
import { useBoardMenuOverlay } from '@/features/boards/retrospective/hooks/useBoardMenuOverlay';
import FacilitatorMenuTabs from '@/features/boards/facilitator/components/FacilitatorMenuTabs';
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
 * Owner-only facilitator panel, rebuilt on the shared `useBoardMenuOverlay`
 * (feature 033, tasks.md T013/T046) — previously hand-rolled positioning
 * (manual `getBoundingClientRect` math), outside-click (`mousedown`), and
 * Escape-key listeners, all now provided by the shared hook. `role: 'dialog'`
 * since this is a large multi-tab panel, not a simple dropdown menu.
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

    const { open, setOpen, context, refs, floatingStyles, getReferenceProps, getFloatingProps } = useBoardMenuOverlay({
        placement: 'bottom-end',
        role: 'dialog',
    });

    const { countdownState } = useCountdown(retrospectiveId, timer);

    // Lock body scroll while the panel is open (unrelated to positioning).
    useBodyScrollLock(open);

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
                className="p-2.5 rounded-lg bg-surface-raised/80 hover:bg-surface-raised text-text-secondary hover:text-text-primary shadow-sm hover:shadow-md transition-[background-color,color,box-shadow] duration-200 backdrop-blur-sm flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                title={t('retrospective.facilitator.controls')}
                aria-label={t('retrospective.facilitator.controls')}
            >
                <motion.div
                    animate={{ rotate: open ? 90 : 0 }}
                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                >
                    {open ? (
                        <X className="w-5 h-5" />
                    ) : (
                        <Menu className="w-5 h-5" />
                    )}
                </motion.div>
                <span className="hidden lg:inline font-medium">{t('retrospective.facilitator.menu')}</span>
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
                                aria-label={t('retrospective.facilitator.controls')}
                                className="z-[99999]"
                            >
                                <motion.div
                                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                    transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
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
        </>
    );
};

export default FacilitatorMenu;
