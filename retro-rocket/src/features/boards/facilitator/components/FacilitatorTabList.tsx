import React from 'react';
import { motion } from 'framer-motion';
import { Brain, StickyNote, Users, Settings, LucideIcon } from 'lucide-react';
import { useLanguage } from '@/lib/hooks/useLanguage';

interface Tab {
    id: string;
    label: string;
    icon: LucideIcon;
    badge?: number | string;
}

export interface FacilitatorTabListProps {
    activeTab: string;
    onTabChange: (tabId: string) => void;
    timerBadge?: string;
    notesBadge?: number;
    sentimentBadge?: string;
    teamMoodBadge?: string;
    /** Namespaces the tab/panel element IDs (`{idPrefix}-tab-{id}` /
     * `{idPrefix}-tabpanel-{id}`) so a desktop instance and a mobile
     * instance can coexist in the DOM without ID collisions — each surface
     * (`FacilitatorMenuTabs.tsx` for desktop, the mobile `BottomSheet` in
     * `FacilitatorMenu.tsx`) renders its own tab content using the same
     * `activeTab` from `FacilitatorMenu.tsx`, but only one is ever visible
     * at the current viewport (`hidden md:*` / `md:hidden`). Defaults to
     * `'facilitator'`, preserving the desktop panel's pre-existing IDs. */
    idPrefix?: string;
}

/**
 * The facilitator menu's tab bar — a real WAI-ARIA tabs pattern (feature
 * 033), extracted out of `FacilitatorMenuTabs.tsx` (feature 036) so the new
 * mobile `BottomSheet` entry point (FR-013a) can reuse the identical tab
 * bar instead of duplicating it, per Constitution Principle II.
 * `FacilitatorMenuTabs.tsx` still owns the desktop panel's outer frame and
 * close button; this component owns only the tablist itself.
 */
const FacilitatorTabList: React.FC<FacilitatorTabListProps> = ({
    activeTab,
    onTabChange,
    timerBadge,
    notesBadge,
    sentimentBadge,
    teamMoodBadge,
    idPrefix = 'facilitator',
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
        <div role="tablist" aria-label={t('retrospective.facilitator.controls')} className="flex px-4 pb-3 gap-1">
            {tabs.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                    <button
                        key={tab.id}
                        id={`${idPrefix}-tab-${tab.id}`}
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`${idPrefix}-tabpanel-${tab.id}`}
                        tabIndex={isActive ? 0 : -1}
                        onClick={() => onTabChange(tab.id)}
                        onKeyDown={(e) => {
                            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                            e.preventDefault();
                            const nextIndex = e.key === 'ArrowRight'
                                ? (index + 1) % tabs.length
                                : (index - 1 + tabs.length) % tabs.length;
                            onTabChange(tabs[nextIndex].id);
                            document.getElementById(`${idPrefix}-tab-${tabs[nextIndex].id}`)?.focus();
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
                                    initial={{ transform: 'scale(0.9)', opacity: 0 }}
                                    animate={{ transform: 'scale(1)', opacity: 1 }}
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
                                layoutId={`${idPrefix}-activeTab`}
                                className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-info-fg rounded-full"
                                transition={{ type: "spring", bounce: 0.15, duration: 0.28 }}
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default FacilitatorTabList;
