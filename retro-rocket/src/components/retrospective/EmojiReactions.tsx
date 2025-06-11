import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Plus } from 'lucide-react';
import { EmojiReaction, GroupedReaction } from '../../types/card';

interface EmojiReactionsProps {
    cardId: string;
    groupedReactions: GroupedReaction[];
    userReaction: EmojiReaction | null;
    onAddReaction: (emoji: EmojiReaction) => void;
    onRemoveReaction: () => void;
    disabled?: boolean;
}

const AVAILABLE_EMOJIS: EmojiReaction[] = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🤔'];

const EmojiReactions: React.FC<EmojiReactionsProps> = ({
    cardId,
    groupedReactions,
    userReaction,
    onAddReaction,
    onRemoveReaction,
    disabled = false
}) => {
    const [showPicker, setShowPicker] = useState(false);

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
                        title="Add reaction"
                    >
                        {showPicker ? <Smile size={16} /> : <Plus size={14} />}
                    </motion.button>

                    {/* Emoji picker */}
                    <AnimatePresence>
                        {showPicker && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                                className="absolute bottom-full mb-2 left-0 z-10 bg-white rounded-lg shadow-lg border border-gray-200 p-2"
                                style={{ minWidth: '200px' }}
                            >
                                <div className="grid grid-cols-4 gap-1">
                                    {AVAILABLE_EMOJIS.map((emoji) => (
                                        <motion.button
                                            key={emoji}
                                            whileHover={{ scale: 1.2 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => handleEmojiSelect(emoji)}
                                            className={`
                        p-2 rounded-md text-lg transition-all duration-200
                        hover:bg-gray-100 flex items-center justify-center
                        ${userReaction === emoji ? 'bg-blue-100 ring-2 ring-blue-300' : ''}
                      `}
                                            title={emoji}
                                        >
                                            {emoji}
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Backdrop to close picker */}
            {showPicker && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setShowPicker(false)}
                />
            )}
        </div>
    );
};

export default EmojiReactions;
