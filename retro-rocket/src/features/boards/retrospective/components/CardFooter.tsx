import React from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import Button from '@/lib/components/ui/Button';
import { useLanguage } from '@/lib/hooks/useLanguage';

interface CardFooterProps {
    createdAt?: Date;
    canEdit: boolean;
    isEditing: boolean;
    isDeleting: boolean;
    /** Whether the edited content is savable (non-empty). */
    canSave: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onSave: () => void;
    onCancel: () => void;
    /** Optional extra actions (e.g. convert-to-action menu). */
    actions?: React.ReactNode;
}

/**
 * Card footer: a locale-aware timestamp plus edit/delete (or save/cancel while
 * editing) actions. The date is formatted with the active i18next language rather
 * than a hardcoded locale, and all labels are localized.
 */
const CardFooter: React.FC<CardFooterProps> = ({
    createdAt,
    canEdit,
    isEditing,
    isDeleting,
    canSave,
    onEdit,
    onDelete,
    onSave,
    onCancel,
    actions,
}) => {
    const { t, currentLanguage } = useLanguage();

    const formattedDate = createdAt
        ? new Intl.DateTimeFormat(currentLanguage || undefined, {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(createdAt))
        : '';

    return (
        <div className="flex items-center justify-between">
            <div className="text-xs text-text-muted">{formattedDate}</div>
            <div className="flex items-center gap-1">
                {canEdit && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isEditing ? (
                            <>
                                <Button size="sm" variant="primary" onClick={onSave} disabled={!canSave}>
                                    {t('retrospective.card.save')}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={onCancel}>
                                    {t('retrospective.card.cancel')}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={onEdit}
                                    aria-label={t('retrospective.card.editCard')}
                                >
                                    <Edit2 size={12} />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={onDelete}
                                    loading={isDeleting}
                                    aria-label={t('retrospective.card.deleteCard')}
                                    className="text-error-fg hover:text-error-fg"
                                >
                                    <Trash2 size={12} />
                                </Button>
                            </>
                        )}
                    </div>
                )}
                {actions}
            </div>
        </div>
    );
};

export default CardFooter;
