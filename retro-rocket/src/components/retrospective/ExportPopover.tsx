import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Download,
    FileText,
    File,
    CheckCircle,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { Retrospective } from '../../types/retrospective';
import { Card, CardGroup } from '../../types/card';
import { UnifiedExportOptions, ExportFormat } from '../../types/export';
import { useUnifiedExport } from '../../hooks/useUnifiedExport';
import Button from '../ui/Button';

interface ExportPopoverProps {
    retrospective: Retrospective;
    cards: Card[];
    groups: CardGroup[];
    participants: Array<{ name: string; joinedAt: Date }>;
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
}

const ExportPopover: React.FC<ExportPopoverProps> = ({
    retrospective,
    cards,
    groups,
    participants,
    isOpen,
    onClose,
    children,
    position = 'bottom',
    className = ''
}) => {
    const { isExporting, progress, error, success, exportRetrospective } = useUnifiedExport();
    const popoverRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const [popoverPosition, setPopoverPosition] = useState(position);
    const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
    const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
    const [options, setOptions] = useState<UnifiedExportOptions>({
        format: 'pdf',
        documentTitle: retrospective.title,
        customTitle: retrospective.title,
        includeRetroRocketLogo: true,
        includeParticipants: true,
        includeStatistics: true,
        includeCardAuthors: true,
        includeReactions: true,
        includeGroupDetails: true,
        sortOrder: 'original',
        includeFacilitatorNotes: false,
        facilitatorNotes: ''
    });

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
                const popoverHeight = 600; // Estimated height for expanded export popover
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

    const handleExport = async () => {
        const finalOptions = { ...options, format: selectedFormat };
        const exportData = {
            retrospective,
            cards,
            groups,
            participants
        };
        await exportRetrospective(exportData, finalOptions);
        if (success) {
            onClose();
        }
    };

    const formatIcons = {
        pdf: FileText,
        txt: File
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
                            className="w-96 max-w-[95vw] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-[80vh] overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-2">
                                    <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                                        Exportar Retrospectiva
                                    </h3>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Configura las opciones para tu documento
                                </p>
                                <button
                                    onClick={onClose}
                                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                    title="Cerrar"
                                    aria-label="Cerrar opciones de exportación"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4 space-y-6">
                                {/* Format Selection */}
                                <div>
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">
                                        Formato de exportación
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(['pdf', 'txt'] as ExportFormat[]).map((format) => {
                                            const Icon = formatIcons[format];
                                            const descriptions = {
                                                pdf: 'Documento portable, ideal para imprimir y archivar',
                                                txt: 'Archivo de texto plano, simple y universal'
                                            };
                                            return (
                                                <button
                                                    key={format}
                                                    onClick={() => setSelectedFormat(format)}
                                                    className={`flex flex-col items-start gap-2 p-3 rounded-lg border transition-colors text-left ${selectedFormat === format
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Icon className="w-4 h-4" />
                                                        <span className="font-medium text-sm">
                                                            {format.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                                        {descriptions[format]}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Document Configuration */}
                                <div>
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">
                                        Configuración del documento
                                    </h4>
                                    <div className="space-y-3">
                                        <div>
                                            <div className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                Título personalizado
                                            </div>
                                            <input
                                                type="text"
                                                value={options.customTitle ?? ''}
                                                onChange={(e) => setOptions({ ...options, customTitle: e.target.value })}
                                                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                                placeholder={retrospective.title}
                                            />
                                        </div>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={options.includeRetroRocketLogo}
                                                onChange={(e) => setOptions({ ...options, includeRetroRocketLogo: e.target.checked })}
                                                className="rounded border-slate-300 dark:border-slate-600"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                                Incluir logo de RetroRocket
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* Content to Include */}
                                <div>
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">
                                        Contenido a incluir
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={options.includeParticipants}
                                                onChange={(e) => setOptions({ ...options, includeParticipants: e.target.checked })}
                                                className="rounded border-slate-300 dark:border-slate-600"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                                Lista de participantes
                                            </span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={options.includeStatistics}
                                                onChange={(e) => setOptions({ ...options, includeStatistics: e.target.checked })}
                                                className="rounded border-slate-300 dark:border-slate-600"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                                Estadísticas
                                            </span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={options.includeCardAuthors}
                                                onChange={(e) => setOptions({ ...options, includeCardAuthors: e.target.checked })}
                                                className="rounded border-slate-300 dark:border-slate-600"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                                Autores de tarjetas
                                            </span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={options.includeReactions}
                                                onChange={(e) => setOptions({ ...options, includeReactions: e.target.checked })}
                                                className="rounded border-slate-300 dark:border-slate-600"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                                Likes y reacciones
                                            </span>
                                        </label>
                                    </div>
                                    <div className="mt-2">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={options.includeGroupDetails}
                                                onChange={(e) => setOptions({ ...options, includeGroupDetails: e.target.checked })}
                                                className="rounded border-slate-300 dark:border-slate-600"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                                Detalles de agrupaciones de tarjetas
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* Card Sorting */}
                                <div>
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">
                                        Ordenamiento de tarjetas
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="sortOrder"
                                                value="original"
                                                checked={options.sortOrder === 'original'}
                                                onChange={(e) => setOptions({ ...options, sortOrder: e.target.value as any })}
                                                className="rounded-full border-slate-300 dark:border-slate-600"
                                                id="sort-original"
                                            />
                                            <label htmlFor="sort-original">
                                                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    Orden original
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                                    Mantener el orden en que fueron creadas
                                                </div>
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="sortOrder"
                                                value="alphabetical"
                                                checked={options.sortOrder === 'alphabetical'}
                                                onChange={(e) => setOptions({ ...options, sortOrder: e.target.value as any })}
                                                className="rounded-full border-slate-300 dark:border-slate-600"
                                                id="sort-alphabetical"
                                            />
                                            <label htmlFor="sort-alphabetical">
                                                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    Alfabético
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                                    Ordenar por contenido de la tarjeta
                                                </div>
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="sortOrder"
                                                value="votes"
                                                checked={options.sortOrder === 'votes'}
                                                onChange={(e) => setOptions({ ...options, sortOrder: e.target.value as any })}
                                                className="rounded-full border-slate-300 dark:border-slate-600"
                                                id="sort-votes"
                                            />
                                            <label htmlFor="sort-votes">
                                                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    Por votos
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                                    Ordenar por cantidad de votos (mayor a menor)
                                                </div>
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="sortOrder"
                                                value="likes"
                                                checked={options.sortOrder === 'likes'}
                                                onChange={(e) => setOptions({ ...options, sortOrder: e.target.value as any })}
                                                className="rounded-full border-slate-300 dark:border-slate-600"
                                                id="sort-likes"
                                            />
                                            <label htmlFor="sort-likes">
                                                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    Por likes
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                                    Ordenar por cantidad de likes (mayor a menor)
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Facilitator Notes */}
                                <div>
                                    <label className="flex items-center gap-2 mb-2">
                                        <input
                                            type="checkbox"
                                            checked={options.includeFacilitatorNotes}
                                            onChange={(e) => setOptions({ ...options, includeFacilitatorNotes: e.target.checked })}
                                            className="rounded border-slate-300 dark:border-slate-600"
                                        />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            Agregar notas del facilitador
                                        </span>
                                    </label>
                                    {options.includeFacilitatorNotes && (
                                        <textarea
                                            value={options.facilitatorNotes ?? ''}
                                            onChange={(e) => setOptions({ ...options, facilitatorNotes: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                            rows={3}
                                            placeholder="Agregar comentarios o notas adicionales..."
                                        />
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <Button
                                        variant="outline"
                                        onClick={onClose}
                                        className="flex-1"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={handleExport}
                                        disabled={isExporting}
                                        className="flex-1 bg-red-500 hover:bg-red-600 text-white border-red-500 hover:border-red-600"
                                    >
                                        {isExporting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                {progress ? `${Math.round(progress)}%` : 'Exportando...'}
                                            </>
                                        ) : (
                                            <>
                                                <Download className="w-4 h-4 mr-2" />
                                                Exportar {selectedFormat.toUpperCase()}
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {/* Status Messages */}
                                {error && (
                                    <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                        <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                                    </div>
                                )}

                                {success && (
                                    <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                        <span className="text-sm text-green-700 dark:text-green-300">¡Exportación completada!</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default ExportPopover;
