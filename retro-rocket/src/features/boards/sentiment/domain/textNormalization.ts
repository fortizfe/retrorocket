/** Minimum non-whitespace characters worth analysing (FR-005). */
const MIN_CHARS = 3;
/** Character cap kept well within the model's 512-token limit (FR-002). */
const MAX_CHARS = 512;

const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/gi;

/**
 * Normalizes card text for inference (F2): trims, collapses internal whitespace,
 * strips bare URLs (no sentiment signal, wasted tokens), and caps length on a word
 * boundary. Returns `null` when fewer than 3 non-whitespace characters remain, which
 * the worker turns into a deterministic neutral/confidence-0 outcome (FR-005).
 */
export function normalizeForInference(content: string): string | null {
    if (!content) return null;

    const withoutUrls = content.replace(URL_PATTERN, ' ');
    const collapsed = withoutUrls.replace(/\s+/g, ' ').trim();

    const nonWhitespaceLength = collapsed.replace(/\s/g, '').length;
    if (nonWhitespaceLength < MIN_CHARS) return null;

    if (collapsed.length <= MAX_CHARS) return collapsed;

    const capped = collapsed.slice(0, MAX_CHARS);
    const lastSpace = capped.lastIndexOf(' ');
    // Cut on the last word boundary; fall back to the hard cap for a single long token.
    return (lastSpace > 0 ? capped.slice(0, lastSpace) : capped).trim();
}
