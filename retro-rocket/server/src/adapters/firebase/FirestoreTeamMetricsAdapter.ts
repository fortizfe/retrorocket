import type { Firestore } from 'firebase-admin/firestore';
import type { TeamMetricsPort, TeamMetricsSummary, RetrospectiveMoodPoint } from '../../application/ports/teamMetrics';
import { computeActivitySummary } from '../../domain/teams/activitySummary';
import { isConfident, type SentimentConfiguration } from '../../domain/teams/isConfident';
import { calculateMoodScore } from '../../domain/teams/moodScore';
import type { SentimentType } from '../../application/ports/sentiment';

const RETROSPECTIVES = 'retrospectives';
const ACTION_ITEMS = 'actionItems';
const SENTIMENT_RESULTS = 'sentimentResults';

// Mirrors DEFAULT_SENTIMENT_CONFIG's threshold values
// (src/features/boards/types/sentiment.ts) without importing that module directly —
// production code under server/src/domain/ (and its adapters) must never cross-import
// from src/ (research.md item 5). These are the frontend's shipped defaults.
const DEFAULT_SENTIMENT_THRESHOLDS: SentimentConfiguration = {
    threshold: 0.4,
    thresholds: {
        positive: 0.4,
        negative: 0.4,
        neutral: 0.25,
    },
};

function toDate(value: unknown): Date {
    if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate();
    }
    return value instanceof Date ? value : new Date(value as string);
}

/**
 * Read-only Admin SDK access backing the Team Retrospective Metrics Dashboard (056,
 * User Story 1). Thin firebase-admin query composition — consistent with
 * FirestoreBoardsAdapter/FirestoreTeamsAdapter elsewhere in this codebase, this file
 * is exempt from Vitest unit tests and is instead verified end-to-end by the
 * Playwright E2E suite against the emulator.
 */
export class FirestoreTeamMetricsAdapter implements TeamMetricsPort {
    constructor(private readonly db: Firestore) {}

    async getTeamMetrics(teamId: string): Promise<TeamMetricsSummary> {
        const snap = await this.db.collection(RETROSPECTIVES).where('teamId', '==', teamId).get();
        const participantCounts = snap.docs.map((doc) => (doc.data().participantCount as number | undefined) ?? 0);
        const retrospectives = snap.docs.map((doc) => ({
            id: doc.id,
            title: (doc.data().title as string | undefined) ?? '',
            createdAt: toDate(doc.data().createdAt),
        }));
        const retrospectiveIds = retrospectives.map((r) => r.id);

        const { retrospectiveCount, averageParticipants } = computeActivitySummary(participantCounts);
        const actionItemsCreated = await this.countActionItems(retrospectiveIds);
        const moodEvolution = await this.computeMoodEvolution(retrospectives);

        return {
            teamId,
            retrospectiveCount,
            averageParticipants,
            actionItemsCreated,
            moodEvolution,
        };
    }

    // 056-team-metrics-dashboard, T030 (research.md item 5): one batched, chunked pass
    // over sentimentResults across ALL the team's retrospectives (no N+1 per-retro
    // queries), grouped by retrospectiveId, then scored via the T028/T029 domain
    // duplicates using the frontend's default confidence thresholds.
    private async computeMoodEvolution(
        retrospectives: { id: string; title: string; createdAt: Date }[]
    ): Promise<RetrospectiveMoodPoint[]> {
        if (retrospectives.length === 0) {
            return [];
        }

        const retrospectiveIds = retrospectives.map((r) => r.id);
        const resultsByRetrospectiveId = new Map<string, { sentiment: SentimentType; confidence: number }[]>();

        for (let i = 0; i < retrospectiveIds.length; i += 30) {
            const chunk = retrospectiveIds.slice(i, i + 30);
            const snap = await this.db.collection(SENTIMENT_RESULTS).where('retrospectiveId', 'in', chunk).get();
            for (const doc of snap.docs) {
                const data = doc.data();
                const retrospectiveId = data.retrospectiveId as string;
                const existing = resultsByRetrospectiveId.get(retrospectiveId) ?? [];
                existing.push({ sentiment: data.sentiment as SentimentType, confidence: data.confidence as number });
                resultsByRetrospectiveId.set(retrospectiveId, existing);
            }
        }

        const points = retrospectives.map((retro) => {
            const results = resultsByRetrospectiveId.get(retro.id) ?? [];
            const confidentResults = results.filter((result) => isConfident(result, DEFAULT_SENTIMENT_THRESHOLDS));

            let moodScore: number | null = null;
            if (confidentResults.length > 0) {
                const counts = { positive: 0, neutral: 0, negative: 0 };
                for (const result of confidentResults) {
                    counts[result.sentiment] += 1;
                }
                moodScore = calculateMoodScore(counts);
            }

            return {
                retrospectiveId: retro.id,
                retrospectiveTitle: retro.title,
                createdAt: retro.createdAt,
                moodScore,
            };
        });

        return points.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    // 056-team-metrics-dashboard, T020 (research.md item 4): mirrors the exact chunking
    // pattern FirestoreBoardsAdapter.listBoardsForUser uses for its `teams`-collection
    // batch lookup — Firestore 'in' queries cap at 30 values, and an empty id list must
    // never reach an 'in' query (Firestore throws on that).
    private async countActionItems(retrospectiveIds: string[]): Promise<number> {
        if (retrospectiveIds.length === 0) {
            return 0;
        }

        let total = 0;
        for (let i = 0; i < retrospectiveIds.length; i += 30) {
            const chunk = retrospectiveIds.slice(i, i + 30);
            const snap = await this.db.collection(ACTION_ITEMS).where('retrospectiveId', 'in', chunk).get();
            total += snap.size;
        }
        return total;
    }
}
