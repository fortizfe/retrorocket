import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CardContent from '@/features/boards/retrospective/components/CardContent';

describe('CardContent', () => {
    it('preserves line breaks and applies wrapping utilities (FR-001, FR-003)', () => {
        const { container } = render(<CardContent content={'line one\nline two'} />);
        const span = container.querySelector('span');
        expect(span?.className).toContain('whitespace-pre-wrap');
        expect(span?.className).toContain('break-words');
        expect(span?.className).toContain('overflow-wrap:anywhere');
        expect(span?.className).toContain('min-w-0');
    });

    it('uses the semantic text-primary token, not a hardcoded palette color', () => {
        const { container } = render(<CardContent content="hello world" />);
        const span = container.querySelector('span');
        expect(span?.className).toContain('text-text-primary');
        expect(span?.className).not.toMatch(/text-gray-\d|text-slate-\d/);
    });

    it('keeps URLs clickable inside card content (FR-002)', () => {
        render(<CardContent content="visit https://example.com/page here" />);
        expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com/page');
    });
});
