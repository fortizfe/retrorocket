import { ColumnConfig, ColumnType } from '../types/retrospective';

export const DEFAULT_PARTICIPANT_NAME = "Anonymous";

export const COLUMNS: Record<ColumnType, ColumnConfig> = {
  helped: {
    id: 'helped',
    title: 'Qué me ayudó',
    description: 'Cosas que funcionaron bien y nos ayudaron',
    color: 'bg-green-50 border-green-200',
    icon: '👍'
  },
  hindered: {
    id: 'hindered',
    title: 'Qué me retrasó',
    description: 'Obstáculos o problemas que encontramos',
    color: 'bg-red-50 border-red-200',
    icon: '⚠️'
  },
  improve: {
    id: 'improve',
    title: 'Qué podemos hacer mejor',
    description: 'Ideas y sugerencias para mejorar',
    color: 'bg-blue-50 border-blue-200',
    icon: '💡'
  }
};

export const COLUMN_ORDER: ColumnType[] = ['helped', 'hindered', 'improve'];

export const RETROSPECTIVE_COLUMNS = [
  { id: "helped", title: "Qué me ayudó" },
  { id: "hindered", title: "Qué me retrasó" },
  { id: "improve", title: "Qué podemos hacer mejor" },
];

export const FIRESTORE_COLLECTIONS = {
  RETROSPECTIVES: "retrospectives",
  PARTICIPANTS: "participants",
  CARDS: "cards",
} as const;

export const APP_NAME = 'RetroRocket';
export const APP_DESCRIPTION = 'Herramienta moderna y colaborativa para retrospectivas de equipos Scrum';