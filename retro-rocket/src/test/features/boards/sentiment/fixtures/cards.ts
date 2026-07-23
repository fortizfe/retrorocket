import type { Card } from '@/features/boards/types/card';
import type { SentimentType } from '@/features/boards/types/sentiment';

export interface LabelledCard {
    content: string;
    lang: 'es' | 'en';
    label: SentimentType;
}

let seq = 0;

/** Minimal Card factory for tests. */
export function makeCard(overrides: Partial<Card> & { content: string }): Card {
    seq += 1;
    return {
        id: overrides.id ?? `card-${seq}`,
        content: overrides.content,
        column: overrides.column ?? 'went_well',
        createdBy: overrides.createdBy ?? 'user-1',
        createdAt: overrides.createdAt ?? new Date('2026-01-01'),
        updatedAt: overrides.updatedAt ?? new Date('2026-01-01'),
        retrospectiveId: overrides.retrospectiveId ?? 'retro-1',
        ...overrides,
    };
}

/**
 * ≥30 curated ES/EN cards with human labels (positive / negative / neutral),
 * including long and very-short cards. Feeds the gated accuracy benchmark (SC-001)
 * and distribution/normalization tests (SC-003).
 */
export const LABELLED_CARDS: LabelledCard[] = [
    // Positive — ES
    { content: 'El equipo colaboró muy bien esta iteración', lang: 'es', label: 'positive' },
    { content: 'Estoy muy contento con los resultados del sprint', lang: 'es', label: 'positive' },
    { content: 'Excelente comunicación entre todos', lang: 'es', label: 'positive' },
    { content: 'Las entregas fueron puntuales y de gran calidad', lang: 'es', label: 'positive' },
    { content: 'Me encantó el ambiente de trabajo', lang: 'es', label: 'positive' },
    // Positive — EN
    { content: 'The team collaborated really well this sprint', lang: 'en', label: 'positive' },
    { content: 'I am very happy with what we delivered', lang: 'en', label: 'positive' },
    { content: 'Great communication across the board', lang: 'en', label: 'positive' },
    { content: 'Deployments were smooth and reliable', lang: 'en', label: 'positive' },
    { content: 'Loved the pairing sessions, super productive', lang: 'en', label: 'positive' },

    // Negative — ES
    { content: 'Hubo demasiados bloqueos y nadie los resolvió', lang: 'es', label: 'negative' },
    { content: 'Estoy frustrado por la falta de comunicación', lang: 'es', label: 'negative' },
    { content: 'Las reuniones fueron una pérdida de tiempo', lang: 'es', label: 'negative' },
    { content: 'El código estaba lleno de errores y sin tests', lang: 'es', label: 'negative' },
    { content: 'Nos retrasamos muchísimo con las entregas', lang: 'es', label: 'negative' },
    // Negative — EN
    { content: 'Too many blockers and none got resolved', lang: 'en', label: 'negative' },
    { content: 'I am frustrated by the lack of communication', lang: 'en', label: 'negative' },
    { content: 'The meetings were a complete waste of time', lang: 'en', label: 'negative' },
    { content: 'The codebase was buggy and had no tests', lang: 'en', label: 'negative' },
    { content: 'We fell badly behind on every deadline', lang: 'en', label: 'negative' },

    // Neutral — ES
    { content: 'Cambiamos el horario de la daily a las 10', lang: 'es', label: 'neutral' },
    { content: 'Migramos el repositorio a la nueva organización', lang: 'es', label: 'neutral' },
    { content: 'Actualizamos la versión de la librería de UI', lang: 'es', label: 'neutral' },
    { content: 'La retro duró una hora', lang: 'es', label: 'neutral' },
    // Neutral — EN
    { content: 'We moved the daily standup to 10am', lang: 'en', label: 'neutral' },
    { content: 'Migrated the repository to the new org', lang: 'en', label: 'neutral' },
    { content: 'Bumped the UI library to the latest version', lang: 'en', label: 'neutral' },
    { content: 'The retro lasted one hour', lang: 'en', label: 'neutral' },

    // Long card (well over a few sentences) — positive
    {
        content: 'En general esta iteración fue muy positiva: logramos cerrar todas las historias comprometidas, ' +
            'la comunicación con el equipo de producto mejoró notablemente, resolvimos los bloqueos técnicos con rapidez ' +
            'y además tuvimos tiempo para refactorizar parte del código heredado, dejando la base mucho más mantenible ' +
            'para las próximas iteraciones. El equipo terminó con muy buena energía.',
        lang: 'es',
        label: 'positive',
    },
    // Long card — negative (EN)
    {
        content: 'Honestly this sprint was rough from start to finish: requirements kept changing, the staging environment ' +
            'was down for two days, several critical bugs slipped into production, and we spent most of the retro just ' +
            'listing everything that went wrong instead of planning improvements. Morale is low and people feel burned out.',
        lang: 'en',
        label: 'negative',
    },

    // Short / informal / fragmentary — the register the current models handle worst
    // and the main motivation for feature 013 (better-fitting, tweet-trained models).
    { content: 'faltó tiempo', lang: 'es', label: 'negative' },
    { content: 'reuniones eternas', lang: 'es', label: 'negative' },
    { content: 'buen trabajo en equipo', lang: 'es', label: 'positive' },
    { content: 'demasiados bugs', lang: 'es', label: 'negative' },
    { content: 'great teamwork', lang: 'en', label: 'positive' },
    { content: 'meetings too long', lang: 'en', label: 'negative' },
    { content: 'shipped on time', lang: 'en', label: 'positive' },
    { content: 'too many blockers', lang: 'en', label: 'negative' },

    // Very short (< 3 non-whitespace chars) — normalization returns null → neutral/0
    { content: 'ok', lang: 'en', label: 'neutral' },
    { content: ':)', lang: 'en', label: 'neutral' },
];
