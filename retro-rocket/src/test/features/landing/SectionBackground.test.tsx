import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import SectionBackground from '@/features/landing/components/SectionBackground';

describe('SectionBackground (FR-003)', () => {
    it('renders as decorative — hidden from assistive tech, no pointer interaction', () => {
        const { container } = render(<SectionBackground tone="blue" intensity="standard" />);

        const root = container.firstElementChild as HTMLElement;
        expect(root).toHaveAttribute('aria-hidden', 'true');
        expect(root.className).toContain('pointer-events-none');
    });

    it('renders a distinct background color per tone', () => {
        const { container: blueContainer } = render(<SectionBackground tone="blue" intensity="standard" />);
        const { container: emeraldContainer } = render(<SectionBackground tone="emerald" intensity="standard" />);

        const blueWash = blueContainer.querySelector('[style*="linear-gradient"]') as HTMLElement;
        const emeraldWash = emeraldContainer.querySelector('[style*="linear-gradient"]') as HTMLElement;

        expect(blueWash.style.background).not.toBe(emeraldWash.style.background);
    });

    it('positions itself to cover the full section behind its content', () => {
        const { container } = render(<SectionBackground tone="emerald" intensity="reduced" />);

        const root = container.firstElementChild as HTMLElement;
        expect(root.className).toContain('absolute');
        expect(root.className).toContain('inset-0');
        expect(root.className).toContain('overflow-hidden');
    });
});
