import React from 'react';
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
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useSentiment, useTeamMood } from '@/features/boards/sentiment';
import { DynamicColumnConfig, getColumnRole } from '@/features/boards/retrospective/hooks/useRetrospectiveColumns';
import { Retrospective } from '@/features/boards/types/retrospective';
import { Card, CardGroup } from '@/features/boards/types/card';
import { ActionItem } from '@/features/boards/types/actionItem';
import { FacilitatorNote } from '@/features/boards/types/facilitatorNotes';
import { Participant } from '@/features/boards/types/participant';
import { ExportFormat } from '@/features/boards/types/export';
import { useUnifiedExport } from '@/features/boards/export/hooks/useUnifiedExport';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useExportOptions } from '@/features/boards/export/hooks/useExportOptions';
import Button from '@/lib/components/ui/Button';

// Feature 038 (FR-007a): the export job's own state/handlers, lifted by the caller
// (RetrospectiveTopbar.tsx) up to a level that outlives this component's own mount
// state — dismissing this window no longer loses an in-progress export, since the
// state that tracks it lives one level up (research.md §4). This component is now a
// pure consumer of that lifted state rather than calling `useUnifiedExport()` itself.
type LiftedExportJobProps = Pick<
    ReturnType<typeof useUnifiedExport>,
    'isExporting' | 'progress' | 'error' | 'success' | 'exportRetrospective' | 'resetState'
>;

interface ImprovedExportPopoverProps extends LiftedExportJobProps {
    retrospective: Retrospective;
    cards: Card[];
    groups: CardGroup[];
    participants: Participant[];
    facilitatorNotes?: FacilitatorNote[];
    actionItems?: ActionItem[];
    onClose: () => void;
    /**
     * Which shell this content renders inside of. `'desktop'` supplies its own
     * bordered/shadowed panel shell and header (no ancestor to inherit one
     * from — matches `FacilitatorMenuTabs.tsx`'s identical pattern).
     * `'mobile'` renders content only, with no shell or header of its own,
     * since its caller wraps it in `BottomSheet.tsx`, which already supplies
     * both (FR-002/FR-003, selected Direction C — "Two-Column Desktop").
     */
    presentation: 'desktop' | 'mobile';
    // New sentiment analysis data
    sentimentAnalysis?: ReturnType<typeof useSentiment>;
}

/**
 * The export window's content — Direction C, "Two-Column Desktop" (feature
 * 038, FR-013 exploration, selected by the product owner 2026-08-11): on
 * the desktop presentation, format selection and document configuration
 * sit in a left column, optional content and the facilitator-only zone in
 * a right column, using the width an anchored panel affords over the
 * pre-redesign narrow `w-96` dialog. The mobile presentation collapses to
 * a single stacked column. Mounting/dismissal (Escape, outside-press) is
 * no longer this component's own concern — its caller
 * (`RetrospectiveTopbar.tsx`) owns the `useBoardMenuOverlay`-anchored
 * Floating UI wrapper (desktop) or `BottomSheet` (mobile) and only mounts
 * this component while open, matching `FacilitatorMenuTabs.tsx`'s
 * established pattern for the same reason.
 */
