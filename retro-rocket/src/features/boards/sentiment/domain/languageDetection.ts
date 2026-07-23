/**
 * Lightweight, on-device ES/EN language detection for per-card model routing
 * (FR-008). Zero-dependency heuristic: Spanish diacritics/punctuation are a strong
 * signal, plus a stop-word tally for each language. Short, informal retro cards are
 * the target, so detection must be cheap and MUST degrade to `'unknown'` (never
 * throw) so the caller can fall back to the multilingual default model (FR-009).
 *
 * This is intentionally NOT a full language classifier — the runtime only ever needs
 * to pick between Spanish, English, or "not sure" for routing.
 */
export type DetectedLanguage = 'es' | 'en' | 'unknown';

/** Diacritics / punctuation that only appear in Spanish among the two supported locales. */
const ES_MARKERS = /[áéíóúñü¿¡]/i;

const ES_WORDS = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al',
    'que', 'y', 'o', 'en', 'con', 'por', 'para', 'se', 'es', 'son', 'muy',
    'mas', 'pero', 'fue', 'fueron', 'esta', 'este', 'esto', 'esa', 'ese',
    'como', 'todo', 'todos', 'nada', 'porque', 'cuando', 'hacer', 'tiempo',
    'equipo', 'trabajo', 'reunion', 'reuniones', 'entregas', 'bien', 'mal',
    'falta', 'falto', 'sin', 'nos', 'hubo', 'sprint', 'iteracion',
]);

const EN_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'with', 'for',
    'we', 'they', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were',
    'been', 'be', 'very', 'too', 'but', 'had', 'have', 'has', 'because', 'when',
    'make', 'made', 'time', 'team', 'work', 'meeting', 'meetings', 'great',
    'good', 'bad', 'lack', 'behind', 'really', 'everything', 'without', 'into',
    'from', 'our', 'lot', 'lots',
]);

const WORD_RE = /[\p{L}]+/gu;

/**
 * Returns the detected language of `text`, or `'unknown'` when there is no clear
 * signal (empty text, ties, or no recognised markers). Never throws.
 */
export function detectLanguage(text: string): DetectedLanguage {
    if (!text) return 'unknown';
    const lower = text.toLowerCase();

    let es = 0;
    let en = 0;

    // A Spanish diacritic/¿¡ is a strong, near-unambiguous signal.
    if (ES_MARKERS.test(lower)) es += 2;

    const words = lower.match(WORD_RE) ?? [];
    for (const w of words) {
        if (ES_WORDS.has(w)) es += 1;
        if (EN_WORDS.has(w)) en += 1;
    }

    if (es === en) return 'unknown';
    return es > en ? 'es' : 'en';
}
