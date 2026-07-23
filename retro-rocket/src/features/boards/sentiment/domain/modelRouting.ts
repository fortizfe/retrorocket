import type { ModelConfig } from '@/features/boards/types/sentiment';
import type { DetectedLanguage } from '@/features/boards/sentiment/domain/languageDetection';

/**
 * Resolves a detected card language to the model id that should classify it
 * (FR-008/FR-009). Pure and unit-testable without any model download (FR-014).
 *
 * Routing rule:
 *  - a language-specific model (`language === 'es' | 'en'`) is used when one is
 *    configured for that language;
 *  - otherwise, and always for `'unknown'`, the multilingual default is used.
 *
 * The multilingual default is the model tagged `language: 'multilingual'`, falling
 * back to the `primary` model, then the first configured model — so routing always
 * yields a valid model id and never errors (FR-009).
 */
export function routeModel(
    language: DetectedLanguage,
    models: ModelConfig[]
): string {
    const fallback =
        models.find(m => m.language === 'multilingual') ??
        models.find(m => m.primary) ??
        models[0];

    if (language !== 'unknown') {
        const match = models.find(m => m.language === language);
        if (match) return match.id;
    }
    return fallback.id;
}

/**
 * True when the loaded model set actually enables per-language routing: at least
 * one language-specific model AND a multilingual/default to fall back to. When
 * false, the worker analyses every card with the single loaded model (the default
 * single-model behaviour preserved from 011).
 */
export function routingEnabled(models: ModelConfig[]): boolean {
    const hasLanguageSpecific = models.some(m => m.language === 'es' || m.language === 'en');
    return hasLanguageSpecific && models.length > 1;
}
