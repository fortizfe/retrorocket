import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import esTranslations from '@/locales/es.json';
import enTranslations from '@/locales/en.json';

const resources = {
    es: {
        translation: esTranslations
    },
    en: {
        translation: enTranslations
    }
};

i18n
    // Detect user language
    .use(LanguageDetector)
    // Pass the i18n instance to react-i18next
    .use(initReactI18next)
    // Initialize i18next
    .init({
        resources,
        fallbackLng: 'es', // Default language if detection fails
        debug: process.env.NODE_ENV === 'development',

        // Language detection options
        detection: {
            // Order of detection methods
            order: ['localStorage', 'navigator', 'htmlTag'],
            // Keys to lookup language from
            lookupLocalStorage: 'retrorocket-language',
            // Cache the language
            caches: ['localStorage']
        },

        // Supported languages
        supportedLngs: ['es', 'en'],

        interpolation: {
            escapeValue: false // React already does escaping
        },

        // Options for translation keys
        keySeparator: '.',
        nsSeparator: false,

        // React specific options
        react: {
            useSuspense: false
        }
    });

export default i18n;
