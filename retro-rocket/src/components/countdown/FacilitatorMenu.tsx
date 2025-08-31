import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Menu,
    X
} from 'lucide-react';
import { useCountdown } from '../../hooks/useCountdown';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useLanguage } from '../../hooks/useLanguage';
import FacilitatorMenuTabs from '../facilitator/FacilitatorMenuTabs';
import TimerTab from '../facilitator/TimerTab';
import SentimentTab from '../facilitator/SentimentTab';
import NotesTab from '../facilitator/NotesTab';
import TeamMoodTab from '../facilitator/TeamMoodTab';
import ControlsTab from '../facilitator/ControlsTab';

interface FacilitatorMenuProps {
    retrospectiveId: string;
    facilitatorId: string;
    isOwner: boolean;
    cards?: any[];
    columnConfigs?: Record<string, any>;
    sentimentAnalysis?: {
        enabled: boolean;
        ready: boolean;
        loading: boolean;
        error?: string;
        config: any;
        results?: Map<string, any>;
        setEnabled: (enabled: boolean) => void;
        updateConfig: (updates: any) => void;
        getSentimentCounts: () => { positive: number; negative: number; neutral: number; total: number };
    };
}

const FacilitatorMenu: React.FC<FacilitatorMenuProps> = ({
    retrospectiveId,
    facilitatorId,
    isOwner,
    cards = [],
    columnConfigs = {},
    sentimentAnalysis
}) => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('timer');
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
            case 'timer':
                return <TimerTab retrospectiveId={retrospectiveId} />;
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
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        <p>Análisis de sentimientos no disponible</p>
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
                return <ControlsTab />;
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
                className="p-2.5 rounded-lg bg-white/80 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200/50 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm hover:shadow-md transition-all duration-200 backdrop-blur-sm flex items-center gap-2"
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
