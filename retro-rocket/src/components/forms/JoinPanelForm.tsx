import React, { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useParticipants } from '../../hooks/useParticipants';

interface JoinPanelFormProps {
    retrospectiveId: string;
    onParticipantJoined?: (participantId: string, name: string) => void;
}

const JoinPanelForm: React.FC<JoinPanelFormProps> = ({
    retrospectiveId,
    onParticipantJoined
}) => {
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { addParticipant } = useParticipants(retrospectiveId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            setIsSubmitting(true);
            try {
                const participantId = await addParticipant({
                    name: name.trim(),
                    retrospectiveId
                });
                onParticipantJoined?.(participantId, name.trim());
                setName('');
            } catch (error) {
                console.error('Error adding participant:', error);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col items-center">
            <Input
                type="text"
                placeholder="Ingresa tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mb-4"
            />
            <Button
                type="submit"
                className="w-full"
                loading={isSubmitting}
                disabled={!name.trim()}
            >
                Unirse al panel
            </Button>
        </form>
    );
};

export default JoinPanelForm;