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
  },
  actions: {
    id: 'actions',
    title: 'Elementos de Acción',
    description: 'Acciones específicas para implementar',
    color: 'bg-amber-50 border-amber-200',
    icon: '🎯'
  }
};

export const COLUMN_ORDER: ColumnType[] = ['helped', 'hindered', 'improve'];

export const RETROSPECTIVE_COLUMNS = [
  { id: "helped", title: "Qué me ayudó" },
  { id: "hindered", title: "Qué me retrasó" },
  { id: "improve", title: "Qué podemos hacer mejor" },
  { id: "actions", title: "Elementos de Acción" },
];

export const FIRESTORE_COLLECTIONS = {
  RETROSPECTIVES: "retrospectives",
  PARTICIPANTS: "participants",
  CARDS: "cards",
  GROUPS: "groups",
  ACTION_ITEMS: "actionItems",
} as const;

export const APP_NAME = 'RetroRocket';
export const APP_DESCRIPTION = 'Transforma las retrospectivas de tu equipo en momentos de crecimiento real';