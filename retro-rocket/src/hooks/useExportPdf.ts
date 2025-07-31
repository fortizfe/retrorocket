import { useState } from 'react';
import { exportRetrospectiveToPdf, ExportOptions, RetrospectiveExportData } from '../services/pdfExportService';
import { Retrospective } from '../types/retrospective';
import { Card, CardGroup } from '../types/card';
import { FacilitatorNote } from '../types/facilitatorNotes';

interface UseExportPdfProps {
    retrospective: Retrospective;
    cards: Card[];
    groups: CardGroup[];
    participants: Array<{ name: string; joinedAt: Date }>;
    facilitatorNotes?: FacilitatorNote[];
}

interface UseExportPdfReturn {
    isExporting: boolean;
    error: string | null;
    exportToPdf: (options?: ExportOptions) => Promise<void>;
}

export const useExportPdf = ({
    retrospective,
    cards,
    groups,
    participants,
    facilitatorNotes
}: UseExportPdfProps): UseExportPdfReturn => {
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const exportToPdf = async (options: ExportOptions = {}): Promise<void> => {
        if (isExporting) return;

        setIsExporting(true);
        setError(null);

        try {
            // Prepare export data
            const exportData: RetrospectiveExportData = {
                retrospective,
                cards,
                groups,
                participants,
                facilitatorNotes
            };

            // Default options
            const defaultOptions: ExportOptions = {
                includeParticipants: true,
                includeStatistics: true,
                includeGroupDetails: true,
                includeFacilitatorNotes: false,
                ...options
            };

            console.log('Starting PDF export with options:', defaultOptions);
            console.log('Export data:', {
                retrospective: retrospective.title,
                cardsCount: cards.length,
                groupsCount: groups.length,
                participantsCount: participants.length
            });

            // Export to PDF
            await exportRetrospectiveToPdf(exportData, defaultOptions);

            console.log('PDF export completed successfully');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido al exportar PDF';
            console.error('Error exporting PDF:', err);
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsExporting(false);
        }
    };

    return {
        isExporting,
        error,
        exportToPdf
    };
};
