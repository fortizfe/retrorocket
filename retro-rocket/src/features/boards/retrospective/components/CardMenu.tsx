import React, { useState } from 'react';
import { FloatingPortal, FloatingFocusManager } from '@floating-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, Target } from 'lucide-react';
import { Card } from '@/features/boards/types/card';
import { Participant } from '@/features/boards/types/participant';
import DatePicker from '@/lib/components/ui/DatePicker';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useBoardMenuOverlay } from '@/features/boards/retrospective/hooks/useBoardMenuOverlay';

interface CardMenuProps {
    card: Card;
    participants: Participant[];
    canConvertToAction: boolean; // Solo el facilitador puede convertir
    onConvertToAction: (cardId: string, assignedTo?: string, assignedToName?: string, dueDate?: Date | null) => void;
    className?: string;
}

/**
 * The card's convert-to-action-item control, rebuilt on the shared
 * `useBoardMenuOverlay` (feature 033, tasks.md T013/T049) — the fourth and
 * final of the board's four menus this hook consolidates. Previously
 * hand-rolled `getBoundingClientRect` positioning, `mousedown` outside-click,
 * and its own Escape-key listener; all now provided by the shared hook.
 * `placement: 'right'` matches the original "prefer the right side of the
 * card, vertically centered" behavior, with `flip`/`shift` handling the
 * near-viewport-edge fallback the original hand-rolled math also attempted.
 *
 * The floating panel below is a positioning wrapper (Floating UI's `ref`/
 * `style`, whose `transform` encodes the anchor offset) wrapping a nested
 * `motion.div`, not a single animated node — Framer Motion's own `animate`/
 * `exit` write their own `transform` (from `scale`) onto whatever node they're
 * applied to, which would silently overwrite Floating UI's positioning
 * transform and pin the panel to the viewport's top-left corner (feature 039,
 * research.md §1 — the same collision feature 034 already fixed in
 * `RetrospectiveTopbar.tsx`'s options menu and `FacilitatorMenu.tsx`).
 */
const CardMenu: React.FC<CardMenuProps> = ({
    card,
    participants,
    canConvertToAction,
    onConvertToAction,
    className = ''
}) => {
    const { t } = useLanguage();
    const [selectedAssignee, setSelectedAssignee] = useState('');
    const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(null);

    const { open, setOpen, context, refs, floatingStyles, getReferenceProps, getFloatingProps } = useBoardMenuOverlay({
        placement: 'right',
    });

    const handleConvert = () => {
        const selectedParticipant = participants.find(p => p.userId === selectedAssignee);
        onConvertToAction(
            card.id,
            selectedAssignee || undefined,
            selectedParticipant?.name || undefined,
            selectedDueDate
        );
        setOpen(false);
        setSelectedAssignee('');
        setSelectedDueDate(null);
    };

    if (!canConvertToAction) {
        return null;
    }

    return (
        <>
            <button
                ref={refs.setReference}
                {...getReferenceProps()}
                className={`p-1 rounded hover:bg-surface
                   text-text-muted hover:text-warning-fg
                   transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${className}`}
                title={t('retrospective.cards.convertToAction')}
                aria-label={t('retrospective.cards.convertToAction')}
            >
                <MoreVertical className="w-4 h-4" />
            </button>

            <FloatingPortal>
                <AnimatePresence>
                    {open && (
                        <FloatingFocusManager context={context} modal={false}>
                            <div
                                ref={refs.setFloating}
                                style={floatingStyles}
                                {...getFloatingProps()}
                                aria-label={t('retrospective.cards.convertToActionTitle')}
                                className="z-[9999]"
                            >
                                <motion.div
                                    // Full `transform` strings, not the `scale` shorthand —
                                    // shorthands run on the main thread via rAF and drop frames
                                    // under load (feature 036 T039; same fix already applied in
                                    // ColorPicker.tsx).
                                    initial={{ opacity: 0, transform: 'scale(0.95)' }}
                                    animate={{ opacity: 1, transform: 'scale(1)' }}
                                    exit={{ opacity: 0, transform: 'scale(0.95)' }}
                                    transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                                    style={{ transformOrigin: floatingStyles.transformOrigin }}
                                    className="bg-surface-raised/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border-default/40 min-w-[280px] max-h-[90vh] overflow-visible"
                                >
                                    <div className="p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Target className="w-5 h-5 text-warning-fg" />
                                            <h4 className="font-medium text-text-primary">
                                                {t('retrospective.cards.convertToActionTitle')}
                                            </h4>
                                        </div>

                                        <div className="mb-4">
                                            <label htmlFor={`assign-${card.id}`} className="block text-sm font-medium text-text-secondary mb-2">
                                                {t('retrospective.cards.assignResponsible')}
                                            </label>
                                            <select
                                                id={`assign-${card.id}`}
                                                value={selectedAssignee}
                                                onChange={(e) => setSelectedAssignee(e.target.value)}
                                                title={t('retrospective.cards.selectResponsible')}
                                                className="w-full p-2 text-sm border border-border-default
                           rounded bg-surface
                           text-text-primary
                           focus:ring-2 focus:ring-focus focus:border-transparent"
                                            >
                                                <option value="">{t('retrospective.cards.unassigned')}</option>
                                                {participants.map((participant) => (
                                                    <option key={participant.id} value={participant.userId}>
                                                        {participant.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="mb-4">
                                            <DatePicker
                                                label={t('retrospective.cards.dueDate')}
                                                value={selectedDueDate}
                                                onChange={setSelectedDueDate}
                                                placeholder={t('retrospective.cards.dueDatePlaceholder')}
                                                minDate={new Date()}
                                                className="text-sm"
                                                zIndex={99999}
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleConvert}
                                                className="flex-1 bg-action hover:bg-action-hover text-text-inverse text-sm font-medium
                           py-2 px-3 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-focus"
                                            >
                                                {t('retrospective.cards.convert')}
                                            </button>
                                            <button
                                                onClick={() => setOpen(false)}
                                                className="px-3 py-2 text-sm text-text-secondary
                           hover:bg-surface rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-focus"
                                            >
                                                {t('common.cancel')}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </FloatingFocusManager>
                    )}
                </AnimatePresence>
            </FloatingPortal>
        </>
    );
};

export default CardMenu;
