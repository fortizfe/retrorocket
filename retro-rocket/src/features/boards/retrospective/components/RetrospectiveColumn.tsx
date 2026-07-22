import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Card from '@/lib/components/ui/Card';
import Button from '@/lib/components/ui/Button';
import TextareaWithEmoji from '@/lib/components/ui/TextareaWithEmoji';
import ColorPicker from '@/lib/components/ui/ColorPicker';
import TypingPreview from '@/lib/components/ui/TypingPreview';
import DragDropColumn from '@/features/boards/retrospective/components/DragDropColumn';
import { useTypingContext } from '@/features/boards/retrospective/contexts/TypingProvider';
import { Card as CardType, CreateCardInput, EmojiReaction, CardColor } from '@/features/boards/types/card';
import { ColumnConfig } from '@/features/boards/types/retrospective';
import { getCardStyling, getSuggestedColorForColumn } from '@/lib/utils/cardColors';

interface RetrospectiveColumnProps {
  column: ColumnConfig;
  cards: CardType[];
  onCardCreate: (cardInput: CreateCardInput) => Promise<void>;
  onCardUpdate: (cardId: string, updates: Partial<CardType>) => Promise<void>;
  onCardDelete: (cardId: string) => Promise<void>;
  onCardVote: (cardId: string, increment: boolean) => Promise<void>;
  onCardLike: (cardId: string, userId: string, username: string) => Promise<void>;
  onCardReaction: (cardId: string, userId: string, username: string, emoji: EmojiReaction) => Promise<void>;
  onCardReactionRemove: (cardId: string, userId: string) => Promise<void>;
  onCardsReorder: (updates: Array<{ cardId: string; order: number; column?: string }>) => Promise<void>;
  currentUser?: string;
  retrospectiveId: string;
}

const RetrospectiveColumn: React.FC<RetrospectiveColumnProps> = ({
  column,
  cards,
  onCardCreate,
  onCardUpdate,
  onCardDelete,
  onCardVote,
  onCardLike,
  onCardReaction,
  onCardReactionRemove,
  onCardsReorder,
  currentUser,
  retrospectiveId
}) => {
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const [newCardContent, setNewCardContent] = useState('');
  const [selectedColor, setSelectedColor] = useState<CardColor>(() => getSuggestedColorForColumn(column.title, column.id));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get typing context
  const { startTyping, stopTyping, getTypingUsersForColumn } = useTypingContext();

  // Get typing users for this column
  const typingUsers = getTypingUsersForColumn(column.id);

  const handleCreateCard = async () => {
    if (!newCardContent.trim() || !currentUser) return;

    // Stop typing when submitting
    stopTyping(column.id);

    setIsSubmitting(true);
    try {
      const cardInput: CreateCardInput = {
        content: newCardContent.trim(),
        column: column.id,
        createdBy: currentUser,
        retrospectiveId,
        color: selectedColor
      };

      await onCardCreate(cardInput);
      setNewCardContent('');
      setSelectedColor(getSuggestedColorForColumn(column.title, column.id));
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating card:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelCreate = () => {
    // Stop typing when canceling
    stopTyping(column.id);
    setIsCreating(false);
    setNewCardContent('');
    setSelectedColor(getSuggestedColorForColumn(column.title, column.id));
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewCardContent(value);

    // Start typing when user begins typing
    if (value.length > 0) {
      startTyping(column.id);
    } else {
      stopTyping(column.id);
    }
  };

  const handleTextareaBlur = () => {
    // Stop typing when textarea loses focus
    setTimeout(() => {
      stopTyping(column.id);
    }, 1000); // Small delay to avoid flickering
  };

  return (
    <div className="flex flex-col h-full min-w-[320px] max-w-full bg-surface-raised rounded-lg border border-border-default shadow-sm overflow-hidden">
      {/* Column Header optimizado */}
      <Card variant="outlined" padding="xs" className={`sticky top-0 z-10 bg-surface-raised/90 backdrop-blur border-b border-border-default flex items-start justify-between h-24 box-border ${column.color}`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{column.icon}</span>
          {/* Enforce consistent header layout and clamp description to 2 lines */}
          <div className="flex-1 h-full flex flex-col justify-start pt-2">
            <h2 className="text-base font-bold text-text-primary leading-tight truncate">{column.title}</h2>
            <p className="text-xs text-text-muted two-line-clamp">{column.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {t('retrospective.columns.cardsCount', { count: cards.length })}
          </span>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsCreating(true)}
            disabled={isCreating || !currentUser}
            className="flex items-center gap-1 px-2 py-1 text-xs"
          >
            <Plus size={14} />
            <span>{t('retrospective.columns.add')}</span>
          </Button>
        </div>
      </Card>

      {/* Cards Container optimizado */}
      <div className="mb-2" />
      {/* Prevent horizontal overflow caused by hover effects or absolute children */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2 space-y-2">
        {/* New Card Form - compacta y animada */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              key="new-card-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2"
            >
              <Card
                variant="outlined"
                customBackground={true}
                className={`border-dashed border-2 transition-all duration-300 ${getCardStyling(selectedColor)} p-2`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 italic">
                    {t('retrospective.columns.colorPreview')}
                  </span>
                  <ColorPicker
                    selectedColor={selectedColor}
                    onColorChange={setSelectedColor}
                    size="sm"
                  />
                </div>

                <TextareaWithEmoji
                  value={newCardContent}
                  onChange={handleTextareaChange}
                  onBlur={handleTextareaBlur}
                  placeholder={t(`retrospective.columns.placeholders.${column.id}`, {
                    defaultValue: t('retrospective.columns.placeholder', { columnTitle: column.title.toLowerCase() })
                  })}
                  rows={2}
                  autoFocus
                  className="mb-2 bg-transparent border-none focus:ring-0 resize-none text-sm"
                  showEmojiPicker={true}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleCreateCard}
                    loading={isSubmitting}
                    disabled={!newCardContent.trim()}
                  >
                    {t('retrospective.columns.createCard')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelCreate}
                    disabled={isSubmitting}
                  >
                    {t('retrospective.columns.cancel')}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Typing Preview */}
        {typingUsers.length > 0 && (
          <TypingPreview
            typingUsers={typingUsers}
            className="mb-2"
          />
        )}

        {/* Cards con Drag & Drop y layout compacto */}
        <DragDropColumn
          key={`cards-${column.id}`}
          cards={cards}
          column={column.id}
          onCardUpdate={onCardUpdate}
          onCardDelete={onCardDelete}
          onCardVote={onCardVote}
          onCardLike={onCardLike}
          onCardReaction={onCardReaction}
          onCardReactionRemove={onCardReactionRemove}
          onCardsReorder={onCardsReorder}
          currentUser={currentUser}
          canEdit={true}
        />

        {/* Empty State - compacta y animada */}
        <AnimatePresence>
          {cards.length === 0 && !isCreating && (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-6"
            >
              <div className="text-3xl mb-1">{column.icon}</div>
              <p className="text-gray-400 text-xs mb-2">
                {t('retrospective.columns.noCards')}
              </p>
              {currentUser && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-1 mx-auto text-xs"
                >
                  <Plus size={14} />
                  <span>{t('retrospective.columns.addFirstCard')}</span>
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RetrospectiveColumn;