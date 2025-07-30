export interface CountdownTimer {
    id: string;
    retrospectiveId: string;
    startTime: Date | null;
    duration: number; // current duration in seconds (can change with pause)
    originalDuration: number; // initial duration configured (never changes)
    isRunning: boolean;
    isPaused: boolean;
    endTime: Date | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CountdownState {
    timeRemaining: number; // in seconds
    isRunning: boolean;
    isPaused: boolean;
    isFinished: boolean;
    totalDuration: number;
}

export interface CountdownControlsProps {
    retrospectiveId: string;
    isOwner: boolean;
}

export interface CountdownDisplayProps {
    retrospectiveId: string;
}

export interface CountdownInputs {
    minutes: number;
    seconds: number;
}
