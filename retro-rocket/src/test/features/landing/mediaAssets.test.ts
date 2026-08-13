import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { LANDING_SECTIONS } from '@/features/landing/data/sections';
import { MEDIA_ASSETS, getMediaAsset } from '@/features/landing/data/mediaAssets';
import en from '@/locales/en.json';
import es from '@/locales/es.json';

const PUBLIC_DIR = path.resolve(__dirname, '../../../../public');

function resolvePublicFile(publicPath: string): string {
    // Manifest paths are absolute public URLs (e.g. "/landing-media/x/light.png").
    return path.join(PUBLIC_DIR, publicPath.replace(/^\//, ''));
}

/**
 * data-model.md `Landing Section` validation rules — both enforced here per
 * its own text ("enforced by the same unit test"): (1) i18n key resolution,
 * (2) Media Asset manifest completeness (media-asset-manifest-contract.md).
 */
describe('Landing Section → i18n key resolution (data-model.md, FR-009)', () => {
    it.each(LANDING_SECTIONS)('landing.$key has a title/subtitle entry in both en.json and es.json', (section) => {
        const enEntry = (en as Record<string, Record<string, unknown>>).landing[section.key] as
            | { title?: string; subtitle?: string }
            | undefined;
        const esEntry = (es as Record<string, Record<string, unknown>>).landing[section.key] as
            | { title?: string; subtitle?: string }
            | undefined;

        expect(enEntry?.title).toBeTruthy();
        expect(enEntry?.subtitle).toBeTruthy();
        expect(esEntry?.title).toBeTruthy();
        expect(esEntry?.subtitle).toBeTruthy();
    });
});

describe('Media Asset manifest (contracts/media-asset-manifest-contract.md)', () => {
    const sectionsWithMedia = LANDING_SECTIONS.filter((s) => s.mediaAssetKey !== null);

    it('every Landing Section with a mediaAssetKey resolves to a manifest entry', () => {
        for (const section of sectionsWithMedia) {
            expect(getMediaAsset(section.mediaAssetKey as string)).toBeDefined();
        }
    });

    it.each(Object.values(MEDIA_ASSETS))(
        '$sectionKey has both light and dark variants pointing at real files',
        (asset) => {
            expect(asset.light.src).toBeTruthy();
            expect(asset.dark.src).toBeTruthy();
            expect(fs.existsSync(resolvePublicFile(asset.light.src))).toBe(true);
            expect(fs.existsSync(resolvePublicFile(asset.dark.src))).toBe(true);
        }
    );

    it.each(Object.values(MEDIA_ASSETS).filter((a) => a.kind === 'video'))(
        '$sectionKey (video) has both light and dark poster frames',
        (asset) => {
            expect(asset.light.poster).toBeTruthy();
            expect(asset.dark.poster).toBeTruthy();
            expect(fs.existsSync(resolvePublicFile(asset.light.poster as string))).toBe(true);
            expect(fs.existsSync(resolvePublicFile(asset.dark.poster as string))).toBe(true);
        }
    );
});
