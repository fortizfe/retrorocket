import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LinkifyText from '@/lib/components/ui/LinkifyText';

const LONG_URL = 'https://example.com/' + 'a'.repeat(180) + '?x=1';

describe('LinkifyText', () => {
    it('renders a long URL as a link that is allowed to wrap (FR-001, FR-002)', () => {
        render(<LinkifyText text={`See ${LONG_URL} now`} />);
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', LONG_URL);
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        // The link must be allowed to break unbreakable tokens.
        expect(link.className).toContain('break-words');
        expect(link.className).toContain('overflow-wrap:anywhere');
    });

    it('wraps plain text with break utilities and no link when there is no URL', () => {
        const { container } = render(<LinkifyText text={'a'.repeat(90)} />);
        expect(screen.queryByRole('link')).toBeNull();
        const span = container.querySelector('span');
        expect(span?.className).toContain('break-words');
        expect(span?.className).toContain('overflow-wrap:anywhere');
    });

    it('merges caller className onto the wrapper', () => {
        const { container } = render(<LinkifyText text="hello" className="text-text-primary" />);
        const span = container.querySelector('span');
        expect(span?.className).toContain('text-text-primary');
    });
});
