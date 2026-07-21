export type AuthProviderType = 'google' | 'github' | 'apple';

export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    providers: AuthProviderType[]; // Changed to array
    primaryProvider: AuthProviderType; // The first provider used
    createdAt: Date;
    updatedAt: Date;
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string | null;
    providers: AuthProviderType[]; // Changed to array
    primaryProvider: AuthProviderType; // The first provider used
    joinedBoards: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface AuthState {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    error: string | null;
    isAuthenticated: boolean;
}

export interface UserBoardHistory {
    id: string;
    userId: string;
    boardId: string;
    boardTitle: string;
    lastAccessed: Date;
    accessCount: number;
}

export interface AuthProvider {
    id: AuthProviderType;
    name: string;
    icon: string;
    available: boolean;
    comingSoon?: boolean;
}
