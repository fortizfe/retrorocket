import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useInViewVideo } from '@/features/landing/hooks/useInViewVideo';

type ObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

let capturedCallback: ObserverCallback | null = null;
const play = vi.fn();
const pause = vi.fn();

function TestVideo() {
    const { ref } = useInViewVideo<HTMLVideoElement>();
    // Test double for the hook's play()/pause() wiring, not real user-facing
    // video content (the real SectionMedia usage is silent/decorative, FR-007).
    // eslint-disable-next-line jsx-a11y/media-has-caption
    return <video ref={ref} data-testid="video" />;
}

beforeEach(() => {
    capturedCallback = null;
    play.mockReset().mockResolvedValue(undefined);
    pause.mockReset();

    // Real jsdom <video> elements throw "not implemented" for play()/pause();
    // stub them so the hook's calls resolve/return like a real browser would.
    window.HTMLMediaElement.prototype.play = play;
    window.HTMLMediaElement.prototype.pause = pause;

    // Local override of the global IntersectionObserver stub (src/test/setup.ts)
    // so this test can capture and manually invoke the callback.
    class FakeIntersectionObserver {
        constructor(callback: ObserverCallback) {
            capturedCallback = callback;
        }
        observe = vi.fn();
        disconnect = vi.fn();
        unobserve = vi.fn();
    }
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('useInViewVideo (research.md #3, FR-007)', () => {
    it('calls play() when the video enters view', () => {
        render(<TestVideo />);
        expect(screen.getByTestId('video')).toBeInTheDocument();

        capturedCallback?.([{ isIntersecting: true }]);

        expect(play).toHaveBeenCalled();
    });

    it('calls pause() once the video scrolls out of view', () => {
        render(<TestVideo />);

        capturedCallback?.([{ isIntersecting: true }]);
        capturedCallback?.([{ isIntersecting: false }]);

        expect(pause).toHaveBeenCalled();
    });
});
