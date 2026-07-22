/**
 * @fileoverview Base Modal Component
 * @description Reusable modal component with optimal centering and responsive design
 * Follows SOLID principles:
 * - Single Responsibility: Handles modal display and positioning only
 * - Open/Closed: Extensible through composition
 * - Interface Segregation: Clear, focused props interface
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export interface ModalProps {
    /** Whether the modal is open */
    isOpen: boolean;
    /** Function to close the modal */
    onClose: () => void;
    /** Modal title */
    title?: string;
    /** Modal subtitle/description */
    description?: string;
    /** Modal content */
    children: React.ReactNode;
    /** Optional header icon */
    icon?: React.ComponentType<{ className?: string }>;
    /** Maximum width of the modal */
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    /** Whether to show close button */
    showCloseButton?: boolean;
    /** Custom className for the modal container */
    className?: string;
    /** Whether to close on backdrop click */
    closeOnBackdropClick?: boolean;
    /** Whether to close on escape key */
    closeOnEscape?: boolean;
    /** Z-index for the modal */
    zIndex?: number;
    /** Top offset to avoid fixed headers (in rem) */
    topOffset?: number;
    /** Position modal as popover below trigger element */
    popoverMode?: boolean;
    /** Reference to trigger element for popover positioning */
    triggerRef?: React.RefObject<HTMLElement>;
}

const maxWidthClasses = {
    'sm': 'sm:max-w-sm',
    'md': 'sm:max-w-md',
    'lg': 'sm:max-w-lg',
    'xl': 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl'
};

/**
 * Base Modal Component
 * Provides optimal centering, responsive design, and accessibility features
 */
const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    description,
    children,
    icon: Icon,
    maxWidth = 'lg',
    showCloseButton = true,
    className = '',
    closeOnBackdropClick = true,
    closeOnEscape = true,
    zIndex = 50,
    topOffset = 0,
    popoverMode = false,
    triggerRef
}) => {
    // Handle escape key
    useEffect(() => {
        if (!closeOnEscape || !isOpen) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose, closeOnEscape]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = 'unset';
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleBackdropClick = (event: React.MouseEvent) => {
        if (closeOnBackdropClick && event.target === event.currentTarget) {
            onClose();
        }
    };

    const getContainerClasses = () => {
        const basePadding = "p-4 sm:p-6 lg:p-8";

        if (popoverMode) {
            // En modo popover, posicionamos relativo al trigger
            return `flex items-start justify-center ${basePadding} pt-4`;
        }

        if (topOffset > 0) {
            // Añadir padding extra en el top cuando hay header fijo
            return `flex min-h-full items-start justify-center ${basePadding} pt-20`;
        }

        return `flex min-h-full items-center justify-center ${basePadding}`;
    };

    const getPopoverStyle = (): React.CSSProperties => {
        if (!popoverMode || !triggerRef?.current) {
            return {};
        }

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;

        // Calcular posición preferida debajo del trigger
        const spaceBelow = windowHeight - triggerRect.bottom;
        const spaceAbove = triggerRect.top;

        // Decidir si colocar arriba o abajo del trigger
        const placeBelow = spaceBelow > 300 || spaceBelow > spaceAbove;

        const top = placeBelow
            ? triggerRect.bottom + 8
            : triggerRect.top - 8;

        let left = triggerRect.left + (triggerRect.width / 2);

        // Ajustar si se sale del viewport
        const modalWidth = 384; // w-96 = 24rem = 384px
        if (left + modalWidth / 2 > windowWidth - 20) {
            left = windowWidth - modalWidth - 20;
        } else if (left - modalWidth / 2 < 20) {
            left = 20;
        } else {
            left = left - modalWidth / 2;
        }

        return {
            position: 'fixed' as const,
            top: `${Math.max(top, 20)}px`,
            left: `${left}px`,
            transform: 'none'
        };
    };

    return createPortal(
        <AnimatePresence>
            <div
                className={`fixed inset-0 overflow-y-auto z-${zIndex}`}
            >
                {/* Improved centering container with header offset */}
                <div className={getContainerClasses()}>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
                        onClick={handleBackdropClick}
                        aria-hidden="true"
                    />

                    {/* Modal Content */}
                    <motion.dialog
                        open={isOpen}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }}
                        className={`
                            relative w-full ${maxWidthClasses[maxWidth]}
                            bg-surface-overlay
                            rounded-xl shadow-2xl
                            transform transition-all
                            max-h-[90vh] overflow-hidden
                            ${className}
                        `}
                        aria-labelledby={title ? "modal-title" : undefined}
                        aria-describedby={description ? "modal-description" : undefined}
                    >
                        {/* Header */}
                        {(title || description || Icon || showCloseButton) && (
                            <div className="flex items-center justify-between p-6 border-b border-border-default">
                                <div className="flex items-center gap-3 min-w-0">
                                    {Icon && (
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-info-bg shrink-0">
                                            <Icon className="w-5 h-5 text-info-fg" />
                                        </div>
                                    )}
                                    {(title || description) && (
                                        <div className="min-w-0">
                                            {title && (
                                                <h3
                                                    id="modal-title"
                                                    className="text-lg font-semibold text-text-primary truncate"
                                                >
                                                    {title}
                                                </h3>
                                            )}
                                            {description && (
                                                <p
                                                    id="modal-description"
                                                    className="text-sm text-text-muted mt-1"
                                                >
                                                    {description}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {showCloseButton && (
                                    <button
                                        onClick={onClose}
                                        className="shrink-0 rounded-lg p-2 text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                                        title="Cerrar"
                                        aria-label="Cerrar modal"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Content */}
                        <div className="overflow-y-auto max-h-[calc(90vh-theme(spacing.24))]">
                            {children}
                        </div>
                    </motion.dialog>
                </div>
            </div>
        </AnimatePresence>,
        document.body
    );
};

export default Modal;
