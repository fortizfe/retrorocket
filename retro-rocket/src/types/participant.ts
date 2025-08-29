export interface Participant {
    id: string;
    name: string;
    userId: string;
    retrospectiveId: string;
    joinedAt: Date;
    photoURL?: string | null;
}