import React from 'react';
import Button from '@/lib/components/ui/Button';
import { useLanguage } from '@/lib/hooks/useLanguage';

interface CardFooterProps {
    createdAt?: Date;
    /** Owner may edit (renders Save/Cancel while editing). */
    canEdit: boolean;
    isEditing: boolean;
    /** Whether the edited content is savable (non-empty). */
    canSave: boolean;
    onSave: () => void;
    onCancel: () => void;
    /** Trailing controls: OwnerActionMenu and/or the facilitator CardMenu
     * (058-card-owner-action-hub, contracts/owner-action-menu.md §3). */
    actions?: React.ReactNode;
}

/**
 * Card footer: a locale-aware timestamp, Save/Cancel while editing, and a
 * trailing `actions` slot the caller composes (DraggableCard.tsx).
 *
 * 058-card-owner-action-hub: the footer no longer owns Edit/Delete directly
 * — those moved into `OwnerActionMenu`, reached through the `actions` slot,
 * so ownership is checked exactly once instead of being re-derived here.
 * The date is formatted with the active i18next language rather than a
 * hardcoded locale, and all labels are localized.
 */
const CardFooter: React.FC<CardFooterProps> = ({
    createdAt,
    canEdit,
    isEditing,
    canSave,
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
                {isEditing && canEdit && (
                    // Always visible — never hover-only (research.md §3, FR-012):
                    // this board is used live, often on shared screens/tablets with
                    // no hover input, so Save/Cancel must be reachable at rest.
                    <div className="flex items-center gap-1">
                        <Button size="sm" variant="primary" onClick={onSave} disabled={!canSave}>
                            {t('retrospective.card.save')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={onCancel}>
                            {t('retrospective.card.cancel')}
                        </Button>
                    </div>
                )}
                {actions}
            </div>
        </div>
    );
};

export default CardFooter;
