import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import LandingHero from '@/features/landing/components/LandingHero';

/**
 * spec-kit feature 057-getting-started-guide, tasks.md T009 (Phase 3: User
 * Story 1 — TDD red step). `LandingHero.tsx` does not yet render any guide
 * entry point — T012 adds it to make this pass, per Constitution Principle I
 * (NON-NEGOTIABLE TDD).
 *
 * Acceptance Scenario covered (spec.md US1 #1-2): "a clearly labeled,
 * visually distinct element ('Getting Started' / 'Guía de uso') is present
 * and easy to find" on the landing page, and selecting it must lead to the
 * guide (FR-001).
 *
 * Chosen, documented i18n key (shared with the Header entry point added in
 * T010/T013 and consumed again by GuidePage's own overview render, T011):
 * `guide.entryPoint.label` — lives under the `guide.*` namespace (not
 * `landing.*`) since the same label/CTA is reused verbatim by both the
 * signed-out landing entry point and the signed-in Header entry point
 * (T013), and T014 adds this key once for both call sites rather than
 * duplicating a `landing.hero.*` copy of the same string.
 *
 * `react-i18next` is globally mocked to `t: (key) => key` in
 * src/test/setup.ts (matching every other test in this codebase — see e.g.
 * src/test/pages/Landing.test.tsx's `landing.capabilities.subtitle`
 * assertions), so this asserts on the key path itself, not translated
 * prose.
 *
 * Expected failure right now: no element with the accessible name
 * 'guide.entryPoint.label' exists in LandingHero's output (LandingHero
 * renders only the tagline, description, and auth CTA today).
 */

describe('LandingHero — guide entry point (spec 057 FR-001, US1)', () => {
    it('renders a "Getting Started" link to /guide', () => {
        render(
            <BrowserRouter>
                <LandingHero onProviderSignIn={vi.fn()} loading={false} />
            </BrowserRouter>
        );

        const guideLink = screen.getByRole('link', { name: 'guide.entryPoint.label' });
        expect(guideLink).toBeInTheDocument();
        expect(guideLink).toHaveAttribute('href', '/guide');
    });

    it('renders the guide entry point inside the hero section, not buried elsewhere', () => {
        render(
            <BrowserRouter>
                <LandingHero onProviderSignIn={vi.fn()} loading={false} />
            </BrowserRouter>
        );

        const hero = screen.getByTestId('landing-hero');
        const guideLink = screen.getByRole('link', { name: 'guide.entryPoint.label' });
        expect(hero).toContainElement(guideLink);
    });
});
