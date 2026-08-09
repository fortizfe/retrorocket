import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, StickyNote, X, Users, Settings, LucideIcon } from 'lucide-react';
import { useLanguage } from '@/lib/hooks/useLanguage';

interface Tab {
    id: string;
    label: string;
    icon: LucideIcon;
    badge?: number | string;
}

interface FacilitatorMenuTabsProps {
    activeTab: string;
    onTabChange: (tabId: string) => void;
    onClose: () => void;
    timerBadge?: string;
    notesBadge?: number;
    sentimentBadge?: string;
    teamMoodBadge?: string;
    children: React.ReactNode;
}

const FacilitatorMenuTabs: React.FC<FacilitatorMenuTabsProps> = ({
    activeTab,
    onTabChange,
    onClose,
    timerBadge,
    notesBadge,
    sentimentBadge,
    teamMoodBadge,
    children
}) => {
    const { t } = useLanguage();

    const tabs: Tab[] = [
        {
            id: 'controls',
            label: t('retrospective.facilitator.tabs.controls'),
            icon: Settings,
            badge: timerBadge
        },
        {
            id: 'team-mood',
            label: t('retrospective.facilitator.tabs.teamMood'),
            icon: Users,
            badge: teamMoodBadge
        },
        {
            id: 'sentiment',
            label: t('retrospective.facilitator.tabs.sentiment'),
            icon: Brain,
            badge: sentimentBadge
        },
        {
            id: 'notes',
            label: t('retrospective.facilitator.tabs.notes'),
            icon: StickyNote,
            badge: notesBadge
        }
    ];

    return (
        <div className="w-96 max-w-[90vw] bg-surface-raised/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border-default/40 overflow-hidden">
            {/* Header with tabs */}
            <div className="border-b border-border-default/60">
                <div className="flex items-center justify-end p-4 pb-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-text-secondary transition-colors focus-visible:ring-2 focus-visible:ring-focus"
                            title={t('common.close')}
                            aria-label={t('common.close')}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Tab Navigation — real ARIA tabs pattern (role="tablist"/"tab", aria-selected,
                    aria-controls linking each tab to its panel below), replacing the previous
                    plain-button row with no tab semantics at all (contracts/
                    accessibility-interaction-contract.md). Arrow-key navigation between tabs
                    per the WAI-ARIA tabs pattern. */}
                <div role="tablist" aria-label={t('retrospective.facilitator.controls')} className="flex px-4 pb-3 gap-1">
                    {tabs.map((tab, index) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                id={`facilitator-tab-${tab.id}`}
                                role="tab"
                                aria-selected={isActive}
                                aria-controls={`facilitator-tabpanel-${tab.id}`}
                                tabIndex={isActive ? 0 : -1}
                                onClick={() => onTabChange(tab.id)}
                                onKeyDown={(e) => {
                                    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                                    e.preventDefault();
                                    const nextIndex = e.key === 'ArrowRight'
                                        ? (index + 1) % tabs.length
                                        : (index - 1 + tabs.length) % tabs.length;
                                    onTabChange(tabs[nextIndex].id);
                                    document.getElementById(`facilitator-tab-${tabs[nextIndex].id}`)?.focus();
                                }}
                                className={`
                                    group relative flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-lg text-xs font-medium transition-[background-color,color,box-shadow] duration-200 min-w-[70px] flex-1 focus-visible:ring-2 focus-visible:ring-focus
                                    ${isActive
                                        ? 'bg-surface text-info-fg shadow-sm'
                                        : 'text-text-secondary hover:text-text-primary hover:bg-surface/60'
                                    }
                                `}
                                title={tab.label}
                            >
                                <div className="relative">
                                    <Icon className="w-4 h-4" />

                                    {tab.badge && (
                                        <motion.span
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                                            className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center bg-action text-text-inverse"
                                        >
                                            {tab.badge}
                                        </motion.span>
                                    )}
                                </div>

                                <span className={`
                                    leading-tight text-center max-w-full truncate
                                    ${isActive ? 'text-[10px] font-semibold' : 'text-[10px]'}
                                `}>
                                    {tab.label}
                                </span>

                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-info-fg rounded-full"
                                        transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="max-h-[65vh] overflow-y-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        id={`facilitator-tabpanel-${activeTab}`}
                        role="tabpanel"
                        aria-labelledby={`facilitator-tab-${activeTab}`}
                        tabIndex={0}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                        className="p-6"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default FacilitatorMenuTabs;