const ImprovedExportPopover: React.FC<ImprovedExportPopoverProps> = ({
    retrospective,
    cards,
    groups,
    participants,
    facilitatorNotes = [],
    actionItems = [],
    onClose,
    presentation,
    sentimentAnalysis,
    isExporting,
    progress,
    error,
    success,
    exportRetrospective,
}) => {
    const { user } = useAuth();
    const { t } = useLanguage();

    // Get team mood analysis if sentiment data is available
    const sentimentResults = sentimentAnalysis?.results || new Map();
    const columnConfigTitles: Record<string, string> = {
        'helped': 'Qué nos ayudó',
        'hindered': 'Qué nos obstaculizó',
        'improve': 'Qué podemos mejorar',
        'actions': 'Acciones'
    };
    const columnConfigs: Record<string, DynamicColumnConfig> = Object.fromEntries(
        Object.entries(columnConfigTitles).map(([id, title]) => [
            id,
            { id, title, description: '', color: '', icon: '', role: getColumnRole(id) }
        ])
    );

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

    const handleExport = async () => {
        // Extract sentiment data from the analysis object
        const sentimentResultsForExport = sentimentAnalysis?.results
            ? new Map(sentimentAnalysis.results)
            : undefined;

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
            sentimentResults: sentimentResultsForExport,
            teamMoodReport
        };

        await exportRetrospective(exportData, unifiedOptions);
    };

    const formatIcons = {
        pdf: FileText,
        txt: File,
        docx: FileText
    };

    const formatSelection = (
        <div>
            <h4 className="text-sm font-medium text-text-secondary mb-2">
                {t('retrospective.export.format')}
            </h4>
            <div className="grid grid-cols-3 gap-2">
                {(['pdf', 'txt', 'docx'] as ExportFormat[]).map((format) => {
                    const Icon = formatIcons[format];
                    const descriptions = {
                        pdf: t('formats.pdf.description'),
                        txt: t('formats.txt.description'),
                        docx: t('formats.docx.description')
                    };
                    return (
                        <motion.button
                            key={format}
                            onClick={() => updateFormat(format)}
                            aria-pressed={exportOptions.format === format}
                            title={descriptions[format]}
                            whileTap={{ scale: 0.97 }}
                            transition={{ duration: 0.12, ease: [0.23, 1, 0.32, 1] }}
                            className={`flex flex-col items-center gap-1.5 py-2.5 rounded-lg border text-xs font-medium transition-colors ${exportOptions.format === format
                                ? 'border-info-fg bg-info-bg text-info-fg'
                                : 'border-border-default text-text-secondary hover:border-border-strong'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {format.toUpperCase()}
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );

    const documentConfig = (
        <div>
            <h4 className="text-sm font-medium text-text-secondary mb-2">
                {t('retrospective.export.documentConfig')}
            </h4>
            <label htmlFor="export-custom-title" className="block text-xs font-medium text-text-secondary mb-1">
                {t('retrospective.export.customTitle')}
            </label>
            <input
                id="export-custom-title"
                type="text"
                value={exportOptions.documentConfig.customTitle}
                onChange={(e) => updateDocumentConfig({ customTitle: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border-default rounded-lg bg-surface text-text-primary mb-2"
                placeholder={retrospective.title}
            />
            <label className="flex items-center gap-2 text-xs text-text-secondary">
                <input
                    type="checkbox"
                    checked={exportOptions.documentConfig.includeRetroRocketLogo}
                    onChange={(e) => updateDocumentConfig({ includeRetroRocketLogo: e.target.checked })}
                    className="rounded border-border-strong"
                />
                {t('retrospective.export.includeLogo')}
            </label>
        </div>
    );

    const optionalContent = (
        <div>
            <h4 className="text-sm font-medium text-text-secondary mb-2">
                {t('retrospective.export.optionalContent')}
            </h4>
            <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs text-text-secondary">
                    <input
                        type="checkbox"
                        checked={exportOptions.basicOptions.includeActionItems}
                        onChange={(e) => updateBasicOptions({ includeActionItems: e.target.checked })}
                        className="rounded border-border-strong"
                    />
                    {t('retrospective.export.actionItems')}
                </label>
                <label className="flex items-center gap-2 text-xs text-text-secondary">
                    <input
                        type="checkbox"
                        checked={exportOptions.basicOptions.includeStatistics}
                        onChange={(e) => updateBasicOptions({ includeStatistics: e.target.checked })}
                        className="rounded border-border-strong"
                    />
                    {t('retrospective.export.statistics')}
                </label>
            </div>
        </div>
    );

    const alwaysIncludedNotice = (
        <div className="flex items-start gap-2 rounded-lg border border-info-fg bg-info-bg p-2.5">
            <Info className="w-3.5 h-3.5 text-info-fg mt-0.5 shrink-0" />
            <div>
                <h5 className="text-sm font-medium text-info-fg mb-1">{t('retrospective.export.alwaysIncluded.title')}</h5>
                <ul className="text-xs text-info-fg space-y-0.5">
                    <li>• {t('retrospective.export.alwaysIncluded.participants')}</li>
                    <li>• {t('retrospective.export.alwaysIncluded.cardAuthors')}</li>
                    <li>• {t('retrospective.export.alwaysIncluded.reactions')}</li>
                    <li>• {t('retrospective.export.alwaysIncluded.groupDetails')}</li>
                    <li>• {t('retrospective.export.alwaysIncluded.currentOrder')}</li>
                </ul>
            </div>
        </div>
    );

    const facilitatorZone = isFacilitator ? (
        <div className="rounded-lg border border-warning-fg bg-warning-bg p-2.5">
            <div className="flex items-center gap-1.5 mb-1 text-warning-fg">
                <Shield className="w-3.5 h-3.5" />
                <h4 className="text-sm font-medium">{t('retrospective.export.facilitatorZone.title')}</h4>
            </div>
            <p className="text-xs text-warning-fg mb-2">{t('retrospective.export.facilitatorZone.description')}</p>
            <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs text-warning-fg">
                    <input
                        type="checkbox"
                        checked={exportOptions.facilitatorOptions.includeFacilitatorNotes}
                        onChange={(e) => updateFacilitatorOptions({ includeFacilitatorNotes: e.target.checked })}
                        className="rounded border-warning-fg"
                    />
                    {t('retrospective.export.facilitatorZone.notes')}
                </label>
                <label className="flex items-center gap-2 text-xs text-warning-fg">
                    <input
                        type="checkbox"
                        checked={exportOptions.facilitatorOptions.includeSentimentBadges}
                        onChange={(e) => updateFacilitatorOptions({ includeSentimentBadges: e.target.checked })}
                        className="rounded border-warning-fg"
                    />
                    {t('retrospective.export.facilitatorZone.sentimentBadges')}
                </label>
                <label className="flex items-center gap-2 text-xs text-warning-fg">
                    <input
                        type="checkbox"
                        checked={exportOptions.facilitatorOptions.includeTeamMoodAnalysis}
                        onChange={(e) => updateFacilitatorOptions({ includeTeamMoodAnalysis: e.target.checked })}
                        className="rounded border-warning-fg"
                    />
                    {t('retrospective.export.facilitatorZone.teamMoodAnalysis')}
                </label>
            </div>
        </div>
    ) : null;

    const statusMessages = (
        <>
            <AnimatePresence>
                {error && (
                    <motion.div
                        key="export-error"
                        initial={{ opacity: 0, transform: 'translateY(10px)' }}
                        animate={{ opacity: 1, transform: 'translateY(0px)' }}
                        exit={{ opacity: 0, transform: 'translateY(10px)' }}
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                        className="flex items-center gap-2 p-2.5 bg-error-bg border border-error-fg rounded-lg mt-3"
                    >
                        <AlertCircle className="w-4 h-4 text-error-fg shrink-0" />
                        <span className="text-xs text-error-fg">{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {success && (
                    <motion.div
                        key="export-success"
                        initial={{ opacity: 0, transform: 'translateY(10px)' }}
                        animate={{ opacity: 1, transform: 'translateY(0px)' }}
                        exit={{ opacity: 0, transform: 'translateY(10px)' }}
                        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                        className="flex items-center gap-2 p-2.5 bg-success-bg border border-success-fg rounded-lg mt-3"
                    >
                        <CheckCircle className="w-4 h-4 text-success-fg shrink-0" />
                        <span className="text-xs text-success-fg">{t('retrospective.export.success')}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );

    const footer = (
        <div className="flex gap-2 pt-3 mt-3 border-t border-border-default">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={isExporting}>
                {t('retrospective.export.cancel')}
            </Button>
            <Button variant="primary" onClick={handleExport} disabled={isExporting} className="flex-1">
                {/* Crossfades between the idle label and the exporting indicator instead
                    of an instant swap — the one moment this content genuinely teleports
                    (find-animation-opportunities, T026: "Preventing a jarring change"). */}
                <AnimatePresence mode="wait" initial={false}>
                    {isExporting ? (
                        <motion.span
                            key="exporting"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                            className="inline-flex items-center"
                        >
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            {progress ? `${Math.round(progress)}%` : t('retrospective.export.exporting')}
                        </motion.span>
                    ) : (
                        <motion.span
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                            className="inline-flex items-center"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            {t('retrospective.export.export', { format: exportOptions.format.toUpperCase() })}
                        </motion.span>
                    )}
                </AnimatePresence>
            </Button>
        </div>
    );

    if (presentation === 'mobile') {
        return (
            <div className="p-4 pb-6 space-y-4">
                {formatSelection}
                {documentConfig}
                {optionalContent}
                {alwaysIncludedNotice}
                {facilitatorZone}
                {footer}
                {statusMessages}
            </div>
        );
    }

    return (
        <div
            id="export-dialog-title"
            className="w-[34rem] max-w-[95vw] bg-surface-raised border border-border-default rounded-xl shadow-2xl max-h-[80vh] overflow-y-auto"
        >
            <div className="flex items-center justify-between p-4 border-b border-border-default">
                <div className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-info-fg" />
                    <h3 className="font-semibold text-text-primary">{t('retrospective.export.title')}</h3>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 rounded-lg hover:bg-surface text-text-muted hover:text-text-secondary transition-colors"
                    title={t('common.close')}
                    aria-label={t('common.close')}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
            <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                        {formatSelection}
                        {documentConfig}
                    </div>
                    <div className="space-y-4">
                        {optionalContent}
                        {alwaysIncludedNotice}
                        {facilitatorZone}
                    </div>
                </div>
                {footer}
                {statusMessages}
            </div>
        </div>
    );
};

export default ImprovedExportPopover;
