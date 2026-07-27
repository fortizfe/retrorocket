import type {
    ActionItemRecord,
    CardGroupRecord,
    CardRecord,
    FacilitatorNoteRecord,
    ParticipantRecord,
    RetrospectiveAccessRecord,
    RetrospectiveListEntry,
    RetrospectiveReadPort,
    SentimentResultRecord,
} from '../../../../src/application/ports/mcp';

export interface FakeRetrospectiveFixture {
    retrospectives?: RetrospectiveAccessRecord[];
    listEntries?: RetrospectiveListEntry[];
    cards?: CardRecord[];
    groups?: CardGroupRecord[];
    participants?: ParticipantRecord[];
    sentimentResults?: SentimentResultRecord[];
    actionItems?: ActionItemRecord[];
    facilitatorNotes?: FacilitatorNoteRecord[];
}

export function fakeRetrospectiveReadPort(fixture: FakeRetrospectiveFixture = {}): RetrospectiveReadPort {
    return {
        getRetrospective: async (id) => fixture.retrospectives?.find((r) => r.id === id) ?? null,
        listRetrospectivesForUser: async () => fixture.listEntries ?? [],
        listCards: async () => fixture.cards ?? [],
        listGroups: async () => fixture.groups ?? [],
        listParticipants: async () => fixture.participants ?? [],
        listSentimentResults: async () => fixture.sentimentResults ?? [],
        listActionItems: async () => fixture.actionItems ?? [],
        listFacilitatorNotes: async () => fixture.facilitatorNotes ?? [],
    };
}
