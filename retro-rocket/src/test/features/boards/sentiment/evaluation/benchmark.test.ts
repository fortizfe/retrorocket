// @vitest-environment node
//
// onnxruntime-node needs the native Node `Float32Array`; the repo's default jsdom
// test environment swaps globals across realms and breaks tensor construction
// ("A float32 tensor's data must be type of Float32Array"). This gated harness runs
// real inference, so it MUST use the node environment.
/**
 * Model Evaluation harness (FR-001/FR-002/FR-006, SC-001/SC-003).
 *
 * DEV-RUN ONLY. This downloads real model weights, so — exactly like
 * `accuracy.bench.test.ts` — it is guarded by `describe.runIf(RUN_MODEL_EVAL === '1')`:
 * in the normal `npm run test`/CI run it is collected but SKIPPED (no download), and
 * it only executes when invoked via `npm run bench:sentiment` (RUN_MODEL_EVAL=1). It
 * is the decision gate: it scores each candidate configuration on the curated card
 * set and writes the Model Evaluation Record to `results.md`. Files under `src/test/**`
 * are already excluded from coverage collection, so it never affects the coverage floor.
 *
 * It intentionally does NOT flip the runtime default — adopting a winning config is
 * a deliberate, separate change (FR-001/FR-007) made only after reading the record.
 */
import { describe, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { LABELLED_CARDS } from '@/test/features/boards/sentiment/fixtures/cards';
import { normalizeForInference } from '@/features/boards/sentiment/domain/textNormalization';
import { mapSentiment } from '@/features/boards/sentiment/workers/sentimentMapper';
import { detectLanguage } from '@/features/boards/sentiment/domain/languageDetection';
import { routeModel } from '@/features/boards/sentiment/domain/modelRouting';
import { SENTIMENT_MODELS, type SentimentType, type ModelConfig } from '@/features/boards/types/sentiment';

const ENABLED = process.env.RUN_MODEL_EVAL === '1';

const MULTI = SENTIMENT_MODELS.find(m => m.language === 'multilingual' && m.primary)!;
const EN = SENTIMENT_MODELS.find(m => m.language === 'en')!;
const ES = SENTIMENT_MODELS.find(m => m.language === 'es')!;

interface Candidate { name: string; models: ModelConfig[]; routing: boolean }

const CANDIDATES: Candidate[] = [
    { name: 'baseline — distilbert multilingual (current default)', models: [MULTI], routing: false },
    { name: 'candidate — twitter-roberta as single EN-leaning model', models: [EN], routing: false },
    {
        name: 'candidate — 3-model routing (RoBERTuito es + twitter-roberta en + multilingual default) [~2.7x footprint]',
        models: [MULTI, EN, ES],
        routing: true,
    },
    {
        name: 'candidate — 2-model routing (es→RoBERTuito, en→twitter-roberta; unknown→en fallback) [~1.7x footprint, budget-compliant]',
        models: [EN, ES],
        routing: true,
    },
];

interface Score { overall: number; es: number; en: number; correct: number; total: number }

describe.runIf(ENABLED)('model evaluation harness (writes results.md)', () => {
    it('scores candidates on the curated card set and records the decision', async () => {
        const { pipeline, env } = await import('@huggingface/transformers');
        (env as { allowLocalModels: boolean }).allowLocalModels = false;
        (env as { allowRemoteModels: boolean }).allowRemoteModels = true;

        // Loosely typed on purpose: this is a gated dev-run harness, not the prod path.
        type Classifier = (text: string, opts: { truncation: boolean }) => Promise<{ label?: string; score?: number }[]>;
        const makePipe = pipeline as unknown as (task: 'text-classification', id: string, o: { revision: string }) => Promise<Classifier>;
        const cache = new Map<string, Classifier>();
        const load = async (id: string): Promise<Classifier> => {
            if (!cache.has(id)) cache.set(id, await makePipe('text-classification', id, { revision: 'main' }));
            return cache.get(id)!;
        };

        async function score(cand: Candidate): Promise<Score> {
            const per: Record<'es' | 'en', { c: number; n: number }> = { es: { c: 0, n: 0 }, en: { c: 0, n: 0 } };
            let correct = 0;
            for (const card of LABELLED_CARDS) {
                const clean = normalizeForInference(card.content);
                let predicted: SentimentType;
                if (!clean) {
                    predicted = 'neutral';
                } else {
                    const id = cand.routing ? routeModel(detectLanguage(clean), cand.models) : cand.models[0].id;
                    const output = await (await load(id))(clean, { truncation: true });
                    predicted = mapSentiment(output, id).sentiment;
                }
                per[card.lang].n++;
                if (predicted === card.label) { correct++; per[card.lang].c++; }
            }
            return {
                overall: correct / LABELLED_CARDS.length,
                es: per.es.c / per.es.n,
                en: per.en.c / per.en.n,
                correct,
                total: LABELLED_CARDS.length,
            };
        }

        const rows: string[] = [];
        const scores: Score[] = [];
        for (const cand of CANDIDATES) {
            const s = await score(cand);
            scores.push(s);
            rows.push(
                `| ${cand.name} | ${(s.overall * 100).toFixed(1)}% (${s.correct}/${s.total}) | ` +
                `${(s.es * 100).toFixed(1)}% | ${(s.en * 100).toFixed(1)}% | ${cand.models.map(m => m.id).join(', ')} |`
            );
        }

        const baseline = scores[0].overall;
        const routingScore = scores[scores.length - 1].overall;
        const routingDelta = ((routingScore - baseline) * 100).toFixed(1);

        const md = [
            '# Model Evaluation Record (013)',
            '',
            `Generated by \`npm run bench:sentiment\` on ${new Date().toISOString()}.`,
            'Card-level accuracy over the curated ES/EN set (`fixtures/cards.ts`).',
            '',
            '| Candidate | Overall accuracy | ES | EN | Model id(s) |',
            '|-----------|------------------|----|----|-------------|',
            ...rows,
            '',
            '## Decision',
            '',
            `- Baseline (current default) overall: ${(baseline * 100).toFixed(1)}%`,
            `- Language-aware routing overall: ${(routingScore * 100).toFixed(1)}% (Δ ${routingDelta} pp vs baseline)`,
            '- **Adopt routing** iff Δ ≥ 5 pp AND download footprint ≤ ~2× baseline (FR-007/FR-013).',
            '- **Adopt a single new model** iff it beats the current models by ≥ 10 pp overall (FR-001/SC-001).',
            '- Otherwise keep the current models and record this result (Clarification 1).',
            '',
            '> Team-mood agreement (SC-002) and download-footprint measurement are recorded',
            '> alongside this run; see quickstart.md step 3. Footprint MUST be captured from',
            '> the browser network panel / model files, as it is not measurable in this harness.',
            '',
        ].join('\n');

        writeFileSync(path.join(__dirname, 'results.md'), md, 'utf-8');
        console.log(`\n${md}\n`);
    }, 600_000);
});
