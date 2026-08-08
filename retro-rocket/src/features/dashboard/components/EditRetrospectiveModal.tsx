import React, { useState, useEffect, useRef } from 'react';
import { Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Modal from '@/lib/components/ui/Modal';
import Input from '@/lib/components/ui/Input';
import Button from '@/lib/components/ui/Button';
import { renameBoard } from '@/features/dashboard/services/backendBoardsClient';
import toast from 'react-hot-toast';

interface Board {
    id: string;
    title: string;
}

interface EditRetrospectiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    board: Board;
    onBoardUpdated: (boardId: string, updates: { title: string }) => void;
}

const EditRetrospectiveModal: React.FC<EditRetrospectiveModalProps> = ({
    isOpen,
    onClose,
    board,
    onBoardUpdated,
}) => {
    const { t } = useTranslation();
    const [title, setTitle] = useState(board.title);
    const [titleError, setTitleError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const titleInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTitle(board.title);
            setTitleError('');
            // Focus the title input on open, not via the autoFocus prop
            // (jsx-a11y/no-autofocus) — the modal only mounts its content when open.
            titleInputRef.current?.focus();
        }
    }, [isOpen, board]);

    const handleSave = async () => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            setTitleError(t('dashboard.boardCard.titleRequired'));
            return;
        }

        setIsSaving(true);
        try {
            await renameBoard(board.id, trimmedTitle);
            onBoardUpdated(board.id, { title: trimmedTitle });
            toast.success(t('dashboard.boardCard.editSuccess'));
            onClose();
        } catch (error: unknown) {
            console.error('Error updating retrospective:', error);
            const message = error instanceof Error ? error.message : undefined;
            toast.error(message || t('dashboard.boardCard.editError'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
        if (titleError) setTitleError('');
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('dashboard.boardCard.editBoard')}
            description={t('dashboard.boardCard.editBoardDescription')}
            icon={Pencil}
            maxWidth="md"
        >
            <div className="p-6 space-y-4">
                <Input
                    ref={titleInputRef}
                    label={t('dashboard.boardCard.titleLabel')}
                    value={title}
                    onChange={handleTitleChange}
                    placeholder={t('dashboard.boardCard.titlePlaceholder')}
                    error={titleError}
                    disabled={isSaving}
                />
                <div className="flex gap-2 justify-end pt-2">
                    <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleSave} loading={isSaving}>
                        {isSaving ? t('dashboard.boardCard.saving') : t('common.save')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default EditRetrospectiveModal;
