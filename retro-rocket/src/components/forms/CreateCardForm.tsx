import React, { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { createCard } from '../../services/cardService';

const CreateCardForm: React.FC<{ columnId: string }> = ({ columnId }) => {
    const [cardContent, setCardContent] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cardContent.trim()) {
            await createCard(columnId, cardContent);
            setCardContent('');
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
            <Button type="submit" className="self-start">
                Add Card
            </Button>
        </form>
    );
};

export default CreateCardForm;