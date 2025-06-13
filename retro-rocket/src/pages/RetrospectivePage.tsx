import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Copy, Share2, Users, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Loading from '../components/ui/Loading';
import RetrospectiveBoard from '../components/retrospective/RetrospectiveBoard';
import { useRetrospective } from '../hooks/useRetrospective';
import { useParticipants } from '../hooks/useParticipants';
import { incrementParticipantCount, decrementParticipantCount } from '../services/retrospectiveService';

const RetrospectivePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [participantName, setParticipantName] = useState('');
    const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null);
    const [hasJoined, setHasJoined] = useState(false);

    const { retrospective, loading: retroLoading, error: retroError } = useRetrospective(id);
    const { addParticipant, setInactive } = useParticipants(id);

    // Load participant name from localStorage
    useEffect(() => {
        const savedName = localStorage.getItem('participantName');
        if (savedName) {
            setParticipantName(savedName);
        }
    }, []);

    // Handle participant joining
    const handleJoinRetrospective = async () => {
        if (!participantName.trim() || !id) {
            toast.error('Por favor ingresa tu nombre');
            return;
        }

        try {
            const participantId = await addParticipant({
                name: participantName.trim(),
                retrospectiveId: id
            });

            await incrementParticipantCount(id);

            setCurrentParticipantId(participantId);
            setHasJoined(true);
            localStorage.setItem('participantName', participantName.trim());
            localStorage.setItem(`participant_${id}`, participantId);

            toast.success(`¡Bienvenido ${participantName}!`);
        } catch (error) {
            console.error('Error joining retrospective:', error);
            toast.error('Error al unirse a la retrospectiva');
        }
    };

    // Handle leaving retrospective
    const handleLeaveRetrospective = async () => {
        if (currentParticipantId && id) {
            try {
                await setInactive(currentParticipantId);
                await decrementParticipantCount(id);

                setHasJoined(false);
                setCurrentParticipantId(null);
                localStorage.removeItem(`participant_${id}`);

                toast.success('Has salido de la retrospectiva');
                navigate('/');
            } catch (error) {
                console.error('Error leaving retrospective:', error);
                toast.error('Error al salir de la retrospectiva');
            }
        }
    };

    // Copy retrospective ID to clipboard
    const handleCopyId = () => {
        if (id) {
            navigator.clipboard.writeText(id);
            toast.success('ID copiado al portapapeles');
        }
    };

    // Share retrospective
    const handleShare = () => {
        if (id) {
            const url = `${window.location.origin}/retrospective/${id}`;
            navigator.clipboard.writeText(url);
            toast.success('Enlace copiado al portapapeles');
        }
    };

    // Check if user has already joined (from localStorage)
    useEffect(() => {
        if (id) {
            const savedParticipantId = localStorage.getItem(`participant_${id}`);
            if (savedParticipantId) {
                setCurrentParticipantId(savedParticipantId);
                setHasJoined(true);
            }
        }
    }, [id]);

    if (!id) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">ID de retrospectiva no válido</p>
                    <Button onClick={() => navigate('/')}>Volver al inicio</Button>
                </div>
            </div>
        );
    }

    if (retroLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loading size="lg" text="Cargando retrospectiva..." />
            </div>
        );
    }

    if (retroError || !retrospective) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">
                        {retroError || 'Retrospectiva no encontrada'}
                    </p>
                    <Button onClick={() => navigate('/')}>Volver al inicio</Button>
                </div>
            </div>
        );
    }

    if (!hasJoined) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md mx-4"
                >
                    <Card variant="elevated" padding="lg">
                        <div className="text-center mb-6">
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                {retrospective.title}
                            </h1>
                            {retrospective.description && (
                                <p className="text-gray-600 text-sm">{retrospective.description}</p>
                            )}
                        </div>

                        <div className="space-y-4">
                            <Input
                                label="Tu nombre"
                                value={participantName}
                                onChange={(e) => setParticipantName(e.target.value)}
                                placeholder="Ej: Juan Pérez"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && participantName.trim()) {
                                        handleJoinRetrospective();
                                    }
                                }}
                            />

                            <Button
                                variant="primary"
                                onClick={handleJoinRetrospective}
                                disabled={!participantName.trim()}
                                className="w-full"
                            >
                                Unirse a la Retrospectiva
                            </Button>

                            <div className="flex items-center space-x-2 pt-4 border-t">
                                <div className="flex-1">
                                    <p className="text-xs text-gray-500 mb-1">ID de la retrospectiva:</p>
                                    <div className="flex items-center space-x-2">
                                        <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                                            {id}
                                        </code>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={handleCopyId}
                                        >
                                            <Copy size={14} />
                                        </Button>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleShare}
                                >
                                    <Share2 size={14} />
                                </Button>
                            </div>

                            <div className="text-center pt-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => navigate('/')}
                                    className="text-sm"
                                >
                                    <ArrowLeft size={14} className="mr-1" />
                                    Volver al inicio
                                </Button>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="ghost"
                                onClick={() => navigate('/')}
                                className="flex items-center space-x-1"
                            >
                                <ArrowLeft size={16} />
                                <span>Salir</span>
                            </Button>
                        </div>

                        <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <Users size={16} />
                                <span>Como: <strong>{participantName}</strong></span>
                            </div>

                            <div className="flex items-center space-x-1">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCopyId}
                                    className="flex items-center space-x-1"
                                >
                                    <Copy size={14} />
                                    <span className="hidden sm:inline">ID</span>
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleShare}
                                    className="flex items-center space-x-1"
                                >
                                    <Share2 size={14} />
                                    <span className="hidden sm:inline">Compartir</span>
                                </Button>
                            </div>

                            <Button
                                size="sm"
                                variant="danger"
                                onClick={handleLeaveRetrospective}
                            >
                                Salir
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-6 h-full">
                <RetrospectiveBoard
                    retrospective={retrospective}
                    currentUser={currentParticipantId ?? undefined}
                />
            </div>
        </div>
    );
};

export default RetrospectivePage;