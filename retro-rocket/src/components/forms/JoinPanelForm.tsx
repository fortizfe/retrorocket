import React, { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useParticipants } from '../../hooks/useParticipants';
import { useCurrentUser } from '../../hooks/useCurrentUser';

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
    const { uid } = useCurrentUser();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && uid) {
            setIsSubmitting(true);
            try {
                const result = await addParticipant({
                    name: name.trim(),
                    userId: uid,
                    retrospectiveId
                });
                onParticipantJoined?.(result.id, name.trim());
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
                disabled={!name.trim() || !uid}
            >
                Unirse al panel
            </Button>
        </form>
    );
};

export default JoinPanelForm;