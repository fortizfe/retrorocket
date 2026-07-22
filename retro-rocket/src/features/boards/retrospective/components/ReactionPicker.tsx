import React, { useState } from 'react';
import { FloatingPortal, FloatingFocusManager, type UseFloatingReturn } from '@floating-ui/react';
import { EmojiReaction } from '@/features/boards/types/card';
import { EMOJI_CATEGORIES } from '@/lib/utils/emojiConstants';
import { useLanguage } from '@/lib/hooks/useLanguage';

type EmojiCategory = keyof typeof EMOJI_CATEGORIES;

const CATEGORY_KEYS = Object.keys(EMOJI_CATEGORIES) as EmojiCategory[];

interface ReactionPickerProps {
    context: UseFloatingReturn['context'];
    setFloating: (node: HTMLElement | null) => void;
    floatingStyles: React.CSSProperties;
    getFloatingProps: (props?: Record<string, unknown>) => Record<string, unknown>;
    userReaction?: string | null;
    onSelect: (emoji: EmojiReaction) => void;
    disabled?: boolean;
}

/**
 * The anchored emoji-selection panel. Rendered in a `FloatingPortal` so it escapes
 * card overflow/stacking contexts, positioned by Floating UI via `floatingStyles`.
 * `FloatingFocusManager` provides keyboard operability and focus return
 * (Principle VIII). Colors are semantic tokens; all copy is localized.
 */
const ReactionPicker: React.FC<ReactionPickerProps> = ({
    context,
    setFloating,
    floatingStyles,
    getFloatingProps,
    userReaction,
    onSelect,
    disabled = false,
}) => {
    const { t } = useLanguage();
    const [activeCategory, setActiveCategory] = useState<EmojiCategory>(CATEGORY_KEYS[0]);

    return (
        <FloatingPortal>
            <FloatingFocusManager context={context} modal={false}>
                <div
                    ref={setFloating}
                    style={floatingStyles}
                    {...getFloatingProps()}
                    className="z-[9999] w-80 max-w-[calc(100vw-1rem)] flex flex-col bg-surface-raised border border-border-default rounded-xl shadow-2xl overflow-hidden"
                    aria-label={t('retrospective.emojiReactions.picker.ariaLabel')}
                >
                    {/* Category tabs */}
                    <div className="border-b border-border-default p-2 shrink-0">
                        <div className="flex flex-wrap gap-1">
                            {CATEGORY_KEYS.map((category) => (
                                <button
                                    key={category}
                                    type="button"
                                    onClick={() => setActiveCategory(category)}
                                    aria-pressed={activeCategory === category}
                                    className={`px-2 py-1 text-xs rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${activeCategory === category
                                        ? 'bg-info-bg text-info-fg font-semibold'
                                        : 'hover:bg-surface text-text-secondary'
                                        }`}
                                >
                                    {t(`retrospective.emojiReactions.categories.${category}`, category)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Emoji grid (scrolls within the height cap set by the `size` middleware) */}
                    <div className="p-2 flex-1 min-h-0 overflow-y-auto">
                        <div className="grid grid-cols-8 gap-1">
                            {EMOJI_CATEGORIES[activeCategory].map((emoji, index) => {
                                const isSelected = userReaction === emoji;
                                return (
                                    <button
                                        key={`${emoji}-${index}`}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => onSelect(emoji)}
                                        aria-pressed={isSelected}
                                        title={t('retrospective.emojiReactions.reactions.reactWith', { emoji })}
                                        aria-label={`${t('retrospective.emojiReactions.reactions.reactWith', { emoji })}${isSelected ? t('retrospective.emojiReactions.reactions.selected') : ''}`}
                                        className={`w-8 h-8 flex items-center justify-center text-lg rounded transition-all duration-200 hover:bg-surface hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus ${isSelected ? 'bg-info-bg ring-2 ring-info-fg scale-110' : ''}`}
                                    >
                                        {emoji}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Hint */}
                    <div className="border-t border-border-default p-2 text-center shrink-0">
                        <p className="text-xs text-text-muted">
                            {t('retrospective.emojiReactions.picker.hint')}
                        </p>
                    </div>
                </div>
            </FloatingFocusManager>
        </FloatingPortal>
    );
};

export default ReactionPicker;
