import { MediaAsset } from './types';

/**
 * Section → { light, dark } screenshot/video manifest (data-model.md
 * `Media Asset`). Populated by `e2e/fixtures/landing-capture.ts`
 * (contracts/capture-script-contract.md) — every entry here MUST have both
 * theme variants and MUST resolve to a real file under
 * `public/landing-media/` (contracts/media-asset-manifest-contract.md).
 * `finalMessage` is the only purely typographic section (no Media Asset)
 * per the content-inventory contract's Sign-off log.
 */
export const MEDIA_ASSETS: Record<string, MediaAsset> = {
    capabilities: {
        sectionKey: 'capabilities',
        kind: 'screenshot',
        productArea: 'Dashboard — a visitor\'s list of retrospective boards',
        light: { src: '/landing-media/capabilities/light.png' },
        dark: { src: '/landing-media/capabilities/dark.png' },
        capturedAt: '2026-08-12T00:00:00.000Z',
    },
    howItWorks: {
        sectionKey: 'howItWorks',
        kind: 'screenshot',
        productArea: 'Retrospective board — live card voting, grouping, and real-time updates',
        light: { src: '/landing-media/howItWorks/light.png' },
        dark: { src: '/landing-media/howItWorks/dark.png' },
        capturedAt: '2026-08-13T00:00:00.000Z',
    },
    sentiment: {
        sectionKey: 'sentiment',
        kind: 'screenshot',
        productArea: 'Team Mood dashboard — a completed AI sentiment analysis report with per-card badges',
        light: { src: '/landing-media/sentiment/light.png' },
        dark: { src: '/landing-media/sentiment/dark.png' },
        capturedAt: '2026-08-12T00:00:00.000Z',
    },
    technology: {
        sectionKey: 'technology',
        kind: 'screenshot',
        productArea: 'Retrospective board on a mobile viewport — tangible proof of the Mobile First / responsive design claim',
        light: { src: '/landing-media/technology/light.png' },
        dark: { src: '/landing-media/technology/dark.png' },
        capturedAt: '2026-08-12T00:00:00.000Z',
    },
};

export function getMediaAsset(sectionKey: string): MediaAsset | undefined {
    return MEDIA_ASSETS[sectionKey];
}
