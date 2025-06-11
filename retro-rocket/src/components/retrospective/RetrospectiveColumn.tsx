import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import DragDropColumn from './DragDropColumn';
import { Card as CardType, CreateCardInput, EmojiReaction } from '../../types/card';
import { ColumnConfig } from '../../types/retrospective';

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
  const [isCreating, setIsCreating] = useState(false);
  const [newCardContent, setNewCardContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateCard = async () => {
    if (!newCardContent.trim() || !currentUser) return;

    setIsSubmitting(true);
    try {
      const cardInput: CreateCardInput = {
        content: newCardContent.trim(),
        column: column.id,
        createdBy: currentUser,
        retrospectiveId
      };

      await onCardCreate(cardInput);
      setNewCardContent('');
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating card:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setNewCardContent('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <Card variant="outlined" padding="sm" className={`mb-4 ${column.color}`}>
        <div className="flex items-center space-x-2">
          <span className="text-lg">{column.icon}</span>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {column.title}
            </h2>
            <p className="text-sm text-gray-600">{column.description}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-gray-500">
            {cards.length} {cards.length === 1 ? 'tarjeta' : 'tarjetas'}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsCreating(true)}
            disabled={isCreating || !currentUser}
            className="flex items-center space-x-1"
          >
            <Plus size={14} />
            <span>Agregar</span>
          </Button>
        </div>
      </Card>

      {/* Cards Container */}
      <div className="flex-1 space-y-0 overflow-y-auto">
        <AnimatePresence>
          {/* New Card Form */}
          {isCreating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3"
            >
              <Card variant="outlined" className="border-dashed border-2 border-gray-300">
                <Textarea
                  value={newCardContent}
                  onChange={(e) => setNewCardContent(e.target.value)}
                  placeholder={`¿Qué ${column.title.toLowerCase()}?`}
                  rows={3}
                  autoFocus
                  className="mb-3"
                />
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleCreateCard}
                    loading={isSubmitting}
                    disabled={!newCardContent.trim()}
                  >
                    Crear tarjeta
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelCreate}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Cards with Drag & Drop */}
          <DragDropColumn
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

          {/* Empty State */}
          {cards.length === 0 && !isCreating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <div className="text-4xl mb-2">{column.icon}</div>
              <p className="text-gray-500 text-sm mb-3">
                No hay tarjetas aún
              </p>
              {currentUser && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCreating(true)}
                  className="flex items-center space-x-1 mx-auto"
                >
                  <Plus size={14} />
                  <span>Agregar primera tarjeta</span>
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