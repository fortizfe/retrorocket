import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

export interface BottomSheetProps {
    open: boolean;
    onClose: () => void;
    /** Used both as the visible header text and the dialog's accessible name. */
    title: string;
    /** Tailwind max-height utility for the sheet's content area. */
    heightClass?: string;
    children: React.ReactNode;
}

/**
 * The board's mobile entry-point pattern for menus that don't fit a compact
 * popover on a narrow screen (feature 036, Direction B "Adaptive Sheet",
 * FR-013a) — a solid panel that slides up from the bottom edge with a
 * drag-handle affordance, a dimmed backdrop, and an always-visible close
 * button (not swipe-only, so it stays keyboard- and switch-control-operable
 * per `contracts/accessibility-interaction-contract.md`). Shared by the
 * options menu (`RetrospectiveTopbar.tsx`) and the facilitator menu
 * (`FacilitatorMenu.tsx`) rather than duplicated per menu.
 *
 * Portaled to `document.body` rather than rendered in place — `Header.tsx`
 * (which hosts both menu triggers) applies its own `backdrop-blur-md`, and
 * CSS `backdrop-filter` — like `transform`/`filter` — establishes a new
 * containing block for `position: fixed` descendants, which would silently
 * shrink an in-place sheet down to its blurred ancestor's box instead of
 * the true viewport (found live during this feature's direction review).
 * Matches `Modal.tsx`'s existing portal pattern for the same reason.
 */
const BottomSheet: React.FC<BottomSheetProps> = ({ open, onClose, title, heightClass = 'max-h-[75vh]', children }) => {
    const { t } = useLanguage();
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useBodyScrollLock(open);

    useEffect(() => {
        if (open) closeButtonRef.current?.focus();
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, onClose]);

    return createPortal(
        <AnimatePresence>
            {open && (
                // `md:hidden`: this component IS the board's mobile-only menu
                // pattern (Direction B, FR-013a) — its trigger and the desktop
                // anchored-dropdown trigger share one `open` state, so this
                // guard is what keeps the sheet from also appearing when a
                // desktop-width trigger opens that shared state.
                <div className="md:hidden fixed inset-0 z-[99999]">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/50"
                        onClick={onClose}
                        aria-hidden="true"
                        data-testid="bottom-sheet-backdrop"
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                        initial={{ transform: 'translateY(100%)' }}
                        animate={{ transform: 'translateY(0%)' }}
                        exit={{ transform: 'translateY(100%)' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className={`absolute inset-x-0 bottom-0 ${heightClass} bg-surface-raised border-t border-x border-border-default rounded-t-2xl shadow-2xl flex flex-col`}
                    >
                        <div className="flex items-center justify-center pt-2.5 pb-1 flex-shrink-0" aria-hidden="true">
                            <div className="w-10 h-1 rounded-full bg-border-strong" />
                        </div>
                        <div className="flex items-center justify-between px-5 py-3 border-b border-border-default flex-shrink-0">
                            <h2 className="text-base font-semibold text-text-primary">{title}</h2>
                            <button
                                ref={closeButtonRef}
                                onClick={onClose}
                                className="p-2 rounded-lg bg-surface hover:bg-surface-raised border border-border-default text-text-secondary hover:text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-focus"
                                aria-label={t('common.close')}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 pb-[env(safe-area-inset-bottom)]">{children}</div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default BottomSheet;
