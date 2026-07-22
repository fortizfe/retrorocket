import { describe, it, expect } from 'vitest';
import { useBoardGridColumns } from '@/lib/hooks/useBoardGridColumns';

// Pure mapping (no React state), so it can be invoked directly.
describe('useBoardGridColumns', () => {
    it('returns a literal, non-purgeable grid definition for 3 columns', () => {
        const { className } = useBoardGridColumns(3);
        expect(className).toContain('grid-cols-1');
        expect(className).toContain('lg:grid-cols-3');
        expect(className).not.toContain('${');
    });

    it('returns a literal, non-purgeable grid definition for 4 columns', () => {
        const { className } = useBoardGridColumns(4);
        expect(className).toContain('grid-cols-1');
        expect(className).toContain('lg:grid-cols-4');
        expect(className).not.toContain('${');
    });

    it('never emits a 320px-style hard minimum width', () => {
        expect(useBoardGridColumns(3).className).not.toMatch(/min-w-\[/);
        expect(useBoardGridColumns(4).className).not.toMatch(/min-w-\[/);
    });
});
