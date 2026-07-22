import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { Card } from '@/features/boards/types/card';

/**
 * Shared render helper for retrospective-board component tests.
 *
 * The global test setup (`src/test/setup.ts`) already mocks i18next, framer-motion
 * and Firebase, so board components can be rendered directly. This helper exists so
 * board tests share a single entry point (and a place to add real providers later,
 * e.g. a ThemeProvider) instead of importing `render` ad-hoc.
 */
export function renderBoard(ui: ReactElement, options?: RenderOptions) {
    return render(ui, options);
}

/** Factory producing a valid `Card` fixture; override any field per test. */
export function makeCard(overrides: Partial<Card> = {}): Card {
    const now = new Date('2026-07-22T10:00:00.000Z');
    return {
        id: 'card-1',
        content: 'Sample card content',
        column: 'glad',
        createdBy: 'Alice',
        createdAt: now,
        updatedAt: now,
        retrospectiveId: 'retro-1',
        likes: [],
        reactions: [],
        order: 0,
        ...overrides,
    };
}

export * from '@testing-library/react';
