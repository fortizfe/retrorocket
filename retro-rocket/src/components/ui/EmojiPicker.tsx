import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile } from 'lucide-react';
import Button from './Button';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { EMOJI_CATEGORIES } from '../../utils/emojiConstants';

interface EmojiPickerProps {
    onEmojiSelect: (emoji: string) => void;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({
    onEmojiSelect,
    className = '',
    size = 'md',
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState('Emociones');
    const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
    const pickerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Usar el hook para bloquear scroll cuando el picker esté abierto
    const { restoreScroll } = useBodyScrollLock(isOpen);

    // Cerrar el picker cuando se hace clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);

            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                restoreScroll();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, restoreScroll]);

    // Calcular la posición del picker
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const pickerWidth = 320; // 80 * 4 = 320px (w-80)
            const pickerHeight = 384; // max-h-96 = 384px
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Calcular posición horizontal
            let left = buttonRect.right - pickerWidth; // Alinear a la derecha del botón
            if (left < 10) { // Margen mínimo desde el borde izquierdo
                left = 10;
            }
            if (left + pickerWidth > viewportWidth - 10) { // Margen mínimo desde el borde derecho
                left = viewportWidth - pickerWidth - 10;
            }

            // Calcular posición vertical
            let top = buttonRect.top - pickerHeight - 8; // Por encima del botón
            if (top < 10) { // Si no cabe arriba, mostrar abajo
                top = buttonRect.bottom + 8;
                if (top + pickerHeight > viewportHeight - 10) { // Si tampoco cabe abajo
                    top = Math.max(10, viewportHeight - pickerHeight - 10); // Centrar verticalmente
                }
            }

            setPickerPosition({ top, left });
        }
    }, [isOpen]);

    const handleToggle = () => {
        const newState = !isOpen;
        setIsOpen(newState);

        // Si se está cerrando el picker, restaurar scroll explícitamente
        if (!newState) {
            restoreScroll();
        }
    };

    const handleEmojiClick = (emoji: string) => {
        onEmojiSelect(emoji);
        setIsOpen(false);
        restoreScroll();
    };

    const sizes = {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-10 h-10'
    };

    const buttonSizes = {
        sm: 'sm' as const,
        md: 'sm' as const,
        lg: 'md' as const
    };

    return (
        <>
            {/* Trigger Button */}
            <Button
                ref={buttonRef}
                size={buttonSizes[size]}
                variant="ghost"
                onClick={handleToggle}
                disabled={disabled}
                className={`p-1 hover:bg-slate-100 dark:hover:bg-slate-700 ${className}`}
                aria-label="Seleccionar emoji"
            >
                <Smile className={sizes[size]} />
            </Button>

            {/* Emoji Picker Portal */}
            {isOpen && createPortal(
                <AnimatePresence>
                    <motion.div
                        ref={pickerRef}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="fixed z-[9999] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl w-72 sm:w-80 max-h-96 overflow-hidden"
                        style={{
                            top: pickerPosition.top,
                            left: pickerPosition.left
                        }}
                    >
                        {/* Header with categories */}
                        <div className="border-b border-slate-200 dark:border-slate-700 p-2">
                            <div className="flex flex-wrap gap-1">
                                {Object.keys(EMOJI_CATEGORIES).map((category) => (
                                    <button
                                        key={category}
                                        onClick={() => setActiveCategory(category)}
                                        className={`px-2 py-1 text-xs rounded transition-colors ${activeCategory === category
                                            ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                                            : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                                            }`}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Emoji Grid */}
                        <div className="p-2 max-h-64 overflow-y-auto">
                            <div className="grid grid-cols-8 gap-1">
                                {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, index) => (
                                    <button
                                        key={`${emoji}-${index}`}
                                        onClick={() => handleEmojiClick(emoji)}
                                        className="w-8 h-8 flex items-center justify-center text-lg hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                                        title={emoji}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-slate-200 dark:border-slate-700 p-2 text-center">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Haz clic en un emoji para añadirlo a tu tarjeta
                            </p>
                        </div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}; export default EmojiPicker;
