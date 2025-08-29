import React, { useState } from 'react';
import ParticipantList from './participants/ParticipantList';
import { Participant } from '../types/participant';

// Datos de ejemplo
const sampleParticipants: Participant[] = [
    {
        id: '1',
        name: 'Alice Johnson',
        userId: 'user1',
        retrospectiveId: 'retro1',
        photoURL: null,
        joinedAt: new Date('2024-08-29T10:30:00')
    },
    {
        id: '2',
        name: 'Bob Smith',
        userId: 'user2',
        retrospectiveId: 'retro1',
        photoURL: null,
        joinedAt: new Date('2024-08-29T11:15:00')
    },
    {
        id: '3',
        name: 'Carol Davis',
        userId: 'user3',
        retrospectiveId: 'retro1',
        photoURL: null,
        joinedAt: new Date('2024-08-29T09:45:00')
    },
    {
        id: '4',
        name: 'David Wilson',
        userId: 'user4',
        retrospectiveId: 'retro1',
        photoURL: null,
        joinedAt: new Date('2024-08-29T12:00:00')
    },
    {
        id: '5',
        name: 'Emma Brown',
        userId: 'user5',
        retrospectiveId: 'retro1',
        photoURL: null,
        joinedAt: new Date('2024-08-29T10:00:00')
    }
];

const ParticipantListDemo: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [participants, setParticipants] = useState<Participant[]>(sampleParticipants);

    const addParticipant = () => {
        const newParticipant: Participant = {
            id: Date.now().toString(),
            name: `Participant ${participants.length + 1}`,
            userId: `user${Date.now()}`,
            retrospectiveId: 'retro1',
            photoURL: null,
            joinedAt: new Date()
        };
        setParticipants([...participants, newParticipant]);
    };

    const removeParticipant = () => {
        if (participants.length > 0) {
            setParticipants(participants.slice(0, -1));
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-slate-900 mb-8">
                    Test de Prevención de Scroll - Lista de Participantes
                </h1>

                <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4">Controles</h2>
                    <div className="flex flex-wrap gap-4 mb-4">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Abrir Lista de Participantes
                        </button>
                        <button
                            onClick={addParticipant}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Agregar Participante
                        </button>
                        <button
                            onClick={removeParticipant}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Quitar Participante
                        </button>
                    </div>
                    <p className="text-slate-600">
                        Participantes actuales: <span className="font-semibold">{participants.length}</span>
                    </p>
                </div>

                {/* Contenido scrolleable */}
                <div className="space-y-6">
                    {Array.from({ length: 10 }, (_, i) => (
                        <div key={i} className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold mb-2">Sección {i + 1}</h3>
                            <p className="text-slate-600 mb-4">
                                Este es contenido de prueba para hacer que la página sea scrolleable.
                                Cuando abras el modal de participantes, este fondo no debería hacer scroll.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-500">
                                <div>
                                    <strong>Fecha:</strong> {new Date().toLocaleDateString()}
                                </div>
                                <div>
                                    <strong>Hora:</strong> {new Date().toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal con ParticipantList */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[80vh] overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-slate-900">
                                Lista de Participantes
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                            >
                                ×
                            </button>
                        </div>

                        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                                <strong>Prueba:</strong> Intenta hacer scroll en la página de fondo.
                                No debería moverse mientras este modal esté abierto.
                            </p>
                        </div>

                        <ParticipantList
                            participants={participants}
                            preventBackgroundScroll={true}
                            showCount={true}
                            compact={false}
                            maxHeight="max-h-96"
                        />

                        <div className="mt-4 pt-4 border-t border-slate-200">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-full px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                            >
                                Cerrar Modal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParticipantListDemo;
