import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ThemeMenuToggleProps {
    className?: string;
}

const ThemeMenuToggle: React.FC<ThemeMenuToggleProps> = ({ className = '' }) => {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            setIsDark(true);
            document.documentElement.classList.add('dark');
        } else {
            setIsDark(false);
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggle = () => {
        const next = !isDark;
        setIsDark(next);

        if (next) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    const { t } = useTranslation();

    return (
        <button
            onClick={toggle}
            aria-pressed={isDark}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
            <div className="w-5 h-5 flex items-center justify-center text-slate-500 dark:text-slate-300">
                {isDark ? <Moon className="w-5 h-5 text-blue-400" /> : <Sun className="w-5 h-5 text-amber-400" />}
            </div>

            <div className="flex-1 text-left">
                <span className="block">{t('header.themeMode')}</span>
            </div>

            <div aria-hidden className="text-xs text-slate-400 dark:text-slate-500" />
        </button>
    );
};

export default ThemeMenuToggle;
