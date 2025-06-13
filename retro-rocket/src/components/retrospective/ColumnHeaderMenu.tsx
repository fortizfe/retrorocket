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
                    flex items-center gap-1 px-2 py-1 rounded-md text-xs
                    transition-all duration-200 hover:bg-gray-100
                    ${menuOpen ? 'bg-gray-100 shadow-sm' : ''}
                    ${currentGrouping !== 'none' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-600'}
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
                        className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[220px]"
                        aria-label="Opciones de agrupación"
                    >
                        {GROUPING_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleGroupingSelect(option.value)}
                                className={`
                                    w-full flex items-center justify-between px-3 py-2 text-xs
                                    transition-colors hover:bg-gray-50
                                    ${currentGrouping === option.value ? 'text-blue-600 bg-blue-50' : 'text-gray-700'}
                                `}
                                aria-label={`${option.label}: ${option.description}`}
                            >
                                <div className="flex items-center gap-2">
                                    <option.icon className="w-4 h-4" />
                                    <div className="text-left">
                                        <div className="font-medium">{option.label}</div>
                                        {option.description && (
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                {option.description}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {currentGrouping === option.value && (
                                    <CheckCircle className="w-3 h-3 text-blue-600" />
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
