import React, { useRef, useState } from 'react';
import { FloatingPortal, FloatingFocusManager } from '@floating-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { CardColor } from '@/features/boards/types/card';
import { getAvailableColors, getColorConfig, resolveCardColor } from '@/lib/utils/cardColors';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useBoardMenuOverlay } from '@/features/boards/retrospective/hooks/useBoardMenuOverlay';

interface ColorPickerProps {
    selectedColor: CardColor;
    onColorChange: (color: CardColor) => void;
    disabled?: boolean;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

/**
 * "Swatch Strip + Detail" — the Apple HIG-inspired redesign selected by the
 * product owner from three explored directions (spec 037, data-model.md's
 * Visual Direction table). Built on `useBoardMenuOverlay`, the same
 * anchored-popover foundation the board's other menus (options, facilitator,
 * `CardMenu`) already use, replacing the previous hand-rolled
 * `getBoundingClientRect`/`mousedown`+`Escape`-listener/raw `createPortal`
 * implementation.
 *
 * The floating panel is split into two layered elements — an outer plain
 * `<div>` carrying Floating UI's `floatingStyles` (position only) and an
 * inner `<motion.div>` carrying only the enter/exit animation — because
 * putting both on one node lets Framer Motion's own resolved `transform`
 * silently overwrite Floating UI's positioning `translate()` (confirmed
 * empirically while building this feature's visual-direction prototypes;
 * same regression class as the feature-034 fix `useBoardMenuOverlay.ts`
 * already documents). Do not collapse them back into one element.
 */
const ColorPicker: React.FC<ColorPickerProps> = ({
    selectedColor,
    onColorChange,
    disabled = false,
    showLabel = false,
    size = 'md'
}) => {
    const { t } = useLanguage();
    const [previewColor, setPreviewColor] = useState<CardColor | null>(null);
    const swatchRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const { open, setOpen, context, refs, floatingStyles, getReferenceProps, getFloatingProps } =
        useBoardMenuOverlay({ placement: 'bottom-start', offsetPx: 12, role: 'dialog', disabled });

    const colors = getAvailableColors();
    const resolvedSelected = resolveCardColor(selectedColor);
    const selectedConfig = getColorConfig(resolvedSelected);
    const detailConfig = getColorConfig(previewColor ?? resolvedSelected);

    const sizeConfig = {
        sm: { trigger: 'h-6 pl-0.5 pr-1.5 gap-1', swatch: 'w-5 h-5', chevron: 10, swatchStrip: 'w-8 h-8' },
        md: { trigger: 'h-7 pl-1 pr-2 gap-1.5', swatch: 'w-5 h-5', chevron: 12, swatchStrip: 'w-9 h-9' },
        lg: { trigger: 'h-8 pl-1 pr-2.5 gap-1.5', swatch: 'w-6 h-6', chevron: 14, swatchStrip: 'w-10 h-10' },
    } as const;
    const config = sizeConfig[size];

    const handleSelect = (color: CardColor) => {
        onColorChange(color);
        setOpen(false);
    };

    // Roving arrow-key navigation across the swatch strip (FR-007).
    const handleStripKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const currentIndex = swatchRefs.current.findIndex((el) => el === document.activeElement);
        if (currentIndex === -1) return;
        let nextIndex: number | null = null;
        if (event.key === 'ArrowRight') nextIndex = Math.min(currentIndex + 1, colors.length - 1);
        if (event.key === 'ArrowLeft') nextIndex = Math.max(currentIndex - 1, 0);
        if (nextIndex !== null) {
            event.preventDefault();
            swatchRefs.current[nextIndex]?.focus();
        }
    };

