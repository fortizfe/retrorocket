/**
 * Locale-aware date formatting for user-facing dates (e.g. board creation
 * dates on the dashboard). Fixes a pre-existing defect where such dates were
 * hardcoded to the 'es-ES' Intl locale regardless of the viewer's active
 * i18next language (spec 031 FR-016).
 *
 * Pure function by design (language passed in, not read from i18next
 * context internally) so it stays trivially unit-testable and reusable
 * outside a React render — call it with `i18n.language` from
 * `useTranslation()`/`useLanguage()` at the call site.
 */

export type SupportedLanguage = 'en' | 'es';

const INTL_LOCALE_BY_LANGUAGE: Record<SupportedLanguage, string> = {
    en: 'en-US',
    es: 'es-ES',
};

const DEFAULT_OPTIONS: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
};

function resolveIntlLocale(language: string): string {
    return INTL_LOCALE_BY_LANGUAGE[language as SupportedLanguage] ?? INTL_LOCALE_BY_LANGUAGE.es;
}

/**
 * Formats `date` using the Intl locale matching `language` (an i18next
 * language code, e.g. `i18n.language`). Falls back to Spanish formatting for
 * any language code outside the currently supported set, matching this
 * app's other language-fallback conventions.
 */
export function formatLocalizedDate(
    date: Date,
    language: string,
    options: Intl.DateTimeFormatOptions = DEFAULT_OPTIONS
): string {
    return new Intl.DateTimeFormat(resolveIntlLocale(language), options).format(date);
}
