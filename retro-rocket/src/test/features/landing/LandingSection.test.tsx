import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LandingSection from '@/features/landing/components/LandingSection';
import { LandingSection as LandingSectionConfig, MediaAsset } from '@/features/landing/data/types';

const config: LandingSectionConfig = {
    key: 'capabilities',
    order: 0,
    messagingPurpose: 'capabilityHighlight',
    mediaAssetKey: 'capabilities',
    parallaxIntensity: 'standard',
};

const asset: MediaAsset = {
    sectionKey: 'capabilities',
    kind: 'screenshot',
    productArea: 'test',
    light: { src: '/landing-media/capabilities/light.png' },
    dark: { src: '/landing-media/capabilities/dark.png' },
    capturedAt: '2026-08-12T00:00:00.000Z',
};

describe('LandingSection (FR-002)', () => {
    it('renders a full-viewport-height (100dvh) shell', () => {
        const { container } = render(
            <LandingSection config={config} title="Title" subtitle="Subtitle" mediaAlt="alt" tone="blue" />
        );

        const section = container.querySelector('section');
        expect(section?.className).toContain('min-h-[100dvh]');
    });

    it('composes title, subtitle, and children copy', () => {
        render(
            <LandingSection config={config} title="Everything you need" subtitle="A complete platform" mediaAlt="alt" tone="blue">
                <p>Body content</p>
            </LandingSection>
        );

        expect(screen.getByText('Everything you need')).toBeInTheDocument();
        expect(screen.getByText('A complete platform')).toBeInTheDocument();
        expect(screen.getByText('Body content')).toBeInTheDocument();
    });

    it('renders SectionMedia when an asset is provided', () => {
        render(
            <LandingSection config={config} asset={asset} title="Title" subtitle="Subtitle" mediaAlt="capabilities" tone="blue" />
        );

        expect(screen.getByRole('img', { name: 'capabilities' })).toBeInTheDocument();
    });

    it('renders no media when the section is purely typographic', () => {
        render(<LandingSection config={config} title="Title" subtitle="Subtitle" mediaAlt="alt" tone="blue" />);

        expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('renders a decorative SectionBackground behind the content, per the section tone', () => {
        const { container } = render(
            <LandingSection config={config} title="Title" subtitle="Subtitle" mediaAlt="alt" tone="emerald" />
        );

        const background = container.querySelector('[aria-hidden="true"].absolute.inset-0');
        expect(background).toBeInTheDocument();
    });
});
