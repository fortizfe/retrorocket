import { useState } from 'react';
import { UnifiedExportOptions, UnifiedExportData, UseUnifiedExportState } from '../types/export';
import { exportRetrospective } from '../services/unifiedExportService';

interface UseUnifiedExportReturn extends UseUnifiedExportState {
    exportRetrospective: (data: UnifiedExportData, options: UnifiedExportOptions) => Promise<void>;
    resetState: () => void;
    setProgress: (progress: number) => void;
}

export const useUnifiedExport = (): UseUnifiedExportReturn => {
    const [state, setState] = useState<UseUnifiedExportState>({
        isExporting: false,
        progress: 0,
        error: null,
        success: false,
        currentFormat: undefined
    });

    const resetState = () => {
        setState({
            isExporting: false,
            progress: 0,
            error: null,
            success: false,
            currentFormat: undefined
        });
    };

    const setProgress = (progress: number) => {
        setState(prev => ({ ...prev, progress }));
    };

    const exportRetrospectiveUnified = async (
        data: UnifiedExportData,
        options: UnifiedExportOptions
    ): Promise<void> => {
        try {
            setState(prev => ({
                ...prev,
                isExporting: true,
                progress: 0,
                error: null,
                success: false,
                currentFormat: options.format
            }));

            // Simulate progress steps
            setState(prev => ({ ...prev, progress: 20 }));

            // Start export
            await exportRetrospective(data, options);

            setState(prev => ({ ...prev, progress: 100 }));

            // Mark as successful
            setState(prev => ({
                ...prev,
                isExporting: false,
                success: true
            }));

            // Reset success state after 3 seconds
            setTimeout(() => {
                setState(prev => ({ ...prev, success: false }));
            }, 3000);

        } catch (error) {
            console.error('Error exporting retrospective:', error);
            setState(prev => ({
                ...prev,
                isExporting: false,
                error: error instanceof Error ? error.message : 'Error desconocido al exportar',
                currentFormat: undefined
            }));

            // Reset error state after 5 seconds
            setTimeout(() => {
                setState(prev => ({ ...prev, error: null }));
            }, 5000);
        }
    };

    return {
        ...state,
        exportRetrospective: exportRetrospectiveUnified,
        resetState,
        setProgress
    };
};

export default useUnifiedExport;
