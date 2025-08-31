import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Smile } from 'lucide-react';
import { EmojiReaction, GroupedReaction } from '../../types/card';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { EMOJI_CATEGORIES } from '../../utils/emojiConstants';
import { useLanguage } from '../../hooks/useLanguage';

interface EmojiReactionsProps {
    cardId: string;
    groupedReactions: GroupedReaction[];
    currentUserId?: string;
    userReaction?: string | null;
    onReaction?: (emoji: EmojiReaction) => void;
    onAddReaction?: (emoji: EmojiReaction) => void;
    onRemoveReaction: () => void;
    disabled?: boolean;
}

const EmojiReactions: React.FC<EmojiReactionsProps> = ({
    cardId,
    groupedReactions = [],
    currentUserId,
    userReaction: userReactionProp,
    onReaction,
    onAddReaction,
    onRemoveReaction,
    disabled = false
}) => {
    const { t } = useLanguage();
    const [showPicker, setShowPicker] = useState(false);
    const [activeCategory, setActiveCategory] = useState(t('retrospective.emojiReactions.categories.Emociones'));
    const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Usar el hook para bloquear scroll cuando el picker esté abierto
    const { restoreScroll } = useBodyScrollLock(showPicker);

    // Find current user's reaction (computed) and allow override via prop
    const computedReaction = groupedReactions.find(reaction =>
        (currentUserId ? reaction.users?.includes(currentUserId) : false)
    )?.emoji || null;

    const userReaction = typeof userReactionProp !== 'undefined' ? userReactionProp : computedReaction;

    // Calculate picker position
    const calculatePosition = () => {
        if (!triggerRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Picker dimensions (approximate) - larger for category-based picker
        const pickerWidth = 320;
        const pickerHeight = 400;

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
                restoreScroll();
            }
        };

        if (showPicker) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showPicker, restoreScroll]);

    const handleEmojiSelect = (emoji: EmojiReaction) => {
        if (userReaction === emoji) {
            onRemoveReaction();
        } else {
            // support both onReaction and legacy onAddReaction prop
            if (onAddReaction) onAddReaction(emoji);
            else if (onReaction) onReaction(emoji);
        }
        setShowPicker(false);
        restoreScroll();
    };

    // Create tooltip text for reactions
    const createReactionTooltipText = (reaction: GroupedReaction) => {
        const { emoji, count, users } = reaction;

        if (count === 0) {
            return t('retrospective.emojiReactions.reactions.tooltips.none', { emoji });
        }

        if (count === 1) {
            return t('retrospective.emojiReactions.reactions.tooltips.single', {
                user: users[0],
                emoji
            });
        } else if (count === 2) {
            return t('retrospective.emojiReactions.reactions.tooltips.double', {
                user1: users[0],
                user2: users[1],
                emoji
            });
        } else if (count <= 5) {
            const allButLast = users.slice(0, -1).join(', ');
            const last = users[users.length - 1];
            return t('retrospective.emojiReactions.reactions.tooltips.multiple', {
                users: allButLast,
                lastUser: last,
                emoji
            });
        } else {
            const first3 = users.slice(0, 3).join(', ');
            const remaining = count - 3;
            return t('retrospective.emojiReactions.reactions.tooltips.many', {
                users: first3,
                remaining,
                emoji
            });
        }
    };

    const handlePickerToggle = () => {
        if (disabled) return;
        const newState = !showPicker;
        setShowPicker(newState);

        // Si se está cerrando el picker, restaurar scroll explícitamente
        if (!newState) {
            restoreScroll();
        }
    };

    const popup = showPicker ? (
        // eslint-disable-next-line react/forbid-dom-props
        <div
            ref={pickerRef}
            className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
            // eslint-disable-next-line react/forbid-dom-props
            style={{
                top: pickerPosition.top,
                left: pickerPosition.left,
            }}
            role="dialog"
            aria-label={t('retrospective.emojiReactions.picker.ariaLabel')}
        >
            {/* Header with categories */}
            <div className="border-b border-gray-100 p-2">
                <div className="flex flex-wrap gap-1">
                    {Object.keys(EMOJI_CATEGORIES).map((category) => (
                        <button
                            key={category}
                            onClick={() => setActiveCategory(category)}
                            className={`px-2 py-1 text-xs rounded transition-colors ${activeCategory === category
                                ? 'bg-blue-100 text-blue-700'
                                : 'hover:bg-gray-100 text-gray-600'
                                }`}
                        >
                            {t(`retrospective.emojiReactions.categories.${category}`, category)}
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
                            onClick={() => handleEmojiSelect(emoji)}
                            className={`
                                w-8 h-8 flex items-center justify-center text-lg rounded transition-all duration-200
                                hover:bg-gray-100 hover:scale-110 hover:shadow-md
                                focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
                                ${userReaction === emoji
                                    ? 'bg-blue-100 ring-2 ring-blue-300 scale-110'
                                    : ''
                                }
                            `}
                            title={t('retrospective.emojiReactions.reactions.reactWith', { emoji })}
                            aria-label={`${t('retrospective.emojiReactions.reactions.reactWith', { emoji })}${userReaction === emoji ? t('retrospective.emojiReactions.reactions.selected') : ''}`}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 p-2 text-center">
                <p className="text-xs text-gray-500">
                    Haz clic en un emoji para reaccionar
                </p>
            </div>

            {/* Current reaction indicator */}
            {userReaction && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{t('retrospective.emojiReactions.reactions.yourReaction')} {userReaction}</span>
                        <button
                            onClick={() => {
                                onRemoveReaction();
                                setShowPicker(false);
                            }}
                            className="text-red-500 hover:text-red-700 underline"
                            title={t('retrospective.emojiReactions.reactions.removeReaction')}
                        >
                            {t('retrospective.emojiReactions.reactions.remove')}
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
                        title={createReactionTooltipText(reaction)}
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
                        title={t('retrospective.emojiReactions.picker.addReaction')}
                        aria-label={`${t('retrospective.emojiReactions.picker.addReactionButton')}${showPicker ? t('retrospective.emojiReactions.picker.openPicker') : ''}`}
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
