export type LandingMessagingPurpose = 'capabilityHighlight' | 'howItWorksStep' | 'trustSignal' | 'closing';

export type LandingParallaxIntensity = 'standard' | 'reduced';

export interface LandingSection {
    key: string;
    order: number;
    messagingPurpose: LandingMessagingPurpose;
    mediaAssetKey: string | null;
    parallaxIntensity: LandingParallaxIntensity;
}

export type MediaAssetKind = 'screenshot' | 'video';

export interface MediaAssetVariant {
    src: string;
    poster?: string;
}

export interface MediaAsset {
    sectionKey: string;
    kind: MediaAssetKind;
    productArea: string;
    light: MediaAssetVariant;
    dark: MediaAssetVariant;
    capturedAt: string;
}