    return (
        <div className="relative inline-block">
            {/* whileHover/whileTap (not a CSS `hover:scale-*` utility) so Framer
                Motion owns this element's `transform` — a CSS scale utility
                here would fight Framer Motion the same way it fought Floating
                UI's positioning transform on the panel (this file's top-level
                comment); matches EmojiReactions.tsx's existing trigger, per
                the `animate` skill decision for this always-visible touch
                trigger (spec 037, research.md §6). */}
            <motion.button
                ref={refs.setReference}
                {...getReferenceProps()}
                type="button"
                disabled={disabled}
                whileHover={disabled ? undefined : { scale: 1.05 }}
                whileTap={disabled ? undefined : { scale: 0.95 }}
                aria-label={`${t(selectedConfig.ariaLabelKey)}`}
                title={t(selectedConfig.nameKey)}
                className={`
          ${config.trigger}
          rounded-full flex items-center border
          transition-[border-color] duration-150
          focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1
          bg-surface-raised
          ${open ? 'border-text-primary' : 'border-border-default'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
            >
                <span className={`${config.swatch} rounded-full ${selectedConfig.preview} border border-border-default shrink-0`} />
                <ChevronDown size={config.chevron} className="text-text-muted shrink-0" />
            </motion.button>

            {showLabel && (
                <span className="block text-xs text-text-secondary mt-1 text-center">
                    {t(selectedConfig.nameKey)}
                </span>
            )}

            <FloatingPortal>
                <AnimatePresence>
                    {open && (
                        <FloatingFocusManager context={context} modal={false}>
                            {/* Positioning wrapper (Floating UI's transform, plus the
                                `role="dialog"`/`aria-label` from getFloatingProps + this
                                aria-label) and the animated surface (Framer Motion's
                                transform) are deliberately separate elements — see this
                                file's top-level comment. Matches FacilitatorMenu.tsx's
                                established pattern: the role/label live on the
                                positioning div, never duplicated onto the nested
                                motion.div (that produced a real `aria-required-children`
                                axe violation — role="dialog" nested inside the
                                positioning div's own ARIA role — caught live while
                                building this feature's e2e coverage). */}
                            <div
                                ref={refs.setFloating}
                                style={floatingStyles}
                                {...getFloatingProps()}
                                aria-label={t('retrospective.card.colorPicker.panelLabel')}
                                className="z-[9999]"
                            >
                                <motion.div
                                    // Full `transform` strings, not the `scale`/`y` shorthands —
                                    // shorthands run on the main thread via rAF and drop frames
                                    // under load (STANDARDS.md Performance; same fix already
                                    // applied to the sheet/dropdowns in feature 036, T039).
                                    initial={{ opacity: 0, transform: 'scale(0.94) translateY(-4px)' }}
                                    animate={{ opacity: 1, transform: 'scale(1) translateY(0px)' }}
                                    exit={{ opacity: 0, transform: 'scale(0.94) translateY(-4px)' }}
                                    transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                                    style={{ transformOrigin: floatingStyles.transformOrigin }}
                                    className="bg-surface-raised/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-border-default/30 w-[264px] overflow-hidden"
                                    onMouseLeave={() => setPreviewColor(null)}
                                    onKeyDown={handleStripKeyDown}
                                >
                                    <div className="p-3 flex gap-2 overflow-x-auto">
                                        {colors.map((color, index) => {
                                            const swatchConfig = getColorConfig(color);
                                            const isSelected = color === resolvedSelected;
                                            return (
                                                <button
                                                    key={color}
                                                    ref={(el) => { swatchRefs.current[index] = el; }}
                                                    type="button"
                                                    onMouseEnter={() => setPreviewColor(color)}
                                                    onFocus={() => setPreviewColor(color)}
                                                    onClick={() => handleSelect(color)}
                                                    aria-label={t(swatchConfig.ariaLabelKey)}
                                                    title={t(swatchConfig.nameKey)}
                                                    tabIndex={index === 0 ? 0 : -1}
                                                    className={`
                            relative shrink-0 ${config.swatchStrip} rounded-full ${swatchConfig.preview}
                            border-2 transition-[transform,box-shadow,border-color] duration-150
                            hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1
                            ${isSelected ? 'border-text-primary scale-110' : 'border-border-default/60 hover:border-border-strong'}
                          `}
                                                >
                                                    {isSelected && (
                                                        <Check className="absolute inset-0 m-auto w-4 h-4 text-text-primary drop-shadow-sm" strokeWidth={3} />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="border-t border-border-default/40 px-4 py-2.5 flex items-center justify-between gap-2">
                                        <span className="text-sm font-medium text-text-primary">{t(detailConfig.nameKey)}</span>
                                        <span className="text-[11px] text-text-muted truncate max-w-[130px]">{t(detailConfig.tooltipKey)}</span>
                                    </div>
                                </motion.div>
                            </div>
                        </FloatingFocusManager>
                    )}
                </AnimatePresence>
            </FloatingPortal>
        </div>
    );
};

export default ColorPicker;
