/**
 * Gated accuracy benchmark (SC-001). Runs the REAL multilingual model over the
 * curated fixture cards and asserts ≥90% label match. It downloads model weights,
 * so it is skipped in the default `test`/coverage run and only executes when
 * RUN_ACCURACY_BENCH=1 (see the `test:accuracy` npm script). It must NOT gate the
 * 80% coverage floor.
 */
import { describe, it, expect } from 'vitest';
import { LABELLED_CARDS } from '@/test/features/boards/sentiment/fixtures/cards';
import { normalizeForInference } from '@/features/boards/sentiment/domain/textNormalization';
import { mapSentiment } from '@/features/boards/sentiment/workers/sentimentMapper';
import { SENTIMENT_MODELS, type SentimentType } from '@/features/boards/types/sentiment';

const ENABLED = process.env.RUN_ACCURACY_BENCH === '1';

describe.runIf(ENABLED)('sentiment accuracy benchmark (SC-001)', () => {
    it('matches ≥90% of human labels across the ES/EN fixture set', async () => {
        const { pipeline, env } = await import('@huggingface/transformers');
        (env as { allowLocalModels: boolean }).allowLocalModels = false;
        (env as { allowRemoteModels: boolean }).allowRemoteModels = true;

        const modelId = SENTIMENT_MODELS[0].id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- gated bench; not part of the typed prod path
        const pipe: any = await pipeline('text-classification', modelId);

        let correct = 0;
        let scored = 0;
        for (const card of LABELLED_CARDS) {
            const clean = normalizeForInference(card.content);
            let predicted: SentimentType;
            if (!clean) {
                predicted = 'neutral';
            } else {
                const output = await pipe(clean);
                predicted = mapSentiment(output, modelId).sentiment;
            }
            scored++;
            if (predicted === card.label) correct++;
        }

        const accuracy = correct / scored;
        // eslint-disable-next-line no-console
        console.log(`Accuracy: ${(accuracy * 100).toFixed(1)}% (${correct}/${scored})`);
        expect(accuracy).toBeGreaterThanOrEqual(0.9);
    }, 120_000);
});
