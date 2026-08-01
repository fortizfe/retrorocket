export type ConnectionOrigin = 'desktop' | 'mobile' | 'web' | 'unknown';

const DESKTOP_MARKERS = ['electron'];
const MOBILE_MARKERS = ['mobile', 'android', 'iphone', 'ipad'];
const BROWSER_MARKERS = ['mozilla', 'chrome', 'safari', 'firefox', 'edge', 'opera'];

/**
 * Classifies a connection's origin from the User-Agent header present on the consent-
 * decision request (research.md §2/§3) — never from IP address or location. Pure and
 * total: always returns one of the four categories, never throws.
 */
export function classifyOrigin(userAgent: string | undefined): ConnectionOrigin {
    if (!userAgent) return 'unknown';
    const ua = userAgent.toLowerCase();
    if (DESKTOP_MARKERS.some((marker) => ua.includes(marker))) return 'desktop';
    if (MOBILE_MARKERS.some((marker) => ua.includes(marker))) return 'mobile';
    if (BROWSER_MARKERS.some((marker) => ua.includes(marker))) return 'web';
    return 'unknown';
}
