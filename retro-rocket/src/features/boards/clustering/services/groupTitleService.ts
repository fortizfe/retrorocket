import { Card } from '@/features/boards/types/card';

/** Small built-in ES+EN stopword list — no NLP dependency (research.md §1). Only
 * covers common function words; not exhaustive by design (Constitution V). */
const STOPWORDS = new Set([
    // Spanish
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'a', 'en', 'y', 'o', 'u',
    'que', 'se', 'su', 'sus', 'por', 'para', 'con', 'sin', 'es', 'son', 'muy', 'mas', 'más', 'no', 'si', 'sí',
    'lo', 'le', 'les', 'como', 'pero', 'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas',
    'hay', 'ha', 'han', 'fue', 'ser', 'estar', 'está', 'están', 'nos', 'me', 'te', 'mi', 'tu', 'yo', 'tú',
    'él', 'ella', 'ellos', 'ellas', 'nosotros', 'vosotros', 'ustedes', 'todo', 'todos', 'toda', 'todas',
    // English
    'the', 'a', 'an', 'of', 'in', 'on', 'and', 'or', 'to', 'for', 'with', 'without', 'is', 'are', 'was',
    'were', 'be', 'been', 'being', 'it', 'this', 'that', 'these', 'those', 'there', 'has', 'have', 'had',
    'not', 'no', 'yes', 'we', 'you', 'they', 'he', 'she', 'i', 'my', 'your', 'our', 'their', 'his', 'her',
    'its', 'as', 'at', 'by', 'from', 'but', 'so', 'if', 'than', 'then', 'too', 'very', 'can', 'could',
    'should', 'would', 'will', 'just', 'about', 'into', 'over', 'under', 'out', 'up', 'down', 'all',
]);

const MIN_TOKEN_LENGTH = 3;
const MAX_TOKENS_IN_TITLE = 4;

function tokenize(text: string): string[] {
    return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function capitalize(text: string): string {
    return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1);
}

function cleanSnippet(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}

/** Trims to at most `maxLength` chars, cutting only at a whole-word boundary — never
 * mid-word, never appends an ellipsis (spec.md Assumptions: the limit is on the title
 * text itself). Falls back to a hard cut only when a single token exceeds `maxLength`. */
function truncateAtWordBoundary(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    const slice = text.slice(0, maxLength);
    const lastSpace = slice.lastIndexOf(' ');
    const trimmed = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
    return trimmed.trim();
}

/** Ranks each distinct, non-stopword token by the number of *distinct* member cards
 * it appears in (document frequency within the group) — rewards terms shared across
 * cards over a term one card merely repeats (research.md §1 step 3). */
function rankSharedTokens(cards: Card[]): string[] {
    const scoreByToken = new Map<string, number>();
    const firstSeenOrder: string[] = [];

    for (const card of cards) {
        const tokensInCard = new Set(
            tokenize(card.content).filter(token => token.length >= MIN_TOKEN_LENGTH && !STOPWORDS.has(token))
        );
        for (const token of tokensInCard) {
            if (!scoreByToken.has(token)) {
                scoreByToken.set(token, 0);
                firstSeenOrder.push(token);
            }
            scoreByToken.set(token, scoreByToken.get(token)! + 1);
        }
    }

    // Stable sort by descending score; ties keep first-appearance order (determinism).
    return [...firstSeenOrder].sort((a, b) => scoreByToken.get(b)! - scoreByToken.get(a)!);
}

/**
 * Derives a short (<=`maxLength` char), non-empty, deterministic title for a proposed
 * group of cards, from the cards' own text — no model, no network call
 * (contracts/group-title-suggestion-contract.md). Pure and synchronous so it fits
 * within the same latency budget already required for grouping suggestions to appear
 * (spec.md FR-001a).
 */
export function suggestGroupTitle(cards: Card[], maxLength = 35): string {
    const rankedTokens = rankSharedTokens(cards);

    if (rankedTokens.length > 0) {
        const phrase = capitalize(rankedTokens.slice(0, MAX_TOKENS_IN_TITLE).join(' '));
        return truncateAtWordBoundary(phrase, maxLength);
    }

    // No candidate tokens at all (e.g. every member card is very short or entirely
    // stopwords) — fall back to a snippet of the first member card so a title is
    // always produced (research.md §1 step 6), never blank.
    const fallbackSource = cleanSnippet(cards[0]?.content ?? '');
    return truncateAtWordBoundary(capitalize(fallbackSource), maxLength);
}
