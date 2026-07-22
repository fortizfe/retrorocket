import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, ChevronDown } from 'lucide-react';
import { SentimentFilterProps, SENTIMENT_COLORS } from '@/features/boards/types/sentiment';
import Button from '@/lib/components/ui/Button';

const SentimentFilter: React.FC<SentimentFilterProps> = ({
    currentFilter,
    onFilterChange,
    counts
}) => {
    const [isOpen, setIsOpen] = React.useState(false);

    const filterOptions = [
        {
            value: 'all' as const,
            label: 'Todos',
            count: counts.total,
            icon: '📊',
            colors: {
                bg: 'bg-surface',
                text: 'text-text-primary',
                border: 'border-border-default'
            }
        },
        {
            value: 'positive' as const,
            label: 'Positivos',
            count: counts.positive,
            icon: SENTIMENT_COLORS.positive.icon,
            colors: SENTIMENT_COLORS.positive
        },
        {
            value: 'neutral' as const,
            label: 'Neutrales',
            count: counts.neutral,
            icon: SENTIMENT_COLORS.neutral.icon,
            colors: SENTIMENT_COLORS.neutral
        },
        {
            value: 'negative' as const,
            label: 'Negativos',
            count: counts.negative,
            icon: SENTIMENT_COLORS.negative.icon,
            colors: SENTIMENT_COLORS.negative
        }
    ];

    const currentOption = filterOptions.find(opt => opt.value === currentFilter);

    const handleFilterSelect = (value: typeof currentFilter) => {
        onFilterChange(value);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2 text-xs
                    ${currentFilter !== 'all'
                        ? `${currentOption?.colors.bg} ${currentOption?.colors.text} border ${currentOption?.colors.border}`
                        : 'text-text-secondary'
                    }
                `}
                aria-expanded={isOpen}
                aria-haspopup="true"
                title="Filtrar por sentimiento"
            >
                <Filter className="w-3 h-3" />
                <span>{currentOption?.icon}</span>
                <span>{currentOption?.label}</span>
                {currentFilter !== 'all' && (
                    <span className="bg-surface-raised text-xs px-1.5 py-0.5 rounded-full">
                        {currentOption?.count}
                    </span>
                )}
                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <button
                            type="button"
                            className="fixed inset-0 z-40 bg-transparent"
                            onClick={() => setIsOpen(false)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setIsOpen(false);
                                }
                            }}
                            aria-label="Close filter menu"
                        />

                        {/* Dropdown */}
                        <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full right-0 mt-1 bg-surface-raised 
                                     rounded-lg shadow-lg border border-border-default 
                                     py-1 z-50 min-w-[160px]"
                        >
                            {filterOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => handleFilterSelect(option.value)}
                                    className={`
                                        w-full flex items-center justify-between px-3 py-2 text-xs
                                        transition-colors hover:bg-surface-raised
                                        ${currentFilter === option.value
                                            ? `${option.colors.bg} ${option.colors.text}`
                                            : 'text-text-secondary'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-2">
                                        <span>{option.icon}</span>
                                        <span>{option.label}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className={`
                                            text-xs px-1.5 py-0.5 rounded-full
                                            ${option.value === 'all'
                                                ? 'bg-border-default text-text-secondary'
                                                : `${option.colors.bg} ${option.colors.text}`
                                            }
                                        `}>
                                            {option.count}
                                        </span>

                                        {currentFilter === option.value && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SentimentFilter;
