import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users } from 'lucide-react';
import ParticipantList from './ParticipantList';
import { Participant } from '../../types/participant';

interface ParticipantPopoverProps {
    participants: Participant[];
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
}

const ParticipantPopover: React.FC<ParticipantPopoverProps> = ({
    participants,
    isOpen,
    onClose,
    children,
    position = 'bottom',
    className = ''
}) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const [popoverPosition, setPopoverPosition] = useState(position);
    const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event: Event) => {
            const target = event.target as Node;
            if (
                popoverRef.current &&
                !popoverRef.current.contains(target) &&
                triggerRef.current &&
                !triggerRef.current.contains(target)
            ) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    // Auto-adjust position based on viewport and update on scroll
    useEffect(() => {
        const updatePosition = () => {
            if (isOpen && triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                setTriggerRect(rect);
                const popoverHeight = 320; // Estimated height
                const viewportHeight = window.innerHeight;

                // Check if there's enough space below
                if (rect.bottom + popoverHeight > viewportHeight && rect.top > popoverHeight) {
                    setPopoverPosition('top');
                } else {
                    setPopoverPosition('bottom');
                }
            }
        };

        if (isOpen) {
            updatePosition();

            // Add scroll listeners to keep popover positioned correctly
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    const getPositionStyles = (): React.CSSProperties => {
        if (!triggerRect) return {};

        const left = triggerRect.left + triggerRect.width / 2;

        switch (popoverPosition) {
            case 'top':
                return {
                    top: triggerRect.top - 8,
                    left: left,
                    transform: 'translateX(-50%) translateY(-100%)'
                };
            case 'left':
                return {
                    top: triggerRect.top + triggerRect.height / 2,
                    left: triggerRect.left - 8,
                    transform: 'translateX(-100%) translateY(-50%)'
                };
            case 'right':
                return {
                    top: triggerRect.top + triggerRect.height / 2,
                    left: triggerRect.right + 8,
                    transform: 'translateY(-50%)'
                };
            case 'bottom':
            default:
                return {
                    top: triggerRect.bottom + 8,
                    left: left,
                    transform: 'translateX(-50%)'
                };
        }
    };

    const getArrowClasses = () => {
        switch (popoverPosition) {
            case 'top':
                return 'top-full left-1/2 transform -translate-x-1/2 border-t-white dark:border-t-slate-800 border-l-transparent border-r-transparent border-b-transparent';
            case 'left':
                return 'left-full top-1/2 transform -translate-y-1/2 border-l-white dark:border-l-slate-800 border-t-transparent border-b-transparent border-r-transparent';
            case 'right':
                return 'right-full top-1/2 transform -translate-y-1/2 border-r-white dark:border-r-slate-800 border-t-transparent border-b-transparent border-l-transparent';
            case 'bottom':
            default:
                return 'bottom-full left-1/2 transform -translate-x-1/2 border-b-white dark:border-b-slate-800 border-l-transparent border-r-transparent border-t-transparent';
        }
    };

    return (
        <div className={`relative ${className}`}>
            {/* Trigger */}
            <div ref={triggerRef}>
                {children}
            </div>

            {/* Popover */}
            {isOpen && createPortal(
                <AnimatePresence>
                    <div
                        className="fixed z-[99999]"
                        style={triggerRect ? getPositionStyles() : {}}
                    >
                        {/* Arrow */}
                        <div
                            className={`absolute w-0 h-0 border-4 ${getArrowClasses()}`}
                        />

                        {/* Popover Content */}
                        <motion.div
                            ref={popoverRef}
                            initial={{ opacity: 0, scale: 0.95, y: popoverPosition === 'top' ? 10 : -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: popoverPosition === 'top' ? 10 : -10 }}
                            transition={{ duration: 0.15 }}
                            className="w-80 max-w-[90vw] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                                        Participantes
                                    </h3>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                    title="Cerrar"
                                    aria-label="Cerrar lista de participantes"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <ParticipantList
                                    participants={participants}
                                    maxHeight="max-h-60"
                                />
                            </div>
                        </motion.div>
                    </div>
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default ParticipantPopover;
