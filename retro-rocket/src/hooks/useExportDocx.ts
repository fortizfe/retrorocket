import { useState } from 'react';
import { exportRetrospectiveToDocx, DocxExportOptions, RetrospectiveDocxData } from '../services/docxExportService';

interface UseExportDocxState {
    isExporting: boolean;
    progress: number;
    error: string | null;
    success: boolean;
}

interface UseExportDocxReturn extends UseExportDocxState {
    exportToDocx: (data: RetrospectiveDocxData, options?: DocxExportOptions) => Promise<void>;
    resetState: () => void;
}

export const useExportDocx = (): UseExportDocxReturn => {
    const [state, setState] = useState<UseExportDocxState>({
        isExporting: false,
        progress: 0,
        error: null,
        success: false
    });

    const resetState = () => {
        setState({
            isExporting: false,
            progress: 0,
            error: null,
            success: false
        });
    };

    const exportToDocx = async (data: RetrospectiveDocxData, options: DocxExportOptions = {}) => {
        try {
            setState(prev => ({
                ...prev,
                isExporting: true,
                progress: 0,
                error: null,
                success: false
            }));

            // Simulate progress steps
            setState(prev => ({ ...prev, progress: 25 }));

            // Start export
            await exportRetrospectiveToDocx(data, options);

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
            console.error('Error exporting to DOCX:', error);
            setState(prev => ({
                ...prev,
                isExporting: false,
                error: error instanceof Error ? error.message : 'Error desconocido al exportar'
            }));

            // Reset error state after 5 seconds
            setTimeout(() => {
                setState(prev => ({ ...prev, error: null }));
            }, 5000);
        }
    };

    return {
        ...state,
        exportToDocx,
        resetState
    };
};

export default useExportDocx;
