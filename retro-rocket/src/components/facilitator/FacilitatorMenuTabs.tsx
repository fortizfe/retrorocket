import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Brain, StickyNote, X, Users } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

interface Tab {
    id: string;
    label: string;
    icon: React.ComponentType<any>;
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
            id: 'timer',
            label: t('retrospective.facilitator.tabs.timer'),
            icon: Timer,
            badge: timerBadge
        },
        {
            id: 'sentiment',
            label: t('retrospective.facilitator.tabs.sentiment'),
            icon: Brain,
            badge: sentimentBadge
        },
        {
            id: 'team-mood',
            label: t('retrospective.facilitator.tabs.teamMood'),
            icon: Users,
            badge: teamMoodBadge
        },
        {
            id: 'notes',
            label: t('retrospective.facilitator.tabs.notes'),
            icon: StickyNote,
            badge: notesBadge
        }
    ];

    // Crear labels compactos para mejor distribución
    const getCompactLabel = (label: string) => {
        const compactLabels: Record<string, string> = {
            'Timer': 'Timer',
            'IA': 'IA',
            'Estado del Equipo': 'Equipo',
            'Notas': 'Notas'
        };
        return compactLabels[label] || label;
    };

    return (
        <div className="w-96 max-w-[90vw] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
            {/* Header con tabs */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 border-b border-slate-200 dark:border-slate-600">
                <div className="flex items-center justify-between p-4 pb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                            {t('retrospective.facilitator.controls')}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-slate-600/50 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title={t('common.close')}
                        aria-label={t('common.close')}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex px-4 pb-3 gap-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`
                                    group relative flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 min-w-[70px] flex-1
                                    ${isActive
                                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm scale-105'
                                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white/30 dark:hover:bg-slate-600/30 hover:scale-102'
                                    }
                                `}
                                title={tab.label} // Tooltip para accesibilidad
                            >
                                <div className="relative">
                                    <Icon className="w-4 h-4" />

                                    {/* Badge sobre el icono */}
                                    {tab.badge && (
                                        <motion.span
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className={`
                                                absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center
                                                ${isActive
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-red-500 text-white'
                                                }
                                            `}
                                        >
                                            {tab.badge}
                                        </motion.span>
                                    )}
                                </div>

                                {/* Label compacto - Siempre visible pero truncado si es necesario */}
                                <span className={`
                                    leading-tight text-center max-w-full truncate
                                    ${isActive ? 'text-[10px] font-semibold' : 'text-[10px]'}
                                `}>
                                    {getCompactLabel(tab.label)}
                                </span>

                                {/* Indicador activo */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-blue-500 rounded-full"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="max-h-[65vh] overflow-y-auto bg-white dark:bg-slate-800">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="p-6"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 dark:bg-slate-700/50 px-6 py-3 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    {t('retrospective.facilitator.onlyYouCanSee')}
                </p>
            </div>
        </div>
    );
};

export default FacilitatorMenuTabs;
