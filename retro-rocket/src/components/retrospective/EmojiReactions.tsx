import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Smile } from 'lucide-react';
import { EmojiReaction, GroupedReaction } from '../../types/card';

interface EmojiReactionsProps {
    cardId: string;
    groupedReactions: GroupedReaction[];
    userReaction: EmojiReaction | null;
    onAddReaction: (emoji: EmojiReaction) => void;
    onRemoveReaction: () => void;
    disabled?: boolean;
}

const AVAILABLE_EMOJIS: EmojiReaction[] = [
    '👍', '❤️', '😂', '😮',
    '😢', '😡', '🎉', '🤔',
    '✨', '🚀', '💡', '⚡'
];

const EmojiReactions: React.FC<EmojiReactionsProps> = ({
    cardId,
    groupedReactions,
    userReaction,
    onAddReaction,
    onRemoveReaction,
    disabled = false
}) => {
    const [showPicker, setShowPicker] = useState(false);
    const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Calculate picker position
    const calculatePosition = () => {
        if (!triggerRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Picker dimensions (approximate)
        const pickerWidth = 240;
        const pickerHeight = 140;

        let left = triggerRect.left;
        let top = triggerRect.bottom + 8;

        // Adjust horizontal position if it would overflow
        if (left + pickerWidth > viewportWidth) {
            left = triggerRect.right - pickerWidth;
        }

        // Adjust vertical position if it would overflow
        if (top + pickerHeight > viewportHeight) {
            top = triggerRect.top - pickerHeight - 8;
        }

        setPickerPosition({ top, left });
    };

    // Handle outside clicks
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                pickerRef.current &&
                triggerRef.current &&
                !pickerRef.current.contains(event.target as Node) &&
                !triggerRef.current.contains(event.target as Node)
            ) {
                setShowPicker(false);
            }
        };

        if (showPicker) {
            document.addEventListener('mousedown', handleClickOutside);
            calculatePosition();
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showPicker]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowPicker(false);
            }
        };

        if (showPicker) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showPicker]);

    const handleEmojiSelect = (emoji: EmojiReaction) => {
        if (userReaction === emoji) {
            onRemoveReaction();
        } else {
            onAddReaction(emoji);
        }
        setShowPicker(false);
    };

    const handlePickerToggle = () => {
        if (disabled) return;
        setShowPicker(!showPicker);
    };

    const popup = showPicker ? (
        // eslint-disable-next-line react/forbid-dom-props
        <div
            ref={pickerRef}
            className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-2xl p-3 animate-in fade-in-0 zoom-in-95 duration-200"
            // eslint-disable-next-line react/forbid-dom-props
            style={{
                top: pickerPosition.top,
                left: pickerPosition.left,
            }}
            role="dialog"
            aria-label="Selector de reacciones emoji"
        >
            {/* Simple emoji grid */}
            <div className="grid grid-cols-6 gap-2 max-w-[240px]">
                {AVAILABLE_EMOJIS.map((emoji) => (
                    <button
                        key={emoji}
                        onClick={() => handleEmojiSelect(emoji)}
                        className={`
                            p-2 rounded-lg text-xl transition-all duration-200
                            hover:bg-gray-100 hover:scale-110 hover:shadow-md
                            flex items-center justify-center
                            focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
                            ${userReaction === emoji
                                ? 'bg-blue-100 ring-2 ring-blue-300 scale-110'
                                : ''
                            }
                        `}
                        title={`Reaccionar con ${emoji}`}
                        aria-label={`Reaccionar con ${emoji}${userReaction === emoji ? ' (seleccionado)' : ''}`}
                    >
                        {emoji}
                    </button>
                ))}
            </div>

            {/* Current reaction indicator */}
            {userReaction && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Tu reacción: {userReaction}</span>
                        <button
                            onClick={() => {
                                onRemoveReaction();
                                setShowPicker(false);
                            }}
                            className="text-red-500 hover:text-red-700 underline"
                            title="Quitar mi reacción"
                        >
                            Quitar
                        </button>
                    </div>
                </div>
            )}
        </div>
    ) : null;

    return (
        <div className="relative">
            <div className="flex items-center gap-1 flex-wrap">
                {/* Existing reactions */}
                {groupedReactions.map((reaction) => (
                    <motion.button
                        key={reaction.emoji}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleEmojiSelect(reaction.emoji)}
                        disabled={disabled}
                        className={`
              flex items-center gap-1 px-2 py-1 rounded-full text-xs
              transition-all duration-200 min-w-[2rem] justify-center
              ${userReaction === reaction.emoji
                                ? 'bg-blue-100 border-2 border-blue-300 text-blue-700'
                                : 'bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-600'
                            }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
                        title={`${reaction.emoji} ${reaction.users.join(', ')}`}
                    >
                        <span className="text-sm">{reaction.emoji}</span>
                        <span className="font-medium">{reaction.count}</span>
                    </motion.button>
                ))}

                {/* Add reaction button */}
                <div className="relative">
                    <motion.button
                        ref={triggerRef}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handlePickerToggle}
                        disabled={disabled}
                        className={`
              flex items-center justify-center w-8 h-8 rounded-full
              transition-all duration-200
              ${showPicker
                                ? 'bg-blue-100 text-blue-600 border-2 border-blue-300'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-500 border border-gray-200'
                            }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}
            `}
                        title="Agregar reacción"
                        aria-label={`Agregar reacción emoji${showPicker ? ' (abierto)' : ''}`}
                        aria-expanded={showPicker}
                        aria-haspopup="dialog"
                    >
                        <Smile size={16} />
                    </motion.button>
                </div>
            </div>

            {/* Portal for popup to ensure it appears above everything */}
            {typeof document !== 'undefined' && createPortal(popup, document.body)}
        </div>
    );
};

export default EmojiReactions;
