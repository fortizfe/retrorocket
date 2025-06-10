import React from 'react';
import { Card } from '../ui/Card';
import { CardType } from '../../types/card';

interface RetrospectiveColumnProps {
  title: string;
  cards: CardType[];
  onCardDelete: (cardId: string) => void;
}

const RetrospectiveColumn: React.FC<RetrospectiveColumnProps> = ({ title, cards, onCardDelete }) => {
  return (
    <div className="flex flex-col p-4 bg-gray-100 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <div className="space-y-2">
        {cards.map(card => (
          <Card key={card.id} {...card} onDelete={() => onCardDelete(card.id)} />
        ))}
      </div>
    </div>
  );
};

export default RetrospectiveColumn;