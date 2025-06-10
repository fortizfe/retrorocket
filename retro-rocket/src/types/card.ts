export interface Card {
    id: string;
    title: string;
    description: string;
    column: 'helped' | 'hindered' | 'improve';
    createdAt: Date;
    updatedAt: Date;
}