import { LandingSection } from './types';

/**
 * Below-the-hero section list (data-model.md `Landing Section`). Content
 * categories per contracts/content-inventory-contract.md's Sign-off log —
 * the hero (category 1) and the footer strip are not instances of this
 * entity (FR-001, FR-002's footer exception).
 */
export const LANDING_SECTIONS: LandingSection[] = [
    {
        key: 'capabilities',
        order: 0,
        messagingPurpose: 'capabilityHighlight',
        mediaAssetKey: 'capabilities',
        parallaxIntensity: 'standard',
    },
    {
        key: 'howItWorks',
        order: 1,
        messagingPurpose: 'howItWorksStep',
        mediaAssetKey: 'howItWorks',
        parallaxIntensity: 'standard',
    },
    {
        key: 'sentiment',
        order: 2,
        messagingPurpose: 'capabilityHighlight',
        mediaAssetKey: 'sentiment',
        parallaxIntensity: 'standard',
    },
    {
        key: 'technology',
        order: 3,
        messagingPurpose: 'trustSignal',
        mediaAssetKey: 'technology',
        parallaxIntensity: 'reduced',
    },
    {
        key: 'finalMessage',
        order: 4,
        messagingPurpose: 'closing',
        mediaAssetKey: null,
        parallaxIntensity: 'reduced',
    },
];
