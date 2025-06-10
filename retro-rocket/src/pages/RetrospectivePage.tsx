import React, { useState } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { useRetrospective } from '../hooks/useRetrospective';
import { useParticipants } from '../hooks/useParticipants';
import JoinPanelForm from '../components/forms/JoinPanelForm';
import RetrospectiveBoard from '../components/retrospective/RetrospectiveBoard';

const RetrospectivePage: React.FC = () => {
    const [participantName, setParticipantName] = useState<string>('');
    const { addParticipant } = useParticipants();
    const { retrospectiveData } = useRetrospective();
    const { saveRetrospectiveData } = useFirestore();

    const handleJoinPanel = () => {
        if (participantName) {
            addParticipant(participantName);
            setParticipantName('');
        }
    };

    return (
        <div className="flex flex-col items-center">
            <h1 className="text-2xl font-bold mb-4">Retrospective Panel</h1>
            <JoinPanelForm 
                participantName={participantName} 
                setParticipantName={setParticipantName} 
                onJoin={handleJoinPanel} 
            />
            <RetrospectiveBoard 
                data={retrospectiveData} 
                saveData={saveRetrospectiveData} 
            />
        </div>
    );
};

export default RetrospectivePage;