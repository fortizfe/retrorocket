import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Rocket, Users, Zap, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { useRetrospective } from '../hooks/useRetrospective';
import { APP_NAME, APP_DESCRIPTION } from '../utils/constants';

const Home: React.FC = () => {
    const [participantName, setParticipantName] = useState('');
    const [retrospectiveId, setRetrospectiveId] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newRetrospectiveTitle, setNewRetrospectiveTitle] = useState('');
    const navigate = useNavigate();
    const { createRetrospective } = useRetrospective();

    const handleJoinRetrospective = () => {
        if (!participantName.trim()) {
            toast.error('Por favor ingresa tu nombre');
            return;
        }

        if (!retrospectiveId.trim()) {
            toast.error('Por favor ingresa el ID de la retrospectiva');
            return;
        }

        // Store participant name in localStorage for the session
        localStorage.setItem('participantName', participantName.trim());
        navigate(`/retrospective/${retrospectiveId.trim()}`);
    };

    const handleCreateRetrospective = async () => {
        if (!participantName.trim()) {
            toast.error('Por favor ingresa tu nombre');
            return;
        }

        if (!newRetrospectiveTitle.trim()) {
            toast.error('Por favor ingresa un título para la retrospectiva');
            return;
        }

        try {
            setIsCreating(true);
            const newId = await createRetrospective({
                title: newRetrospectiveTitle.trim(),
                description: `Retrospectiva creada por ${participantName.trim()}`
            });

            // Store participant name in localStorage for the session
            localStorage.setItem('participantName', participantName.trim());

            toast.success('¡Retrospectiva creada exitosamente!');
            navigate(`/retrospective/${newId}`);
        } catch (error) {
            toast.error('Error al crear la retrospectiva');
            console.error('Error creating retrospective:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const features = [
        {
            icon: <Users className="w-6 h-6" />,
            title: "Colaborativo",
            description: "Múltiples participantes en tiempo real"
        },
        {
            icon: <Zap className="w-6 h-6" />,
            title: "Rápido y Simple",
            description: "Sin registro, solo ingresa y empieza"
        },
        {
            icon: <Heart className="w-6 h-6" />,
            title: "Fácil de Usar",
            description: "Interfaz intuitiva y moderna"
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="container mx-auto px-4 py-8">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <div className="flex items-center justify-center mb-4">
                        <Rocket className="w-12 h-12 text-blue-600 mr-3" />
                        <h1 className="text-4xl md:text-6xl font-bold text-gray-900">
                            {APP_NAME}
                        </h1>
                    </div>
                    <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                        {APP_DESCRIPTION}
                    </p>
                </motion.div>

                {/* Features */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
                >
                    {features.map((feature) => (
                        <Card key={feature.title} hover className="text-center">
                            <div className="text-blue-600 mb-3 flex justify-center">
                                {feature.icon}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-gray-600 text-sm">
                                {feature.description}
                            </p>
                        </Card>
                    ))}
                </motion.div>

                {/* Main Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="max-w-2xl mx-auto"
                >
                    <Card variant="elevated" padding="lg">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                            Comenzar Retrospectiva
                        </h2>

                        {/* Participant Name */}
                        <div className="mb-6">
                            <Input
                                label="Tu nombre"
                                value={participantName}
                                onChange={(e) => setParticipantName(e.target.value)}
                                placeholder="Ej: Juan Pérez"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Join Existing */}
                            <Card variant="outlined" padding="md">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                    Unirse a Retrospectiva
                                </h3>
                                <div className="space-y-4">
                                    <Input
                                        label="ID de la Retrospectiva"
                                        value={retrospectiveId}
                                        onChange={(e) => setRetrospectiveId(e.target.value)}
                                        placeholder="Ej: abc123def456"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={handleJoinRetrospective}
                                        disabled={!participantName.trim() || !retrospectiveId.trim()}
                                        className="w-full"
                                    >
                                        Unirse
                                    </Button>
                                </div>
                            </Card>

                            {/* Create New */}
                            <Card variant="outlined" padding="md">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                    Crear Nueva Retrospectiva
                                </h3>
                                <div className="space-y-4">
                                    <Input
                                        label="Título de la Retrospectiva"
                                        value={newRetrospectiveTitle}
                                        onChange={(e) => setNewRetrospectiveTitle(e.target.value)}
                                        placeholder="Ej: Sprint 24 - Retrospectiva"
                                    />
                                    <Button
                                        variant="primary"
                                        onClick={handleCreateRetrospective}
                                        loading={isCreating}
                                        disabled={!participantName.trim() || !newRetrospectiveTitle.trim()}
                                        className="w-full"
                                    >
                                        Crear Retrospectiva
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </Card>
                </motion.div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="text-center mt-12 text-gray-500 text-sm"
                >
                    <p>
                        Hecho con ❤️ para equipos que quieren mejorar continuamente
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default Home;