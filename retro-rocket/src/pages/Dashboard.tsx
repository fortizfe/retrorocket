import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutGrid } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { userService } from '../services/userService';
import { useRetrospective } from '../hooks/useRetrospective';
import { addParticipant } from '../services/participantService';
import { incrementParticipantCount } from '../services/retrospectiveService';
import AuthWrapper from '../components/auth/AuthWrapper';
import BoardCard from '../components/dashboard/BoardCard';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';

interface Board {
    id: string;
    title: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
    participantCount: number;
    isActive: boolean;
    createdBy: string;
}

const DashboardPage: React.FC = () => {
    const { user, userProfile } = useUser();
    const [boards, setBoards] = useState<Board[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newBoardTitle, setNewBoardTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const navigate = useNavigate();
    const { createRetrospective } = useRetrospective();

    useEffect(() => {
        loadUserBoards();
    }, [user]);

    const loadUserBoards = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const userBoards = await userService.getUserBoards(user.uid);
            setBoards(userBoards);
        } catch (error) {
            console.error('Error loading user boards:', error);
            toast.error('Error al cargar los tableros');
        } finally {
            setLoading(false);
        }
    };

    const createBoardAndNavigate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newBoardTitle.trim() || !user || !userProfile) {
            return;
        }

        try {
            setIsCreating(true);

            // Create the retrospective
            const boardId = await createRetrospective({
                title: newBoardTitle.trim(),
                createdBy: user.uid,
                createdByName: userProfile.displayName,
            });

            if (boardId) {
                // Add the creator as a participant automatically
                try {
                    const result = await addParticipant({
                        name: userProfile.displayName,
                        userId: userProfile.uid,
                        retrospectiveId: boardId
                    });

                    // Only increment if it's a new participant (should always be true for new boards)
                    if (result.isNew) {
                        await incrementParticipantCount(boardId);
                    }

                    // Mark as already joined in localStorage to prevent auto-join on navigation
                    localStorage.setItem(`participant_${boardId}_${userProfile.uid}`, result.id);
                } catch (participantError) {
                    console.warn('Error adding creator as participant:', participantError);
                    // Don't fail the creation for this, just log it
                }

                toast.success('Tablero creado exitosamente');
                setNewBoardTitle('');
                setShowCreateForm(false);

                // Navigate directly to the new board
                navigate(`/retro/${boardId}`);
            }
        } catch (error) {
            console.error('Error creating board:', error);
            toast.error('Error al crear el tablero');
        } finally {
            setIsCreating(false);
        }
    };

    const handleBoardDeleted = (boardId: string) => {
        setBoards(prev => prev.filter(board => board.id !== boardId));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando tus tableros...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                                <LayoutGrid className="w-8 h-8 text-purple-600" />
                                Mis Tableros
                            </h1>
                            <p className="text-gray-600 mt-2">
                                Gestiona y accede a todas tus retrospectivas
                            </p>
                        </div>
                        <Button
                            onClick={() => setShowCreateForm(true)}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium px-6 py-3 flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Nuevo Tablero
                        </Button>
                    </div>
                </motion.div>

                {/* Create Form Modal */}
                {showCreateForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowCreateForm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-xl p-6 w-full max-w-md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-bold text-gray-800 mb-4">
                                Crear Nuevo Tablero
                            </h3>
                            <form onSubmit={createBoardAndNavigate} className="space-y-4">
                                <div>
                                    <label htmlFor="boardTitle" className="block text-sm font-medium text-gray-700 mb-2">
                                        Título del tablero
                                    </label>
                                    <Input
                                        id="boardTitle"
                                        type="text"
                                        value={newBoardTitle}
                                        onChange={(e) => setNewBoardTitle(e.target.value)}
                                        placeholder="Retrospectiva Sprint 12"
                                        required
                                        className="w-full"
                                        autoFocus
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => setShowCreateForm(false)}
                                        className="flex-1"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={!newBoardTitle.trim() || isCreating}
                                        className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                                    >
                                        {isCreating ? 'Creando...' : 'Crear'}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}

                {/* Boards Grid */}
                {boards.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16"
                    >
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <LayoutGrid className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                            No tienes tableros aún
                        </h3>
                        <p className="text-gray-500 mb-6">
                            Crea tu primer tablero de retrospectiva para comenzar
                        </p>
                        <Button
                            onClick={() => setShowCreateForm(true)}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium px-6 py-3 flex items-center gap-2 mx-auto"
                        >
                            <Plus className="w-5 h-5" />
                            Crear mi primer tablero
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {boards.map((board, index) => (
                            <motion.div
                                key={board.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <BoardCard
                                    board={{
                                        ...board,
                                        createdBy: board.createdBy ?? user?.uid ?? ''
                                    }}
                                    currentUserId={user?.uid ?? ''}
                                    onBoardDeleted={handleBoardDeleted}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
};

const Dashboard: React.FC = () => {
    return (
        <AuthWrapper requireAuth={true}>
            <DashboardPage />
        </AuthWrapper>
    );
};

export default Dashboard;
