import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown,
    CheckCircle,
    LayoutGrid
} from 'lucide-react';
import {
    GroupingCriteria,
    GROUPING_OPTIONS
} from '../../types/columnGrouping';

interface ColumnHeaderMenuProps {
    currentGrouping: GroupingCriteria;
    onGroupingChange: (criteria: GroupingCriteria) => void;
    disabled?: boolean;
    hasCards?: boolean;
}

const ColumnHeaderMenu: React.FC<ColumnHeaderMenuProps> = ({
    currentGrouping,
    onGroupingChange,
    disabled = false,
    hasCards = true
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleGroupingSelect = (criteria: GroupingCriteria) => {
        onGroupingChange(criteria);
        setMenuOpen(false);
    };

    const getGroupingIcon = (criteria: GroupingCriteria) => {
        const option = GROUPING_OPTIONS.find(opt => opt.value === criteria);
        const IconComponent = option?.icon;
        return IconComponent ? <IconComponent className="w-3 h-3" /> : null;
    };

    if (disabled || !hasCards) return null;

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`
                    flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium
                    transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-700
                    ${menuOpen ? 'bg-slate-100 dark:bg-slate-700 shadow-sm' : ''}
                    ${currentGrouping !== 'none' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700' : 'text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600'}
                `}
                title="Agrupar tarjetas"
                aria-label="Opciones de agrupación"
                aria-expanded={menuOpen ? "true" : "false"}
                aria-haspopup="true"
            >
                {getGroupingIcon(currentGrouping)}
                <LayoutGrid className="w-3 h-3" />
                <ChevronDown className={`w-3 h-3 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {menuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full right-0 mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50 min-w-[220px]"
                        aria-label="Opciones de agrupación"
                    >
                        {GROUPING_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleGroupingSelect(option.value)}
                                className={`
                                    w-full flex items-center justify-between px-3 py-2 text-xs
                                    transition-colors hover:bg-slate-50 dark:hover:bg-slate-700
                                    ${currentGrouping === option.value ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-700 dark:text-slate-300'}
                                `}
                                aria-label={`${option.label}: ${option.description}`}
                            >
                                <div className="flex items-center gap-2">
                                    <option.icon className="w-4 h-4" />
                                    <div className="text-left">
                                        <div className="font-medium">{option.label}</div>
                                        {option.description && (
                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {option.description}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {currentGrouping === option.value && (
                                    <CheckCircle className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                )}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ColumnHeaderMenu;
