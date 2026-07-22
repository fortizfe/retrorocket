import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, Target } from 'lucide-react';
import { Card } from '@/features/boards/types/card';
import { Participant } from '@/features/boards/types/participant';
import DatePicker from '@/lib/components/ui/DatePicker';
import { useLanguage } from '@/lib/hooks/useLanguage';

interface CardMenuProps {
    card: Card;
    participants: Participant[];
    canConvertToAction: boolean; // Solo el facilitador puede convertir
    onConvertToAction: (cardContent: string, assignedTo?: string, assignedToName?: string, dueDate?: Date | null) => void;
    className?: string;
}

const CardMenu: React.FC<CardMenuProps> = ({
    card,
    participants,
    canConvertToAction,
    onConvertToAction,
    className = ''
}) => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedAssignee, setSelectedAssignee] = useState('');
    const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

    // Calculate menu position: prefer the right side of the card and vertically center it
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            const menuHeight = 380; // space for date picker
            const menuWidth = 280;

            // Prefer to position to the right of the card/button
            let left = rect.right + 8;

            // Compute vertical center relative to the card/button
            let top = rect.top + (rect.height / 2) - (menuHeight / 2);

            // If there's not enough space on the right, place to the left
            if (left + menuWidth > viewportWidth - 8) {
                left = rect.left - menuWidth - 8;
            }

            // Clamp left to viewport
            if (left < 8) left = 8;
            if (left + menuWidth > viewportWidth - 8) left = Math.max(8, viewportWidth - menuWidth - 8);

            // Clamp top so the menu is visible
            if (top < 8) top = 8;
            if (top + menuHeight > viewportHeight - 8) top = Math.max(8, viewportHeight - menuHeight - 8);

            setMenuPosition({ top, left });
        }
    }, [isOpen]);

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                isOpen &&
                menuRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const handleConvert = () => {
        const selectedParticipant = participants.find(p => p.userId === selectedAssignee);
        onConvertToAction(
            card.content,
            selectedAssignee || undefined,
            selectedParticipant?.name || undefined,
            selectedDueDate
        );
        setIsOpen(false);
        setSelectedAssignee('');
        setSelectedDueDate(null);
    };

    if (!canConvertToAction) {
        return null;
    }

    const menuContent = (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    ref={menuRef}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    style={{
                        position: 'fixed',
                        top: menuPosition.top,
                        left: menuPosition.left,
                        zIndex: 9999,
                    }}
                    className="bg-surface-raised rounded-lg shadow-lg border border-border-default 
                       min-w-[280px] max-h-[90vh] overflow-visible"
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
                           rounded bg-surface-raised 
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
                                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium 
                           py-2 px-3 rounded transition-colors"
                            >
                                {t('retrospective.cards.convert')}
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-3 py-2 text-sm text-text-secondary 
                           hover:bg-surface-raised rounded transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`p-1 rounded hover:bg-surface-raised 
                   text-text-muted hover:text-warning-fg
                   transition-colors ${className}`}
                title={t('retrospective.cards.convertToAction')}
            >
                <MoreVertical className="w-4 h-4" />
            </button>

            {typeof document !== 'undefined' && createPortal(menuContent, document.body)}
        </>
    );
};

export default CardMenu;
