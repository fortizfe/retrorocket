import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, Target } from 'lucide-react';
import { Card } from '../../types/card';
import { Participant } from '../../types/participant';
import { useLanguage } from '../../hooks/useLanguage';

interface CardMenuProps {
    card: Card;
    participants: Participant[];
    canConvertToAction: boolean; // Solo el facilitador puede convertir
    onConvertToAction: (cardContent: string, assignedTo?: string, assignedToName?: string) => void;
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
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

    // Calculate menu position
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            const menuHeight = 200; // Approximate menu height
            const menuWidth = 280;

            let top = rect.bottom + 4;
            let left = rect.left;

            // Adjust if menu would go off-screen
            if (top + menuHeight > viewportHeight) {
                top = rect.top - menuHeight - 4;
            }

            if (left + menuWidth > viewportWidth) {
                left = viewportWidth - menuWidth - 16;
            }

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
            selectedParticipant?.name || undefined
        );
        setIsOpen(false);
        setSelectedAssignee('');
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
                    className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 
                       min-w-[280px] overflow-hidden"
                >
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            <h4 className="font-medium text-slate-900 dark:text-slate-100">
                                Convertir en elemento de acción
                            </h4>
                        </div>

                        <div className="mb-4">
                            <label htmlFor={`assign-${card.id}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Asignar responsable (opcional)
                            </label>
                            <select
                                id={`assign-${card.id}`}
                                value={selectedAssignee}
                                onChange={(e) => setSelectedAssignee(e.target.value)}
                                title={t('retrospective.cards.selectResponsible')}
                                className="w-full p-2 text-sm border border-slate-200 dark:border-slate-600 
                           rounded bg-white dark:bg-slate-800 
                           text-slate-900 dark:text-slate-100
                           focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            >
                                <option value="">{t('retrospective.cards.unassigned')}</option>
                                {participants.map((participant) => (
                                    <option key={participant.id} value={participant.userId}>
                                        {participant.name}
                                    </option>
                                ))}
                            </select>
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
                                className="px-3 py-2 text-sm text-slate-600 dark:text-slate-400 
                           hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
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
                className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 
                   text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400
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
