import React, { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { createCard } from '../../services/cardService';
import { CreateCardInput } from '../../types/card';

interface CreateCardFormProps {
    columnId: string;
    retrospectiveId: string;
    participantName: string;
    onCardCreated?: () => void;
}

const CreateCardForm: React.FC<CreateCardFormProps> = ({
    columnId,
    retrospectiveId,
    participantName,
    onCardCreated
}) => {
    const [cardContent, setCardContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cardContent.trim()) {
            setIsSubmitting(true);
            try {
                const cardInput: CreateCardInput = {
                    content: cardContent.trim(),
                    column: columnId as any,
                    createdBy: participantName,
                    retrospectiveId
                };
                await createCard(cardInput);
                setCardContent('');
                onCardCreated?.();
            } catch (error) {
                console.error('Error creating card:', error);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col">
            <Input
                value={cardContent}
                onChange={(e) => setCardContent(e.target.value)}
                placeholder="Enter your card content"
                className="mb-2"
            />
            <Button
                type="submit"
                className="self-start"
                loading={isSubmitting}
                disabled={!cardContent.trim()}
            >
                Add Card
            </Button>
        </form>
    );
};

export default CreateCardForm;