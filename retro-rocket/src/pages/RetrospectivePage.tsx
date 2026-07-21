import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Copy, Share2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/lib/components/ui/Button';
import Loading from '@/lib/components/ui/Loading';
import RetrospectiveBoard from '@/features/boards/retrospective/components/RetrospectiveBoard';
import ExportButtonGroup from '@/features/boards/export/components/ExportButtonGroup';
import { ResponsiveParticipantDisplay } from '@/features/boards/participants/components/index';
import { CountdownTimer, FacilitatorMenu } from '@/features/boards/countdown/components/index';
import AuthWrapper from '@/features/auth/components/AuthWrapper';
import { useRetrospective } from '@/features/boards/retrospective/hooks/useRetrospective';
import { useParticipants } from '@/features/boards/participants/hooks/useParticipants';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { OptimizedRetrospectiveService } from '@/lib/services/OptimizedRetrospectiveService';
import { Card, CardGroup } from '@/features/boards/types/card';
// ...existing code...

const RetrospectivePageContent: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null);
    const [hasJoined, setHasJoined] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const joinAttemptRef = useRef(false);

    const { retrospective, loading: retroLoading, error: retroError } = useRetrospective(id);
    const { addParticipant, participants } = useParticipants(id);
    const { uid, fullName, isReady } = useCurrentUser();

    // State for export data

    const [exportCards, setExportCards] = useState<Card[]>([]);
    const [exportGroups, setExportGroups] = useState<CardGroup[]>([]);


    // Note: Sentiment analysis is now handled entirely within RetrospectiveBoard
    // to avoid double initialization and model loading

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
                    await OptimizedRetrospectiveService.incrementParticipantCount(id);
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

    // Handle leaving retrospective - simplified to just navigation
    const handleLeaveRetrospective = async () => {
        // Simply navigate back to dashboard
        // Users remain part of the retrospective permanently once joined
        toast.success('Volviendo al dashboard');
        navigate('/dashboard');
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
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">
                        Retrospectiva no encontrada
                    </h2>
                    <p className="text-slate-600 dark:text-slate-300 mb-6">
                        No se pudo encontrar la retrospectiva solicitada.
                    </p>
                    <Button onClick={() => navigate('/dashboard')}>
                        {t('retrospectivePage.backToDashboard')}
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
                {/* Header moved to top-level Header to keep a single unified sticky bar */}
                <div className="pt-4" />

                {/* Main Content Area */}
                <div className="container mx-auto px-2 pt-6 pb-6">
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
                            participants={participants || []}
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