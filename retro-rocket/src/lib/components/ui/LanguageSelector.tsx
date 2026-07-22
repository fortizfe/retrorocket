import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/hooks/useLanguage';

interface LanguageSelectorProps {
    className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
    const { currentLanguage, changeLanguage, getAvailableLanguages, t } = useLanguage();
    const [showDropdown, setShowDropdown] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

    const languages = getAvailableLanguages();
    const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

    const handleLanguageChange = (languageCode: string) => {
        changeLanguage(languageCode);
        setShowDropdown(false);
    };

    const calculateDropdownPosition = () => {
        if (!buttonRef.current) return;

        const buttonRect = buttonRef.current.getBoundingClientRect();
        const dropdownWidth = 140;
        const viewportWidth = window.innerWidth;

        let left = buttonRect.right - dropdownWidth;
        if (left < 10) {
            left = buttonRect.left;
        }

        setDropdownPosition({
            top: buttonRect.bottom + 8,
            left: left
        });
    };

    const handleToggle = () => {
        if (!showDropdown) {
            calculateDropdownPosition();
        }
        setShowDropdown(!showDropdown);
    };

    useEffect(() => {
        const handleResize = () => {
            if (showDropdown) {
                calculateDropdownPosition();
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [showDropdown]);

    const dropdownContent = showDropdown ? (
        <>
            {/* Backdrop */}
            <button
                className="fixed inset-0 z-40 bg-transparent border-none cursor-default"
                onClick={() => setShowDropdown(false)}
                aria-label={t('header.closeLanguageSelector')}
            />

            {/* Dropdown Menu */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.15 }}
                className="fixed z-50 bg-surface-overlay rounded-lg shadow-lg border border-border-default py-2 min-w-[140px]"
                style={{
                    top: dropdownPosition.top,
                    left: dropdownPosition.left
                }}
            >
                {languages.map((language) => (
                    <button
                        key={language.code}
                        onClick={() => handleLanguageChange(language.code)}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm 
                           transition-colors hover:bg-surface-raised
                           ${currentLanguage === language.code
                                ? 'text-info-fg bg-info-bg'
                                : 'text-text-secondary'
                            }`}
                    >
                        <span className="text-base">{language.flag}</span>
                        <span className="font-medium">{language.name}</span>
                    </button>
                ))}
            </motion.div>
        </>
    ) : null;

    return (
        <div className={className}>
            <button
                ref={buttonRef}
                onClick={handleToggle}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium 
                           text-text-secondary 
                           hover:text-text-primary 
                           hover:bg-surface-raised 
                           transition-all duration-200"
                title="Change language"
            >
                <Languages className="w-4 h-4" />
                <span className="hidden sm:inline">{currentLang.flag}</span>
                <span className="hidden md:inline">{currentLang.name}</span>
            </button>

            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {dropdownContent}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default LanguageSelector;
