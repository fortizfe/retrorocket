import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ThemeToggle: React.FC = () => {
    const { t } = useTranslation();
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        // Check if theme is stored in localStorage
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            setIsDark(true);
            document.documentElement.classList.add('dark');
        } else {
            setIsDark(false);
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);

        if (newTheme) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="
        relative flex items-center justify-center
        w-10 h-10 rounded-lg
        bg-surface-raised hover:bg-surface
        border border-border-default
        transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface
      "
            aria-label={isDark ? t('header.switchToLight') : t('header.switchToDark')}
            title={isDark ? t('header.switchToLight') : t('header.switchToDark')}
        >
            <motion.div
                initial={false}
                animate={{
                    scale: isDark ? 0 : 1,
                    rotate: isDark ? 180 : 0,
                }}
                transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 10,
                }}
                className="absolute"
            >
                <Sun className="w-5 h-5 text-amber-500" />
            </motion.div>

            <motion.div
                initial={false}
                animate={{
                    scale: isDark ? 1 : 0,
                    rotate: isDark ? 0 : -180,
                }}
                transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 10,
                }}
                className="absolute"
            >
                <Moon className="w-5 h-5 text-blue-400" />
            </motion.div>
        </motion.button>
    );
};

export default ThemeToggle;
