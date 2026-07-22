import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Menu,
    X
} from 'lucide-react';
import { useCountdown } from '@/features/boards/countdown/hooks/useCountdown';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useSentimentContext } from '@/features/boards/sentiment/contexts/SentimentContext';
import FacilitatorMenuTabs from '@/features/boards/facilitator/components/FacilitatorMenuTabs';
import SentimentTab from '@/features/boards/facilitator/components/SentimentTab';
import NotesTab from '@/features/boards/facilitator/components/NotesTab';
import TeamMoodTab from '@/features/boards/facilitator/components/TeamMoodTab';
import ControlsTab from '@/features/boards/facilitator/components/ControlsTab';
import { Card } from '@/features/boards/types/card';
import { DynamicColumnConfig } from '@/features/boards/retrospective/hooks/useRetrospectiveColumns';

interface FacilitatorMenuProps {
    retrospectiveId: string;
    facilitatorId: string;
    isOwner: boolean;
    cards?: Card[];
    columnConfigs?: Record<string, DynamicColumnConfig>;
}

const FacilitatorMenu: React.FC<FacilitatorMenuProps> = ({
    retrospectiveId,
    facilitatorId,
    isOwner,
    cards = [],
    columnConfigs = {},
}) => {
    const { t } = useLanguage();
    const sentimentAnalysis = useSentimentContext();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('controls');
    const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);

    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const {
        timer,
        countdownState,
    } = useCountdown(retrospectiveId);

    // Bloquear scroll cuando el menú esté abierto
    useBodyScrollLock(isOpen);

    // Update trigger position when opening
    const handleToggle = useCallback(() => {
        if (!isOpen && buttonRef.current) {
            setTriggerRect(buttonRef.current.getBoundingClientRect());
        }
        setIsOpen(!isOpen);
    }, [isOpen]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                isOpen &&
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Close menu on escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen]);

    // Calculate position for the dropdown
    const getPositionStyles = () => {
        if (!triggerRect) return {};

        const dropdownWidth = 384; // w-96 = 384px
        const maxHeight = window.innerHeight * 0.8; // max-h-[80vh]
        const spacing = 8;

        // Calculate left position - always position to the left of the trigger
        const left = Math.max(spacing, triggerRect.right - dropdownWidth);

        // Calculate top position with viewport bounds checking
        let top = triggerRect.bottom + spacing;

        // Check if dropdown would go below viewport
        if (top + maxHeight > window.innerHeight - spacing) {
            // Position above the trigger if there's more space
            const spaceAbove = triggerRect.top - spacing;
            const spaceBelow = window.innerHeight - triggerRect.bottom - spacing;

            if (spaceAbove > spaceBelow && spaceAbove >= 200) {
                top = Math.max(spacing, triggerRect.top - maxHeight - spacing);
            } else {
                // Keep below but adjust to fit in viewport
                top = Math.max(spacing, window.innerHeight - maxHeight - spacing);
            }
        }

        return {
            left: `${left}px`,
            top: `${top}px`,
        };
    };

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
        setIsOpen(false);
    };

    // Controls handled inside the Controls tab

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
                    />
                );
            case 'controls':
                return <ControlsTab retrospectiveId={retrospectiveId} />;
            default:
                return null;
        }
    };

    // Solo mostrar el menú si el usuario es el propietario
    if (!isOwner) {
        return null;
    }

    return (
        <div className="relative">
            {/* Hamburger Menu Button */}
            <button
                ref={buttonRef}
                onClick={handleToggle}
                className="p-2.5 rounded-lg bg-surface-raised/80 hover:bg-surface-raised text-text-secondary hover:text-text-primary border border-border-default/50 hover:border-border-strong shadow-sm hover:shadow-md transition-all duration-200 backdrop-blur-sm flex items-center gap-2"
                title={t('retrospective.facilitator.controls')}
                aria-label={t('retrospective.facilitator.controls')}
                aria-haspopup="true"
            >
                <motion.div
                    animate={{ rotate: isOpen ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {isOpen ? (
                        <X className="w-5 h-5" />
                    ) : (
                        <Menu className="w-5 h-5" />
                    )}
                </motion.div>
                <span className="hidden lg:inline font-medium">{t('retrospective.facilitator.menu')}</span>
            </button>

            {/* Portal Dropdown Menu */}
            {isOpen && createPortal(
                <AnimatePresence>
                    <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed z-[99999]"
                        style={triggerRect ? getPositionStyles() : {}}
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
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default FacilitatorMenu;
