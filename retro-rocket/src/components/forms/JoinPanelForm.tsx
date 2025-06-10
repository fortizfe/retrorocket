import React, { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useParticipants } from '../../hooks/useParticipants';

const JoinPanelForm: React.FC = () => {
    const [name, setName] = useState('');
    const { addParticipant } = useParticipants();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            addParticipant(name);
            setName('');
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
            <Button type="submit" className="w-full">
                Unirse al panel
            </Button>
        </form>
    );
};

export default JoinPanelForm;