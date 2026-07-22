import React from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Props = {
    onClose?: () => void;
};

const languageNames: Record<string, string> = {
    es: 'Español',
    en: 'English'
};

const LanguageMenuList: React.FC<Props> = ({ onClose }) => {
    const { i18n } = useTranslation();

    // Determine available languages from i18n resources as a safe fallback
    const available = Object.keys(i18n.options?.resources || {});

    const langs = available.length > 0 ? available : (i18n.languages || ['en']);

    const change = async (lng: string) => {
        try {
            await i18n.changeLanguage(lng);
        } catch (err) {
            console.error('Error changing language', err);
        }
        if (onClose) onClose();
    };

    return (
        <div>
            {langs.map((lng) => {
                const code = String(lng);
                const active = Boolean(i18n.language?.startsWith(code));

                const flag = (() => {
                    if (code === 'es') return '🇪🇸';
                    if (code === 'en') return '🇺🇸';
                    return '🌐';
                })();

                return (
                    <button
                        key={code}
                        role="menuitemradio"
                        aria-checked={active}
                        onClick={() => change(code)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-2 text-sm text-text-secondary hover:bg-surface-raised transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-lg leading-none">{flag}</span>
                            <span>{languageNames[code] || code}</span>
                        </div>

                        {active ? <Check className="w-4 h-4 text-primary-600" /> : <span className="w-4 h-4" />}
                    </button>
                );
            })}
        </div>
    );
};

export default LanguageMenuList;
