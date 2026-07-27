import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/lib/contexts/UserContext';
import BoardTemplateSelector from '@/features/create-board/components/BoardTemplateSelector';
import { createBoardFromTemplate } from '@/features/create-board/createBoardFromTemplate';
import { addParticipant } from '@/features/boards/participants/services/participantService';
import { incrementParticipantCount } from '@/features/boards/retrospective/services/retrospectiveService';
import { TemplateId } from '@/features/create-board/boardTemplates';
import Button from '@/lib/components/ui/Button';
import Input from '@/lib/components/ui/Input';
import toast from 'react-hot-toast';

interface CreateBoardFlowProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (boardId: string) => void;
}

type Step = 'template' | 'details';

const CreateBoardFlow: React.FC<CreateBoardFlowProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const { t, i18n } = useTranslation();
    const { user, userProfile } = useUser();
    const navigate = useNavigate();

    const [currentStep, setCurrentStep] = useState<Step>('template');
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('default');
    const [boardTitle, setBoardTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleNext = () => {
        if (currentStep === 'template') {
            setCurrentStep('details');
        }
    };

    const handleBack = () => {
        if (currentStep === 'details') {
            setCurrentStep('template');
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!boardTitle.trim() || !user || !userProfile) {
            return;
        }

        try {
            setIsCreating(true);

            const { boardId } = await createBoardFromTemplate({
                templateId: selectedTemplate,
                title: boardTitle.trim(),
                createdBy: user.uid,
                createdByName: userProfile.displayName,
                locale: i18n.language as 'es' | 'en'
            });

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

            toast.success(t('success.created'));

            // Reset form
            setBoardTitle('');
            setSelectedTemplate('default');
            setCurrentStep('template');

            // Call success callback or navigate
            if (onSuccess) {
                onSuccess(boardId);
            } else {
                navigate(`/retro/${boardId}`);
            }

            onClose();

        } catch (error) {
            console.error('Error creating board:', error);
            toast.error(t('errors.generic'));
        } finally {
            setIsCreating(false);
        }
    };

    const handleClose = () => {
        if (!isCreating) {
            setBoardTitle('');
            setSelectedTemplate('default');
            setCurrentStep('template');
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="glass-strong rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-medium"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-text-primary">
                            {t('dashboard.createBoard')}
                        </h2>
                        <p className="text-sm text-text-secondary mt-1">
                            {t('createBoard.step', { current: currentStep === 'template' ? 1 : 2, total: 2 })}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isCreating}
                        className="text-slate-400 hover:text-text-secondary transition-colors p-2"
                        aria-label={t('common.close')}
                    >
                        ✕
                    </button>
                </div>

                {/* Step Content */}
                <AnimatePresence mode="wait">
                    {currentStep === 'template' ? (
                        <motion.div
                            key="template"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <BoardTemplateSelector
                                value={selectedTemplate}
                                onChange={setSelectedTemplate}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="details"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                            <div className="text-center mb-6">
                                <h3 className="text-lg font-semibold text-text-primary mb-2">
                                    {t('dashboard.newBoardTitle')}
                                </h3>
                                <p className="text-sm text-text-secondary">
                                    {t(`boardTemplates.${selectedTemplate}.name`)}
                                </p>
                            </div>

                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label
                                        htmlFor="boardTitle"
                                        className="block text-sm font-medium text-text-secondary mb-2"
                                    >
                                        {t('dashboard.newBoardTitle')} *
                                    </label>
                                    <Input
                                        id="boardTitle"
                                        type="text"
                                        value={boardTitle}
                                        onChange={(e) => setBoardTitle(e.target.value)}
                                        placeholder={t('dashboard.placeholder_boardTitle')}
                                        required
                                        className="w-full"
                                        autoFocus
                                        disabled={isCreating}
                                    />
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer Actions */}
                <div className="flex justify-between pt-6 mt-6 border-t border-border-default">
                    <div>
                        {currentStep === 'details' && (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleBack}
                                disabled={isCreating}
                                className="flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                {t('createBoard.back')}
                            </Button>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleClose}
                            disabled={isCreating}
                        >
                            {t('common.cancel')}
                        </Button>

                        {currentStep === 'template' ? (
                            <Button
                                type="button"
                                onClick={handleNext}
                                className="bg-gradient-to-r from-primary-500 to-blue-600 hover:from-primary-600 hover:to-blue-700 text-white flex items-center gap-2"
                            >
                                {t('createBoard.next')}
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={handleCreate}
                                disabled={!boardTitle.trim() || isCreating}
                                className="bg-gradient-to-r from-primary-500 to-blue-600 hover:from-primary-600 hover:to-blue-700 text-white"
                            >
                                {isCreating ? t('dashboard.creating') : t('createBoard.create')}
                            </Button>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default CreateBoardFlow;
