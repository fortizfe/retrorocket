export interface Retrospective {
  id: string;
  title: string;
  description?: string;
  createdBy: string; // user UID
  createdAt: Date;
  updatedAt: Date;
  participantCount: number;
  isActive: boolean;
}

export interface RetrospectiveCard {
  id: string;
  content: string;
  column: ColumnType;
  createdBy: string;
  createdAt: Date;
  retrospectiveId: string;
  votes?: number;
}

export type ColumnType = 'helped' | 'hindered' | 'improve';

export interface ColumnConfig {
  id: ColumnType;
  title: string;
  description: string;
  color: string;
  icon: string;
}