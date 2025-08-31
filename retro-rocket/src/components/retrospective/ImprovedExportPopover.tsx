import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Download,
    FileText,
    File,
    CheckCircle,
    AlertCircle,
    Loader2,
    Shield,
    Info
} from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { useTeamMood } from '../../hooks/useTeamMood';
import { Retrospective } from '../../types/retrospective';
import { Card, CardGroup } from '../../types/card';
import { ActionItem } from '../../types/actionItem';
import { FacilitatorNote } from '../../types/facilitatorNotes';
import { ExportFormat } from '../../types/export';
import { useUnifiedExport } from '../../hooks/useUnifiedExport';
import { useFacilitatorNotes } from '../../hooks/useFacilitatorNotes';
import { useAuth } from '../../hooks/useAuth';
import { useExportOptions } from '../../hooks/useExportOptions';
import Button from '../ui/Button';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface ImprovedExportPopoverProps {
    children?: React.ReactNode;
    retrospective: Retrospective;
    cards: Card[];
    groups: CardGroup[];
    participants: Array<{ name: string; joinedAt: Date }>;
    facilitatorNotes?: FacilitatorNote[];
    actionItems?: ActionItem[];
    isOpen: boolean;
    onClose: () => void;
    className?: string;
    // New sentiment analysis data
    sentimentAnalysis?: any;
}

