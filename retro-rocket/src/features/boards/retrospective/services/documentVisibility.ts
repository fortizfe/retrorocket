/**
 * Wraps the Page Visibility API to fire a callback once the document has been
 * continuously hidden for `ms` milliseconds (045-idle-connection-cleanup, FR-001). If
 * the document becomes visible again before that threshold, the pending callback is
 * cancelled with no observable effect. `onResume` fires only when the document becomes
 * visible again *after* `onHidden` already fired for that same hidden period — never
 * for a brief tab switch that never reached the threshold (Edge Case: "returns before
 * the grace period, nothing observable happens").
 */
export function onHiddenFor(ms: number, callbacks: { onHidden: () => void; onResume: () => void }): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let firedForCurrentHiddenPeriod = false;

    function handleVisibilityChange(): void {
        if (document.visibilityState === 'hidden') {
            firedForCurrentHiddenPeriod = false;
            timer = setTimeout(() => {
                timer = undefined;
                firedForCurrentHiddenPeriod = true;
                callbacks.onHidden();
            }, ms);
            return;
        }

        if (timer !== undefined) {
            clearTimeout(timer);
            timer = undefined;
        }
        if (firedForCurrentHiddenPeriod) {
            firedForCurrentHiddenPeriod = false;
            callbacks.onResume();
        }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
        if (timer !== undefined) clearTimeout(timer);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
}
