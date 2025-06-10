import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ThumbsUp, Edit2, User } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import { Card as CardType } from '../../types/card';

interface RetrospectiveCardProps {
  card: CardType;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<CardType>) => void;
  onVote: (cardId: string, increment: boolean) => void;
  currentUser?: string;
  canEdit?: boolean;
}

const RetrospectiveCard: React.FC<RetrospectiveCardProps> = ({
  card,
  onDelete,
  onUpdate,
  onVote,
  currentUser,
  canEdit = true
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(card.content);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSaveEdit = async () => {
    if (editContent.trim() && editContent !== card.content) {
      try {
        await onUpdate(card.id, { content: editContent.trim() });
        setIsEditing(false);
      } catch (error) {
        console.error('Error updating card:', error);
      }
    } else {
      setIsEditing(false);
      setEditContent(card.content);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(card.content);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(card.id);
    } catch (error) {
      console.error('Error deleting card:', error);
      setIsDeleting(false);
    }
  };

  const handleVote = (increment: boolean) => {
    onVote(card.id, increment);
  };

  const isOwner = currentUser === card.createdBy;
  const canEditCard = canEdit && isOwner;

  return (
    <AnimatePresence>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          variant="elevated"
          hover={!isEditing}
          className="mb-3 group"
        >
          {/* Header with author */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <User size={14} />
              <span>{card.createdBy}</span>
            </div>
            <div className="flex items-center space-x-1">
              {/* Vote buttons */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-full px-2 py-1">
                <button
                  onClick={() => handleVote(true)}
                  className="text-gray-600 hover:text-blue-600 transition-colors"
                  aria-label="Vote up"
                >
                  <ThumbsUp size={14} />
                </button>
                <span className="text-sm font-medium text-gray-700">
                  {card.votes || 0}
                </span>
                <button
                  onClick={() => handleVote(false)}
                  className="text-gray-600 hover:text-red-600 transition-colors"
                  aria-label="Vote down"
                  disabled={!card.votes || card.votes === 0}
                >
                  <ThumbsUp size={14} className="rotate-180" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="mb-3">
            {isEditing ? (
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Escribe tu comentario..."
                rows={3}
                autoFocus
                className="w-full"
              />
            ) : (
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {card.content}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">
              {card.createdAt && new Date(card.createdAt).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>

            {canEditCard && (
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isEditing ? (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleSaveEdit}
                      disabled={!editContent.trim()}
                    >
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                    >
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditing(true)}
                      aria-label="Edit card"
                    >
                      <Edit2 size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDelete}
                      loading={isDeleting}
                      aria-label="Delete card"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default RetrospectiveCard;