const ImprovedExportPopover: React.FC<ImprovedExportPopoverProps> = ({
    children,
    retrospective,
    cards,
    groups,
    participants,
    facilitatorNotes: propFacilitatorNotes,
    actionItems = [],
    isOpen,
    onClose,
    className = '',
    sentimentAnalysis
}) => {
    const { isExporting, progress, error, success, exportRetrospective } = useUnifiedExport();
    const { user } = useAuth();
    const { notes: facilitatorNotes } = useFacilitatorNotes(retrospective.id, user?.uid || '');
    const { t } = useLanguage();

    // Lock body scroll while improved popover is open
    useBodyScrollLock(isOpen);
    // Get team mood analysis if sentiment data is available
    const sentimentResults = sentimentAnalysis?.results || new Map();
    const columnConfigs = {
        'helped': { title: 'Qué nos ayudó' },
        'hindered': { title: 'Qué nos obstaculizó' },
        'improve': { title: 'Qué podemos mejorar' },
        'actions': { title: 'Acciones' }
    };

    const { report: teamMoodData } = useTeamMood({
        cards,
        sentimentResults,
        columnConfigs
    });

    // Verificar si el usuario es facilitador/propietario del tablero
    const isFacilitator = user?.uid === retrospective.createdBy;

    // Use the new export options hook
    const {
        exportOptions,
        updateFormat,
        updateDocumentConfig,
        updateBasicOptions,
        updateFacilitatorOptions,
        unifiedOptions
    } = useExportOptions({ retrospective, isFacilitator });

    const popoverRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement | null>(null);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (event: Event) => {
            const target = event.target as Node;
            // Close if click is outside popover and (if present) outside trigger
            if (
                popoverRef.current &&
                !popoverRef.current.contains(target) &&
                !triggerRef.current?.contains(target)
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

    // Focus popover for accessibility when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => popoverRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Auto-adjust position based on viewport
    useEffect(() => {
        // Removed positioning logic as we now use fixed centered modal
    }, [isOpen]);

    const handleExport = async () => {
        // Extract sentiment data from the analysis object
        const sentimentResults = sentimentAnalysis?.results;

        // Use the real team mood data instead of dummy data
        const teamMoodReport = teamMoodData || undefined;

        const exportData = {
            retrospective,
            cards,
            groups,
            participants,
            facilitatorNotes,
            actionItems,
            // Include sentiment analysis data if available
            sentimentResults,
            teamMoodReport
        };

        await exportRetrospective(exportData, unifiedOptions);
        if (success) {
            onClose();
        }
    };

    const formatIcons = {
        pdf: FileText,
        txt: File,
        docx: FileText
    };

    return (
        <div className={`relative ${className}`}>
            {/* Trigger (optional) */}
            {children && (
                <div ref={triggerRef}>
                    {children}
                </div>
            )}

            {/* Popover rendered in a portal so it shows above other portals/stacking contexts */}
            {isOpen && createPortal(
                <AnimatePresence>
                    <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-20 px-4">
                        {/* Backdrop */}
                        <button
                            className="fixed inset-0 bg-black/10 cursor-default"
                            onClick={onClose}
                            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
                            aria-label={t('common.close')}
                            tabIndex={-1}
                        />

                        {/* Popover Content */}
                        <motion.div
                            ref={popoverRef}
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="relative w-96 max-w-[95vw] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-[80vh] overflow-y-auto"
                        >
                            {/* Arrow/pointer */}
                            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white dark:border-b-slate-800"></div>
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <h3 className="font-semibold text-slate-900 dark:text-slate-100" id="export-dialog-title">
                                            {t('retrospective.export.title')}
                                        </h3>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                        {t('retrospective.export.improvedDescription')}
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                    title={t('common.close')}
                                    aria-label={t('common.close')}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4 space-y-6">
                                {/* Format Selection */}
                                <div>
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">
                                        {t('retrospective.export.format')}
                                    </h4>
                                    <div className="grid grid-cols-3 gap-3">
                                        {(['pdf', 'txt', 'docx'] as ExportFormat[]).map((format) => {
                                            const Icon = formatIcons[format];
                                            const descriptions = {
                                                pdf: t('formats.pdf.description'),
                                                txt: t('formats.txt.description'),
                                                docx: t('formats.docx.description')
                                            };
                                            return (
                                                <button
                                                    key={format}
                                                    onClick={() => updateFormat(format)}
                                                    className={`flex flex-col items-start gap-2 p-3 rounded-lg border transition-colors text-left ${exportOptions.format === format
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
                                        {t('retrospective.export.documentConfig')}
                                    </h4>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                {t('retrospective.export.customTitle')}
                                            </label>
                                            <input
                                                type="text"
                                                value={exportOptions.documentConfig.customTitle}
                                                onChange={(e) => updateDocumentConfig({ customTitle: e.target.value })}
                                                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                                                placeholder={retrospective.title}
                                            />
                                        </div>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={exportOptions.documentConfig.includeRetroRocketLogo}
                                                onChange={(e) => updateDocumentConfig({ includeRetroRocketLogo: e.target.checked })}
                                                className="rounded border-slate-300 dark:border-slate-600"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                                {t('retrospective.export.includeLogo')}
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* Información sobre contenido siempre incluido */}
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                    <div className="flex items-start gap-2">
                                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                                        <div>
                                            <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                                                {t('retrospective.export.alwaysIncluded.title')}
                                            </h5>
                                            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                                                <li>• {t('retrospective.export.alwaysIncluded.participants')}</li>
                                                <li>• {t('retrospective.export.alwaysIncluded.cardAuthors')}</li>
                                                <li>• {t('retrospective.export.alwaysIncluded.reactions')}</li>
                                                <li>• {t('retrospective.export.alwaysIncluded.groupDetails')}</li>
                                                <li>• {t('retrospective.export.alwaysIncluded.currentOrder')}</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Contenido opcional básico */}
                                <div>
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">
                                        {t('retrospective.export.optionalContent')}
                                    </h4>
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={exportOptions.basicOptions.includeActionItems}
                                                onChange={(e) => updateBasicOptions({ includeActionItems: e.target.checked })}
                                                className="rounded border-slate-300 dark:border-slate-600"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                                {t('retrospective.export.actionItems')}
                                            </span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={exportOptions.basicOptions.includeStatistics}
                                                onChange={(e) => updateBasicOptions({ includeStatistics: e.target.checked })}
                                                className="rounded border-slate-300 dark:border-slate-600"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                                {t('retrospective.export.statistics')}
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                {/* Zona exclusiva del facilitador */}
                                {isFacilitator && (
                                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                            <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100">
                                                {t('retrospective.export.facilitatorZone.title')}
                                            </h4>
                                        </div>
                                        <p className="text-xs text-amber-800 dark:text-amber-200 mb-3">
                                            {t('retrospective.export.facilitatorZone.description')}
                                        </p>
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={exportOptions.facilitatorOptions.includeFacilitatorNotes}
                                                    onChange={(e) => updateFacilitatorOptions({ includeFacilitatorNotes: e.target.checked })}
                                                    className="rounded border-amber-300 dark:border-amber-600"
                                                />
                                                <span className="text-sm text-amber-900 dark:text-amber-100">
                                                    {t('retrospective.export.facilitatorZone.notes')}
                                                </span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={exportOptions.facilitatorOptions.includeSentimentBadges}
                                                    onChange={(e) => updateFacilitatorOptions({ includeSentimentBadges: e.target.checked })}
                                                    className="rounded border-amber-300 dark:border-amber-600"
                                                />
                                                <span className="text-sm text-amber-900 dark:text-amber-100">
                                                    {t('retrospective.export.facilitatorZone.sentimentBadges')}
                                                </span>
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={exportOptions.facilitatorOptions.includeTeamMoodAnalysis}
                                                    onChange={(e) => updateFacilitatorOptions({ includeTeamMoodAnalysis: e.target.checked })}
                                                    className="rounded border-amber-300 dark:border-amber-600"
                                                />
                                                <span className="text-sm text-amber-900 dark:text-amber-100">
                                                    {t('retrospective.export.facilitatorZone.teamMoodAnalysis')}
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <Button
                                        variant="outline"
                                        onClick={onClose}
                                        className="flex-1"
                                        disabled={isExporting}
                                    >
                                        {t('retrospective.export.cancel')}
                                    </Button>
                                    <Button
                                        onClick={handleExport}
                                        disabled={isExporting}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700"
                                    >
                                        {isExporting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                {progress ? `${Math.round(progress)}%` : t('retrospective.export.exporting')}
                                            </>
                                        ) : (
                                            <>
                                                <Download className="w-4 h-4 mr-2" />
                                                {t('retrospective.export.export', { format: exportOptions.format.toUpperCase() })}
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {/* Status Messages */}
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                                    >
                                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                        <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                                    </motion.div>
                                )}

                                {success && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                                    >
                                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                        <span className="text-sm text-green-700 dark:text-green-300">
                                            {t('retrospective.export.success')}
                                        </span>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </AnimatePresence>
                , document.body)
            }
        </div>
    );
};

export default ImprovedExportPopover;
