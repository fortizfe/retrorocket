import { backendApiClient } from '@/lib/services/backendApiClient';
import { CountdownTimer } from '@/features/boards/types/countdown';

interface RawCountdownTimer extends Omit<CountdownTimer, 'startTime' | 'endTime' | 'createdAt' | 'updatedAt'> {
    startTime: string | null;
    endTime: string | null;
    createdAt: string;
    updatedAt: string;
}

function parseTimer(raw: RawCountdownTimer): CountdownTimer {
    return {
        ...raw,
        startTime: raw.startTime ? new Date(raw.startTime) : null,
        endTime: raw.endTime ? new Date(raw.endTime) : null,
        createdAt: new Date(raw.createdAt),
        updatedAt: new Date(raw.updatedAt),
    };
}

/** Replaces countdownService.ts's direct Firestore access (feature 017 US3). */
export async function createOrUpdateTimer(retrospectiveId: string, duration: number): Promise<CountdownTimer> {
    const raw = await backendApiClient.post<RawCountdownTimer>(`/api/boards/${retrospectiveId}/countdown`, { duration });
    return parseTimer(raw);
}

export async function startTimer(retrospectiveId: string): Promise<CountdownTimer> {
    const raw = await backendApiClient.post<RawCountdownTimer>(`/api/boards/${retrospectiveId}/countdown/start`);
    return parseTimer(raw);
}

export async function pauseTimer(retrospectiveId: string): Promise<CountdownTimer> {
    const raw = await backendApiClient.post<RawCountdownTimer>(`/api/boards/${retrospectiveId}/countdown/pause`);
    return parseTimer(raw);
}

export async function resetTimer(retrospectiveId: string): Promise<CountdownTimer> {
    const raw = await backendApiClient.post<RawCountdownTimer>(`/api/boards/${retrospectiveId}/countdown/reset`);
    return parseTimer(raw);
}

export async function deleteTimer(retrospectiveId: string): Promise<void> {
    await backendApiClient.delete(`/api/boards/${retrospectiveId}/countdown`);
}

/** Parses the `countdown` SSE snapshot/event payload (contracts/realtime-events.md). */
export function parseCountdownSnapshot(raw: RawCountdownTimer | null): CountdownTimer | null {
    return raw ? parseTimer(raw) : null;
}
