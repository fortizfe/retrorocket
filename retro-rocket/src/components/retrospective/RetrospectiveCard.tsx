import React from 'react';
import { Card } from '../ui/Card';
import { CardType } from '../../types/card';

interface RetrospectiveCardProps {
  card: CardType;
  onDelete: (id: string) => void;
}

const RetrospectiveCard: React.FC<RetrospectiveCardProps> = ({ card, onDelete }) => {
  return (
    <Card className="p-4 mb-4 shadow-md rounded-lg bg-white">
      <h3 className="font-bold text-lg">{card.title}</h3>
      <p className="text-gray-700">{card.content}</p>
      <button
        onClick={() => onDelete(card.id)}
        className="mt-2 text-red-500 hover:text-red-700"
      >
        Delete
      </button>
    </Card>
  );
};

export default RetrospectiveCard;