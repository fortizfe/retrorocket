import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useLanguage } from '@/lib/hooks/useLanguage';
import FacilitatorTabList from '@/features/boards/facilitator/components/FacilitatorTabList';

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

/**
 * The facilitator menu's desktop panel frame — opaque, high-contrast per
 * Direction B "Adaptive Sheet" (feature 036, selected by the product owner):
 * solid `bg-surface-raised`, a visible border, no translucency. The tab bar
 * itself lives in `FacilitatorTabList.tsx`, shared with the new mobile
 * `BottomSheet` entry point in `FacilitatorMenu.tsx` (FR-013a) rather than
 * duplicated here.
 */
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

    return (
        <div className="w-96 max-w-[90vw] bg-surface-raised rounded-xl shadow-2xl border border-border-default overflow-hidden">
            {/* Header with tabs */}
            <div className="border-b border-border-default">
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

                <FacilitatorTabList
                    activeTab={activeTab}
                    onTabChange={onTabChange}
                    timerBadge={timerBadge}
                    notesBadge={notesBadge}
                    sentimentBadge={sentimentBadge}
                    teamMoodBadge={teamMoodBadge}
                />
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
