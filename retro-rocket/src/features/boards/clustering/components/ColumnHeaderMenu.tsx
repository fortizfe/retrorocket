import React, { useState, useRef, useEffect } from 'react';
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
    const { t } = useTranslation();

    // Get grouping options dynamically to respond to language changes
    const groupingOptions = getGroupingOptions(t);

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
        const option = groupingOptions.find(opt => opt.value === criteria);
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
                    transition-all duration-200 hover:bg-surface-raised
                    ${menuOpen ? 'bg-surface shadow-sm' : ''}
                    ${currentGrouping !== 'none' ? 'bg-info-bg text-info-fg border border-info-fg' : 'text-text-secondary border border-border-default'}
                `}
                title="Group cards"
                aria-label="Grouping options"
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
                        className="absolute top-full right-0 mt-1 bg-surface-raised rounded-lg shadow-lg border border-border-default py-1 z-50 min-w-[220px]"
                        aria-label="Grouping options"
                    >
                        {groupingOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleGroupingSelect(option.value)}
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
                )}
            </AnimatePresence>
        </div>
    );
};

export default ColumnHeaderMenu;
