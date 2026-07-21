import { ColumnConfig, ColumnType } from '@/features/boards/types/retrospective';
import i18n from '@/i18n/config';

export const DEFAULT_PARTICIPANT_NAME = "Anonymous";

// Function to get translated columns
export const getColumns = (): Record<ColumnType, ColumnConfig> => {
  const t = i18n.getFixedT(i18n.language);

  return {
    helped: {
      id: 'helped',
      title: t('retrospective.columns.titles.whatHelped'),
      description: t('retrospective.columns.descriptions.whatHelped'),
      color: 'bg-green-50 border-green-200',
      icon: '👍'
    },
    hindered: {
      id: 'hindered',
      title: t('retrospective.columns.titles.whatHindered'),
      description: t('retrospective.columns.descriptions.whatHindered'),
      color: 'bg-red-50 border-red-200',
      icon: '⚠️'
    },
    improve: {
      id: 'improve',
      title: t('retrospective.columns.titles.whatToImprove'),
      description: t('retrospective.columns.descriptions.whatToImprove'),
      color: 'bg-blue-50 border-blue-200',
      icon: '💡'
    },
    actions: {
      id: 'actions',
      title: t('retrospective.actionItems.title'),
      description: t('retrospective.actionItems.description'),
      color: 'bg-amber-50 border-amber-200',
      icon: '🎯'
    }
  };
};

// For backward compatibility
export const COLUMNS = getColumns();

export const COLUMN_ORDER: ColumnType[] = ['helped', 'hindered', 'improve'];

// Function to get translated retrospective columns
export const getRetrospectiveColumns = () => {
  const t = i18n.getFixedT(i18n.language);
  return [
    { id: "helped", title: t('retrospective.columns.titles.whatHelped') },
    { id: "hindered", title: t('retrospective.columns.titles.whatHindered') },
    { id: "improve", title: t('retrospective.columns.titles.whatToImprove') },
    { id: "actions", title: t('retrospective.actionItems.title') },
  ];
};

// For backward compatibility
export const RETROSPECTIVE_COLUMNS = getRetrospectiveColumns();

export const FIRESTORE_COLLECTIONS = {
  RETROSPECTIVES: "retrospectives",
  PARTICIPANTS: "participants",
  CARDS: "cards",
  GROUPS: "groups",
  ACTION_ITEMS: "actionItems",
  SENTIMENT_RESULTS: "sentimentResults",
} as const;

export const APP_NAME = 'RetroRocket';

// Function to get translated app description
export const getAppDescription = () => {
  const t = i18n.getFixedT(i18n.language);
  return t('landing.hero.description');
};