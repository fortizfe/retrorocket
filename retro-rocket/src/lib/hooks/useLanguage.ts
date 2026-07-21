import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

export const useLanguage = () => {
    const { i18n, t } = useTranslation();

    const currentLanguage = i18n.language;

    const changeLanguage = useCallback((language: string) => {
        i18n.changeLanguage(language);
    }, [i18n]);

    const getAvailableLanguages = useCallback(() => [
        { code: 'es', name: 'Español', flag: '🇪🇸' },
        { code: 'en', name: 'English', flag: '🇺🇸' }
    ], []);

    return {
        currentLanguage,
        changeLanguage,
        getAvailableLanguages,
        t
    };
};
