import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Copy, Share2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import RetrospectiveBoard from '../components/retrospective/RetrospectiveBoard';
import ExportButtonGroup from '../components/retrospective/ExportButtonGroup';
import { ResponsiveParticipantDisplay } from '../components/participants';
import { CountdownTimer, FacilitatorMenu } from '../components/countdown';
import AuthWrapper from '../components/auth/AuthWrapper';
import { useRetrospective } from '../hooks/useRetrospective';
import { useParticipants } from '../hooks/useParticipants';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { incrementParticipantCount, decrementParticipantCount } from '../services/retrospectiveService';
import { Card, CardGroup } from '../types/card';

const RetrospectivePageContent: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null);
    const [hasJoined, setHasJoined] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const joinAttemptRef = useRef(false);

    const { retrospective, loading: retroLoading, error: retroError } = useRetrospective(id);
    const { addParticipant, setInactive, participants } = useParticipants(id);
    const { uid, fullName, isReady } = useCurrentUser();

    // State for export data
    const [exportCards, setExportCards] = useState<Card[]>([]);
    const [exportGroups, setExportGroups] = useState<CardGroup[]>([]);

    // Handle data changes from RetrospectiveBoard for export
    const handleDataChange = (cards: Card[], groups: CardGroup[]) => {
        setExportCards(cards);
        setExportGroups(groups);
    };

    // Auto-join when user is ready and hasn't joined yet
    useEffect(() => {
        const autoJoinRetrospective = async () => {
            if (!isReady || !id || !uid || !fullName || hasJoined || isJoining) {
                return;
            }

            // Prevent multiple simultaneous join attempts
            if (joinAttemptRef.current) {
                return;
            }

            // Check if already joined (from localStorage)
            const savedParticipantId = localStorage.getItem(`participant_${id}_${uid}`);
            if (savedParticipantId) {
                setCurrentParticipantId(savedParticipantId);
                setHasJoined(true);
                return;
            }

            // Auto-join
            try {
                joinAttemptRef.current = true;
                setIsJoining(true);

                const result = await addParticipant({
                    name: fullName,
                    userId: uid,
                    retrospectiveId: id
                });

                // Only increment participant count if it's a new participant
                if (result.isNew) {
                    await incrementParticipantCount(id);
                }

                setCurrentParticipantId(result.id);
                setHasJoined(true);
                localStorage.setItem(`participant_${id}_${uid}`, result.id);

                // Only show welcome message for new participants
                if (result.isNew) {
                    toast.success(`¡Bienvenido a la retrospectiva, ${fullName}!`);
                } else {
                    toast.success(`¡Bienvenido de nuevo, ${fullName}!`);
                }
            } catch (error) {
                console.error('Error joining retrospective:', error);
                toast.error('Error al unirse a la retrospectiva');
            } finally {
                setIsJoining(false);
                joinAttemptRef.current = false;
            }
        };

        autoJoinRetrospective();
    }, [isReady, id, uid, fullName, hasJoined, isJoining]); // Removed addParticipant

    // Handle leaving retrospective
    const handleLeaveRetrospective = async () => {
        if (currentParticipantId && id && uid) {
            try {
                await setInactive(currentParticipantId);
                await decrementParticipantCount(id);

                setHasJoined(false);
                setCurrentParticipantId(null);
                localStorage.removeItem(`participant_${id}_${uid}`);

                toast.success('Has salido de la retrospectiva');
                navigate('/dashboard');
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
            const url = `${window.location.origin}/retro/${id}`;
            navigator.clipboard.writeText(url);
            toast.success('Enlace copiado al portapapeles');
        }
    };

    // Check if participant exists on component mount
    useEffect(() => {
        if (id && uid) {
            const savedParticipantId = localStorage.getItem(`participant_${id}_${uid}`);
            if (savedParticipantId) {
                setCurrentParticipantId(savedParticipantId);
                setHasJoined(true);
            }
        }
    }, [id, uid]);

    // Loading state
    if (retroLoading || !isReady) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center">
                <Loading />
            </div>
        );
    }

    // Error state
    if (retroError || !retrospective) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">
                        Retrospectiva no encontrada
                    </h2>
                    <p className="text-gray-600 mb-6">
                        No se pudo encontrar la retrospectiva solicitada.
                    </p>
                    <Button onClick={() => navigate('/dashboard')}>
                        Volver al Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    // Joining state
    if (isJoining) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 flex items-center justify-center">
                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-xl shadow-lg p-8 max-w-md text-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
                        Uniéndose a la retrospectiva...
                    </h2>
                    <p className="text-slate-600 dark:text-slate-300">
                        Espera un momento mientras te conectamos.
                    </p>
                </div>
            </div>
        );
    }

    // Main retrospective view
    if (hasJoined) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
                {/* Sticky Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="sticky top-16 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50 shadow-md transition-all duration-200"
                >
                    <div className="container mx-auto px-4 py-3">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate('/dashboard')}
                                    className="flex items-center gap-2 flex-shrink-0"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span className="hidden sm:inline">Volver</span>
                                </Button>
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="min-w-0">
                                        <h1 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-slate-100 truncate">
                                            {retrospective.title}
                                        </h1>
                                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 truncate">
                                            Conectado como: {fullName}
                                        </p>
                                    </div>
                                    {/* Lista de participantes al lado del título */}
                                    <div className="hidden md:block ml-4 flex-shrink-0">
                                        <ResponsiveParticipantDisplay
                                            participants={participants || []}
                                            className="flex items-center"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Countdown Timer - visible to all */}
                            <div className="flex items-center flex-shrink-0">
                                <CountdownTimer retrospectiveId={retrospective.id} />
                            </div>

                            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                {/* Botón de exportación */}
                                <div className="hidden lg:block">
                                    <ExportButtonGroup
                                        retrospective={retrospective}
                                        cards={exportCards}
                                        groups={exportGroups}
                                        participants={participants || []}
                                        className="flex items-center gap-2"
                                    />
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCopyId}
                                    className="hidden sm:flex items-center gap-2"
                                >
                                    <Copy className="w-4 h-4" />
                                    <span className="hidden lg:inline">Copiar ID</span>
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleShare}
                                    className="hidden sm:flex items-center gap-2"
                                >
                                    <Share2 className="w-4 h-4" />
                                    <span className="hidden lg:inline">Compartir</span>
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleLeaveRetrospective}
                                    className="flex items-center gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span className="hidden sm:inline">Salir</span>
                                </Button>

                                {/* Menú de facilitador - a la derecha del botón de salir */}
                                <FacilitatorMenu
                                    retrospectiveId={retrospective.id}
                                    facilitatorId={uid || ''}
                                    isOwner={retrospective.createdBy === uid}
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Main Content Area */}
                <div className="container mx-auto px-4 pt-6 pb-6">
                    {/* Main Board */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <RetrospectiveBoard
                            retrospective={retrospective}
                            currentUser={fullName}
                            onDataChange={handleDataChange}
                        />
                    </motion.div>
                </div>
            </div>
        );
    }

    // This should not happen with auto-join, but keeping as fallback
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 flex items-center justify-center">
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-xl shadow-lg p-8 max-w-md text-center">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
                    Error de conexión
                </h2>
                <p className="text-slate-600 dark:text-slate-300 mb-6">
                    No se pudo conectar a la retrospectiva. Inténtalo de nuevo.
                </p>
                <Button onClick={() => window.location.reload()}>
                    Reintentar
                </Button>
            </div>
        </div>
    );
};

const RetrospectivePage: React.FC = () => {
    return (
        <AuthWrapper requireAuth={true}>
            <RetrospectivePageContent />
        </AuthWrapper>
    );
};

export default RetrospectivePage;