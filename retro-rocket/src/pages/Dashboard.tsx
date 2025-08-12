import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutGrid, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../contexts/UserContext';
import { userService } from '../services/userService';
import AuthWrapper from '../components/auth/AuthWrapper';
import BoardCard from '../components/dashboard/BoardCard';
import JoinRetrospectiveModal from '../components/dashboard/JoinRetrospectiveModal';
import CreateBoardFlow from '../components/create-board/CreateBoardFlow';
import Button from '../components/ui/Button';
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
    isCreator?: boolean;
}

const DashboardPage: React.FC = () => {
    const { user } = useUser();
    const { t } = useTranslation();
    const [boards, setBoards] = useState<Board[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateFlow, setShowCreateFlow] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const navigate = useNavigate();

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

    const handleBoardCreated = (boardId: string) => {
        // Refresh boards list
        loadUserBoards();
        // Navigate to the new board
        navigate(`/retro/${boardId}`);
    };

    const handleBoardDeleted = (boardId: string) => {
        setBoards(prev => prev.filter(board => board.id !== boardId));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 flex items-center justify-center transition-colors duration-300">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-300">Cargando tus tableros...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                                <LayoutGrid className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                                {t('dashboard.title')}
                            </h1>
                            <p className="text-slate-600 dark:text-slate-300 mt-2">
                                {t('dashboard.subtitle')}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                onClick={() => setShowJoinModal(true)}
                                variant="outline"
                                className="border-primary-300 text-primary-700 hover:bg-primary-50 dark:border-primary-600 dark:text-primary-300 dark:hover:bg-primary-900/20 font-medium px-6 py-3 flex items-center gap-2"
                            >
                                <Users className="w-5 h-5" />
                                {t('dashboard.joinRetro')}
                            </Button>
                            <Button
                                onClick={() => setShowCreateFlow(true)}
                                className="bg-gradient-to-r from-primary-500 to-blue-600 hover:from-primary-600 hover:to-blue-700 dark:from-primary-600 dark:to-blue-600 dark:hover:from-primary-700 dark:hover:to-blue-700 text-white font-medium px-6 py-3 flex items-center gap-2 shadow-soft"
                            >
                                <Plus className="w-5 h-5" />
                                {t('dashboard.newBoard')}
                            </Button>
                        </div>
                    </div>
                </motion.div>

                {/* Create Board Flow */}
                <CreateBoardFlow
                    isOpen={showCreateFlow}
                    onClose={() => setShowCreateFlow(false)}
                    onSuccess={handleBoardCreated}
                />

                {/* Join Retrospective Modal */}
                <JoinRetrospectiveModal
                    isOpen={showJoinModal}
                    onClose={() => setShowJoinModal(false)}
                />

                {/* Boards Grid */}
                {boards.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16"
                    >
                        <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <LayoutGrid className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                            {t('dashboard.noBoards')}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">
                            {t('dashboard.createFirst')}
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button
                                onClick={() => setShowJoinModal(true)}
                                variant="outline"
                                className="border-primary-300 text-primary-700 hover:bg-primary-50 dark:border-primary-600 dark:text-primary-300 dark:hover:bg-primary-900/20 font-medium px-6 py-3 flex items-center gap-2"
                            >
                                <Users className="w-5 h-5" />
                                {t('dashboard.joinRetro')}
                            </Button>
                            <Button
                                onClick={() => setShowCreateFlow(true)}
                                className="bg-gradient-to-r from-primary-500 to-blue-600 hover:from-primary-600 hover:to-blue-700 text-white font-medium px-6 py-3 flex items-center gap-2 shadow-soft"
                            >
                                <Plus className="w-5 h-5" />
                                {t('dashboard.createFirst_button')}
                            </Button>
                        </div>
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
