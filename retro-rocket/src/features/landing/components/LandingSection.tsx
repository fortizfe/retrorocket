import React from 'react';
import SectionBackground, { SectionTone } from '@/features/landing/components/SectionBackground';
import SectionMedia from '@/features/landing/components/SectionMedia';
import { LandingSection as LandingSectionConfig, MediaAsset } from '@/features/landing/data/types';

interface LandingSectionProps {
    config: LandingSectionConfig;
    asset?: MediaAsset;
    mediaAlt: string;
    title: string;
    subtitle: string;
    tone: SectionTone;
    /** 'wide' (default) is a fixed 16:9 frame, wider than the text column,
     * for landscape desktop captures. 'phone' keeps the capture's own
     * portrait aspect ratio instead of stretching it to a landscape frame —
     * for the mobile-viewport captures (e.g. technology's Mobile First
     * proof). Both use a fixed aspect-ratio (not viewport-height-relative
     * sizing) so the display frame is deterministic and can be matched
     * exactly by the capture script — the previous vh-based sizing didn't
     * match the captured screenshots' own aspect ratio, so `object-cover`
     * cropped real content off them. */
    mediaLayout?: 'wide' | 'phone';
    children?: React.ReactNode;
}

/**
 * 100dvh-sized shell (research.md #2 — `dvh`, not `vh`, avoids mobile browser
 * chrome resize gaps while keeping scroll continuous, FR-002) composing a
 * per-section parallax color wash (`SectionBackground`), section copy, and
 * — when present — a large, static real product screenshot (`SectionMedia`
 * — deliberately NOT parallaxed; moving the screenshot itself read as
 * unnatural since it's UI content people read, not photography, per
 * resolved feedback). Copy sits compact and narrow at the top; the
 * screenshot below is deliberately wider than the text column so it reads
 * as the section's dominant visual, not a thumbnail beside the text.
 * Purely typographic sections (no `asset`) simply render without a media
 * block.
 */
const LandingSection: React.FC<LandingSectionProps> = ({
    config,
    asset,
    mediaAlt,
    title,
    subtitle,
    tone,
    mediaLayout = 'wide',
    children,
}) => {
    return (
        <section
            id={`landing-section-${config.key}`}
            className="relative isolate flex min-h-[100dvh] items-center overflow-hidden border-t border-border-default"
        >
            <SectionBackground tone={tone} intensity={config.parallaxIntensity} />

            <div className="mx-auto w-full max-w-7xl px-6 py-16">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-3xl font-bold tracking-[-0.01em] md:text-4xl">{title}</h2>
                    <p className="mt-4 text-lg text-text-secondary">{subtitle}</p>
                    {children && <div className="mt-8">{children}</div>}
                </div>

                {asset && mediaLayout === 'wide' && (
                    <div className="mx-auto mt-12 aspect-video w-full overflow-hidden rounded-3xl shadow-2xl">
                        <SectionMedia asset={asset} alt={mediaAlt} className="h-full w-full object-cover" />
                    </div>
                )}

                {asset && mediaLayout === 'phone' && (
                    <div className="mx-auto mt-12 aspect-[390/844] h-[52vh] overflow-hidden rounded-[2rem] shadow-2xl sm:h-[62vh] lg:h-[72vh]">
                        <SectionMedia asset={asset} alt={mediaAlt} className="h-full w-full object-cover" />
                    </div>
                )}
            </div>
        </section>
    );
};

export default LandingSection;
