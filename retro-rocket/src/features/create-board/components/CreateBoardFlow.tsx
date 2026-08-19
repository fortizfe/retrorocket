import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/lib/contexts/useUserContext';
import BoardTemplateSelector from '@/features/create-board/components/BoardTemplateSelector';
import { createBoard } from '@/features/dashboard/services/backendBoardsClient';
import { useTeamsQuery } from '@/features/teams/hooks/useTeamsQuery';
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
    // 055-retro-team-association, T011: the facilitator's teams, used to populate the
    // optional team picker below. The hook (054-team-management, unmodified) fetches
    // "my teams" on mount; when it returns 0 teams the picker is omitted entirely
    // rather than shown disabled (spec.md FR-012).
    const { teams } = useTeamsQuery();

    const [currentStep, setCurrentStep] = useState<Step>('template');
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('default');
    const [boardTitle, setBoardTitle] = useState('');
    // Defaulted off per spec.md User Story 1 / FR-002 ("not anonymous" by default).
    const [isAnonymous, setIsAnonymous] = useState(false);
    // Defaulted to null (no team) per spec.md FR-012 — associating a board with a
    // team is always optional, never forced.
    const [teamId, setTeamId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const boardTitleInputRef = useRef<HTMLInputElement>(null);

    // Focus the title input when the "details" step mounts, in response to the
    // explicit "Next" click, not via the autoFocus prop (jsx-a11y/no-autofocus).
    useEffect(() => {
        if (currentStep === 'details') {
            boardTitleInputRef.current?.focus();
        }
    }, [currentStep]);

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

            // The backend creates the board, its columns, and the creator's participant
            // record atomically (research.md §5a) — no separate addParticipant/
            // incrementParticipantCount round-trip is needed anymore. The board detail
            // page's own auto-join fallback (RetrospectivePage.tsx, out of scope for this
            // feature) idempotently resolves the participant id on first visit if the
            // localStorage cache isn't pre-populated here.
            const { boardId } = await createBoard({
                templateId: selectedTemplate,
                title: boardTitle.trim(),
                locale: i18n.language as 'es' | 'en',
                isAnonymous,
                teamId
            });

            toast.success(t('success.created'));

            // Reset form
            setBoardTitle('');
            setSelectedTemplate('default');
            setIsAnonymous(false);
            setTeamId(null);
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
            setIsAnonymous(false);
            setTeamId(null);
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
                                        ref={boardTitleInputRef}
                                        id="boardTitle"
                                        type="text"
                                        value={boardTitle}
                                        onChange={(e) => setBoardTitle(e.target.value)}
                                        placeholder={t('dashboard.placeholder_boardTitle')}
                                        required
                                        className="w-full"
                                        disabled={isCreating}
                                    />
                                </div>

                                {/* 055-retro-team-association, T011/FR-012: omitted entirely (not
                                    disabled) when the facilitator belongs to 0 teams, so the control
                                    never forces a team-related decision on someone with no teams. */}
                                {teams.length > 0 && (
                                    <div>
                                        <label
                                            htmlFor="boardTeam"
                                            className="block text-sm font-medium text-text-secondary mb-2"
                                        >
                                            {t('createBoard.team.label')}
                                        </label>
                                        <select
                                            id="boardTeam"
                                            value={teamId ?? ''}
                                            onChange={(e) => setTeamId(e.target.value || null)}
                                            disabled={isCreating}
                                            className="block w-full rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-sm text-text-primary transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
                                        >
                                            <option value="">{t('createBoard.team.noTeam')}</option>
                                            {teams.map((team) => (
                                                <option key={team.id} value={team.id}>
                                                    {team.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <label
                                    htmlFor="boardIsAnonymous"
                                    className="flex items-start gap-3 rounded-lg border border-border-default p-3 cursor-pointer"
                                >
                                    <input
                                        id="boardIsAnonymous"
                                        type="checkbox"
                                        checked={isAnonymous}
                                        onChange={(e) => setIsAnonymous(e.target.checked)}
                                        disabled={isCreating}
                                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-strong accent-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                                    />
                                    <span className="flex flex-col text-sm font-medium text-text-primary">
                                        {t('createBoard.anonymous.label')}
                                        <span className="block text-xs font-normal text-text-secondary mt-0.5">
                                            {t('createBoard.anonymous.description')}
                                        </span>
                                    </span>
                                </label>
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
                                className="flex items-center gap-2"
                            >
                                {t('createBoard.next')}
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={handleCreate}
                                disabled={!boardTitle.trim() || isCreating}
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
