import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SectionMedia from '@/features/landing/components/SectionMedia';
import { MediaAsset } from '@/features/landing/data/types';

function mockMatchMedia(matchesFor: (query: string) => boolean) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: matchesFor(query),
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
}

const screenshotAsset: MediaAsset = {
    sectionKey: 'capabilities',
    kind: 'screenshot',
    productArea: 'test',
    light: { src: '/landing-media/capabilities/light.png' },
    dark: { src: '/landing-media/capabilities/dark.png' },
    capturedAt: '2026-08-12T00:00:00.000Z',
};

const videoAsset: MediaAsset = {
    sectionKey: 'howItWorks',
    kind: 'video',
    productArea: 'test',
    light: { src: '/landing-media/howItWorks/light.webm', poster: '/landing-media/howItWorks/light-poster.png' },
    dark: { src: '/landing-media/howItWorks/dark.webm', poster: '/landing-media/howItWorks/dark-poster.png' },
    capturedAt: '2026-08-12T00:00:00.000Z',
};

afterEach(() => {
    document.documentElement.classList.remove('dark');
    // NOT vi.restoreAllMocks(): that also strips the mockImplementation off the
    // shared global.IntersectionObserver mock (src/test/setup.ts), which is only
    // established once per file, not re-created per test.
    vi.clearAllMocks();
});

describe('SectionMedia (FR-007)', () => {
    it('renders <img> for kind: screenshot', () => {
        mockMatchMedia(() => false);
        render(<SectionMedia asset={screenshotAsset} alt="capabilities" />);

        const img = screen.getByRole('img', { name: 'capabilities' });
        expect(img).toHaveAttribute('src', screenshotAsset.light.src);
    });

    it('renders an autoplay/muted/loop <video> with a poster for kind: video', () => {
        mockMatchMedia(() => false);
        render(<SectionMedia asset={videoAsset} alt="how it works" />);

        const video = document.querySelector('video');
        expect(video).not.toBeNull();
        // React sets `muted`/`loop` as DOM properties, not HTML attributes —
        // assert the property, not toHaveAttribute (which checks attributes).
        expect((video as HTMLVideoElement).muted).toBe(true);
        expect((video as HTMLVideoElement).loop).toBe(true);
        expect(video).toHaveAttribute('poster', videoAsset.light.poster);
        expect(video?.querySelector('source')).toHaveAttribute('type', 'video/webm');
    });

    it('falls back to the poster-only <img> under prefers-reduced-motion', () => {
        mockMatchMedia((query) => query === '(prefers-reduced-motion: reduce)');
        render(<SectionMedia asset={videoAsset} alt="how it works" />);

        expect(document.querySelector('video')).toBeNull();
        const img = screen.getByRole('img', { name: 'how it works' });
        expect(img).toHaveAttribute('src', videoAsset.light.poster);
    });
});

describe('SectionMedia theme-variant selection (FR-006)', () => {
    it('selects the light variant by default', () => {
        mockMatchMedia(() => false);
        render(<SectionMedia asset={screenshotAsset} alt="capabilities" />);

        expect(screen.getByRole('img')).toHaveAttribute('src', screenshotAsset.light.src);
    });

    it('selects the dark variant when the `dark` class is present on <html>', () => {
        mockMatchMedia(() => false);
        document.documentElement.classList.add('dark');
        render(<SectionMedia asset={screenshotAsset} alt="capabilities" />);

        expect(screen.getByRole('img')).toHaveAttribute('src', screenshotAsset.dark.src);
    });
});
