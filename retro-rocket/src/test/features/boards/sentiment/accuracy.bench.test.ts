// @vitest-environment node
// onnxruntime-node needs the native Node Float32Array; the default jsdom environment
// breaks real inference. Gated benches → safe to pin to the node environment.
/**
 * Gated benchmarks for the ADOPTED runtime configuration (language-aware routing).
 * They run REAL models over curated fixtures and download weights, so they are guarded
 * by RUN_ACCURACY_BENCH=1 (the `test:accuracy` npm script) and skipped in the default
 * unit/coverage run. They MUST NOT gate the 80% coverage floor.
 *
 *  - Card accuracy (SC-001): displayed card states match human labels ≥90%.
 *  - Team-mood agreement (SC-002): the mood score of a board matches its intended tone.
 *
 * The empirical model-vs-model comparison lives in evaluation/benchmark.test.ts and
 * the decision is recorded in evaluation/results.md.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import type { Card } from '@/features/boards/types/card';
import type { DynamicColumnConfig } from '@/features/boards/retrospective/hooks/useRetrospectiveColumns';
import { LABELLED_CARDS, makeCard } from '@/test/features/boards/sentiment/fixtures/cards';
import { normalizeForInference } from '@/features/boards/sentiment/domain/textNormalization';
import { mapSentiment } from '@/features/boards/sentiment/workers/sentimentMapper';
import { detectLanguage } from '@/features/boards/sentiment/domain/languageDetection';
import { routeModel, routingEnabled } from '@/features/boards/sentiment/domain/modelRouting';
import { computeMoodDistribution } from '@/features/boards/sentiment/domain/moodDistribution';
import { calculateMoodScore } from '@/features/boards/sentiment/domain/moodScore';
import {
    SENTIMENT_MODELS,
    DEFAULT_SENTIMENT_CONFIG,
    type SentimentType,
    type SentimentResult,
} from '@/features/boards/types/sentiment';

const ENABLED = process.env.RUN_ACCURACY_BENCH === '1';

// Builds a card classifier that mirrors the worker exactly: normalize → route by
// detected language → run the routed model → map to the 3-category taxonomy.
async function buildClassify(): Promise<(content: string) => Promise<SentimentType>> {
    const { pipeline, env } = await import('@huggingface/transformers');
    (env as { allowLocalModels: boolean }).allowLocalModels = false;
    (env as { allowRemoteModels: boolean }).allowRemoteModels = true;

    const ids = DEFAULT_SENTIMENT_CONFIG.modelIds ?? [DEFAULT_SENTIMENT_CONFIG.modelId];
    const configs = ids.map(id => SENTIMENT_MODELS.find(m => m.id === id)!);
    const routing = routingEnabled(configs);
    const pipes = new Map<string, (t: string) => Promise<{ label?: string; score?: number }[]>>();
    for (const id of ids) {
        pipes.set(id, (await pipeline('text-classification', id)) as unknown as (t: string) => Promise<{ label?: string; score?: number }[]>);
    }

    return async (content: string): Promise<SentimentType> => {
        const clean = normalizeForInference(content);
        if (!clean) return 'neutral';
        const id = routing ? routeModel(detectLanguage(clean), configs) : ids[0];
        const output = await pipes.get(id)!(clean);
        return mapSentiment(output, id).sentiment;
    };
}

let classify: (content: string) => Promise<SentimentType>;
beforeAll(async () => { if (ENABLED) classify = await buildClassify(); }, 300_000);

describe.runIf(ENABLED)('adopted config — card accuracy (SC-001)', () => {
    it('matches ≥90% of human labels across the ES/EN fixture set', async () => {
        let correct = 0;
        for (const card of LABELLED_CARDS) {
            if ((await classify(card.content)) === card.label) correct++;
        }
        const accuracy = correct / LABELLED_CARDS.length;
        console.log(`Adopted-config accuracy: ${(accuracy * 100).toFixed(1)}% (${correct}/${LABELLED_CARDS.length})`);
        expect(accuracy).toBeGreaterThanOrEqual(0.9);
    }, 300_000);
});

// ── Team-mood agreement (SC-002) ──────────────────────────────────────────────

const COLS: Record<string, DynamicColumnConfig> = {
    went_well: { id: 'went_well', title: 'What went well', description: '', color: '#fff', icon: '📝', role: 'positive' },
    improve: { id: 'improve', title: 'To improve', description: '', color: '#fff', icon: '📝', role: 'neutral' },
    not_went_well: { id: 'not_went_well', title: 'What did not go well', description: '', color: '#fff', icon: '📝', role: 'negative' },
};

interface ToneBoard { name: string; band: [number, number]; cards: { column: string; content: string }[] }

// Real ES/EN card text; the `band` is the expected mood-score range for the board's
// intended tone (score is 1–10: all-positive→10, all-neutral→≈4.6, all-negative→1).
const TONE_BOARDS: ToneBoard[] = [
    {
        name: 'clearly positive', band: [6.5, 10],
        cards: [
            { column: 'went_well', content: 'El equipo colaboró muy bien esta iteración' },
            { column: 'went_well', content: 'Great communication across the whole team' },
            { column: 'went_well', content: 'Las entregas fueron puntuales y de gran calidad' },
            { column: 'went_well', content: 'Loved the pairing sessions, super productive' },
            { column: 'improve', content: 'Estoy muy contento con los resultados del sprint' },
        ],
    },
    {
        name: 'clearly negative', band: [1, 4],
        cards: [
            { column: 'improve', content: 'Estoy muy frustrado por la falta de comunicación' },
            { column: 'improve', content: 'The meetings were a complete waste of time' },
            { column: 'improve', content: 'Nos retrasamos muchísimo con todas las entregas' },
            { column: 'improve', content: 'The codebase was buggy and stressful to work with' },
            { column: 'improve', content: 'Demasiados bloqueos y nadie los resolvió' },
        ],
    },
    {
        name: 'neutral-dominant', band: [3.5, 5.5],
        cards: [
            { column: 'improve', content: 'Cambiamos el horario de la daily a las 10' },
            { column: 'improve', content: 'We moved the repository to the new organization' },
            { column: 'improve', content: 'Actualizamos la versión de la librería de UI' },
            { column: 'improve', content: 'The retro lasted one hour' },
        ],
    },
    {
        name: 'positive with expected negativity in a problems column', band: [5.5, 10],
        cards: [
            { column: 'went_well', content: 'Buen trabajo en equipo y muy buena energía' },
            { column: 'went_well', content: 'Deployments were smooth and reliable' },
            { column: 'went_well', content: 'Excelente comunicación entre todos' },
            { column: 'not_went_well', content: 'Faltó tiempo para revisar el código' },
            { column: 'not_went_well', content: 'Too many blockers this sprint' },
        ],
    },
];

describe.runIf(ENABLED)('adopted config — team-mood agreement (SC-002)', () => {
    it('mood score agrees with each board’s intended tone on ≥90% of boards', async () => {
        let agree = 0;
        for (const board of TONE_BOARDS) {
            const cards: Card[] = board.cards.map((c, i) =>
                makeCard({ id: `${board.name}-${i}`, content: c.content, column: c.column }));
            const results = new Map<string, SentimentResult>();
            for (const card of cards) {
                results.set(card.id, {
                    cardId: card.id,
                    sentiment: await classify(card.content),
                    confidence: 0.9, // above every display/aggregation threshold
                    timestamp: new Date(),
                });
            }
            const dist = computeMoodDistribution(cards, results, COLS, DEFAULT_SENTIMENT_CONFIG);
            const score = calculateMoodScore(dist);
            const ok = score >= board.band[0] && score <= board.band[1];
            console.log(`Board "${board.name}": score ${score} (expected ${board.band[0]}–${board.band[1]}) → ${ok ? 'OK' : 'MISS'}`);
            if (ok) agree++;
        }
        expect(agree / TONE_BOARDS.length).toBeGreaterThanOrEqual(0.9);
    }, 300_000);
});
