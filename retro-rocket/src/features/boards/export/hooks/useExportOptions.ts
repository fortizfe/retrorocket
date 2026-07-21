import { useState, useMemo } from 'react';
import { UnifiedExportOptions, ExportFormat } from '@/features/boards/types/export';
import { Retrospective } from '@/features/boards/types/retrospective';

interface UseExportOptionsProps {
    retrospective: Retrospective;
    isFacilitator: boolean;
}

interface ExportOptionsState {
    // Configuraciones básicas
    format: ExportFormat;
    documentConfig: {
        customTitle: string;
        includeRetroRocketLogo: boolean;
    };

    // Contenido opcional básico
    basicOptions: {
        includeActionItems: boolean;
        includeStatistics: boolean;
    };

    // Configuraciones avanzadas del facilitador
    facilitatorOptions: {
        includeFacilitatorNotes: boolean;
        includeSentimentBadges: boolean;
        includeTeamMoodAnalysis: boolean;
    };
}

export const useExportOptions = ({ retrospective, isFacilitator }: UseExportOptionsProps) => {
    const [exportOptions, setExportOptions] = useState<ExportOptionsState>({
        format: 'pdf',
        documentConfig: {
            customTitle: retrospective.title,
            includeRetroRocketLogo: true
        },
        basicOptions: {
            includeActionItems: true,
            includeStatistics: true
        },
        facilitatorOptions: {
            includeFacilitatorNotes: false,
            includeSentimentBadges: false,
            includeTeamMoodAnalysis: false
        }
    });

    // Update format
    const updateFormat = (format: ExportFormat) => {
        setExportOptions(prev => ({
            ...prev,
            format
        }));
    };

    // Update document config
    const updateDocumentConfig = (updates: Partial<ExportOptionsState['documentConfig']>) => {
        setExportOptions(prev => ({
            ...prev,
            documentConfig: {
                ...prev.documentConfig,
                ...updates
            }
        }));
    };

    // Update basic options
    const updateBasicOptions = (updates: Partial<ExportOptionsState['basicOptions']>) => {
        setExportOptions(prev => ({
            ...prev,
            basicOptions: {
                ...prev.basicOptions,
                ...updates
            }
        }));
    };

    // Update facilitator options
    const updateFacilitatorOptions = (updates: Partial<ExportOptionsState['facilitatorOptions']>) => {
        if (!isFacilitator) return; // Guard clause for security

        setExportOptions(prev => ({
            ...prev,
            facilitatorOptions: {
                ...prev.facilitatorOptions,
                ...updates
            }
        }));
    };

    // Convert to UnifiedExportOptions format
    const unifiedOptions = useMemo((): UnifiedExportOptions => {
        return {
            // Format
            format: exportOptions.format,

            // Document configuration
            documentTitle: exportOptions.documentConfig.customTitle,
            customTitle: exportOptions.documentConfig.customTitle,
            includeRetroRocketLogo: exportOptions.documentConfig.includeRetroRocketLogo,

            // Content that's always included
            includeParticipants: true,
            includeCardAuthors: true,
            includeReactions: true,
            includeGroupDetails: true,

            // Optional basic content
            includeStatistics: exportOptions.basicOptions.includeStatistics,
            includeActionItems: exportOptions.basicOptions.includeActionItems,

            // Cards appear in current order (no sorting options)
            sortOrder: 'original',

            // Advanced facilitator options
            includeFacilitatorNotes: isFacilitator ? exportOptions.facilitatorOptions.includeFacilitatorNotes : false,
            includeSentimentBadges: isFacilitator ? exportOptions.facilitatorOptions.includeSentimentBadges : false,
            includeTeamMoodAnalysis: isFacilitator ? exportOptions.facilitatorOptions.includeTeamMoodAnalysis : false
        };
    }, [exportOptions, isFacilitator]);

    return {
        exportOptions,
        updateFormat,
        updateDocumentConfig,
        updateBasicOptions,
        updateFacilitatorOptions,
        unifiedOptions
    };
};
