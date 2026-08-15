import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { onHiddenFor } from '@/features/boards/retrospective/services/documentVisibility';

function setVisibility(state: DocumentVisibilityState): void {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    document.dispatchEvent(new Event('visibilitychange'));
}

describe('onHiddenFor', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('fires onHidden after the document has been hidden for the full duration', () => {
        const onHidden = vi.fn();
        const onResume = vi.fn();
        onHiddenFor(120_000, { onHidden, onResume });

        setVisibility('hidden');
        vi.advanceTimersByTime(119_999);
        expect(onHidden).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(onHidden).toHaveBeenCalledTimes(1);
    });

    it('does not fire onHidden if the document becomes visible again before the threshold (no premature pause)', () => {
        const onHidden = vi.fn();
        const onResume = vi.fn();
        onHiddenFor(120_000, { onHidden, onResume });

        setVisibility('hidden');
        vi.advanceTimersByTime(60_000);
        setVisibility('visible');
        vi.advanceTimersByTime(120_000);

        expect(onHidden).not.toHaveBeenCalled();
        expect(onResume).not.toHaveBeenCalled();
    });

    it('fires onResume when visibility returns after onHidden already fired', () => {
        const onHidden = vi.fn();
        const onResume = vi.fn();
        onHiddenFor(120_000, { onHidden, onResume });

        setVisibility('hidden');
        vi.advanceTimersByTime(120_000);
        expect(onHidden).toHaveBeenCalledTimes(1);

        setVisibility('visible');
        expect(onResume).toHaveBeenCalledTimes(1);
    });

    it('handles a second hidden/resume cycle independently of the first', () => {
        const onHidden = vi.fn();
        const onResume = vi.fn();
        onHiddenFor(120_000, { onHidden, onResume });

        setVisibility('hidden');
        vi.advanceTimersByTime(120_000);
        setVisibility('visible');
        expect(onHidden).toHaveBeenCalledTimes(1);
        expect(onResume).toHaveBeenCalledTimes(1);

        setVisibility('hidden');
        vi.advanceTimersByTime(120_000);
        setVisibility('visible');
        expect(onHidden).toHaveBeenCalledTimes(2);
        expect(onResume).toHaveBeenCalledTimes(2);
    });

    it('stops listening once unsubscribed', () => {
        const onHidden = vi.fn();
        const onResume = vi.fn();
        const unsubscribe = onHiddenFor(120_000, { onHidden, onResume });

        unsubscribe();
        setVisibility('hidden');
        vi.advanceTimersByTime(120_000);
        expect(onHidden).not.toHaveBeenCalled();
    });
});
