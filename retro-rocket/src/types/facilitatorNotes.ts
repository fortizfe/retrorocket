export interface FacilitatorNote {
    id: string;
    content: string;
    timestamp: Date;
    retrospectiveId: string;
    facilitatorId: string;
}

export interface FacilitatorNotesState {
    notes: FacilitatorNote[];
    loading: boolean;
    error: string | null;
}
