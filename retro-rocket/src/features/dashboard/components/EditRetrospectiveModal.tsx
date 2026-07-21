import React, { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Modal from '@/lib/components/ui/Modal';
import Input from '@/lib/components/ui/Input';
import Button from '@/lib/components/ui/Button';
import { updateRetrospective } from '@/features/boards/retrospective/services/retrospectiveService';
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

    useEffect(() => {
        if (isOpen) {
            setTitle(board.title);
            setTitleError('');
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
            const updates = { title: trimmedTitle };
            await updateRetrospective(board.id, updates);
            onBoardUpdated(board.id, updates);
            toast.success(t('dashboard.boardCard.editSuccess'));
            onClose();
        } catch (error: any) {
            console.error('Error updating retrospective:', error);
            toast.error(error?.message || t('dashboard.boardCard.editError'));
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
                    label={t('dashboard.boardCard.titleLabel')}
                    value={title}
                    onChange={handleTitleChange}
                    placeholder={t('dashboard.boardCard.titlePlaceholder')}
                    error={titleError}
                    disabled={isSaving}
                    autoFocus
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
