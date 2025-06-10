export interface Retrospective {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  cards: RetrospectiveCard[];
  participants: string[];
}

export interface RetrospectiveCard {
  id: string;
  content: string;
  column: 'helped' | 'hindered' | 'improve';
  createdBy: string;
  createdAt: Date;
}