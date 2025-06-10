import React, { useState } from 'react';
import JoinPanelForm from '../components/forms/JoinPanelForm';
import Layout from '../components/layout/Layout';

const Home: React.FC = () => {
    const [participantName, setParticipantName] = useState<string>('');

    const handleNameSubmit = (name: string) => {
        setParticipantName(name);
    };

    return (
        <Layout>
            <div className="flex flex-col items-center justify-center h-screen">
                <h1 className="text-4xl font-bold mb-4">Welcome to RetroRocket!</h1>
                {!participantName ? (
                    <JoinPanelForm onSubmit={handleNameSubmit} />
                ) : (
                    <h2 className="text-2xl">Hello, {participantName}! Join a retrospective panel.</h2>
                )}
            </div>
        </Layout>
    );
};

export default Home;