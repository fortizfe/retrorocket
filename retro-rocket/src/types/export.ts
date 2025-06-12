// Interfaces compartidas para exportación unificada
export type ExportFormat = 'pdf' | 'txt';

export type SortOrder = 'original' | 'alphabetical' | 'votes' | 'likes';

export interface UnifiedExportOptions {
    // Formato de exportación
    format: ExportFormat;

    // Configuración del documento
    documentTitle?: string;
    customTitle?: string;
    includeRetroRocketLogo?: boolean;

    // Contenido
    includeParticipants: boolean;
    includeStatistics: boolean;
    includeCardAuthors: boolean;
    includeReactions: boolean;
    includeGroupDetails: boolean;

    // Ordenamiento
    sortOrder: SortOrder;

    // Notas adicionales
    includeFacilitatorNotes: boolean;
    facilitatorNotes?: string;

    // Configuraciones específicas por formato
    pdfOptions?: {
        pageSize?: 'a4' | 'letter';
        orientation?: 'portrait' | 'landscape';
    };

    txtOptions?: {
        encoding?: 'utf-8' | 'latin1';
        lineEnding?: 'unix' | 'windows';
    };
}

export interface UnifiedExportData {
    retrospective: Retrospective;
    cards: Card[];
    groups: CardGroup[];
    participants: Array<{ name: string; joinedAt: Date }>;
}

export interface UseUnifiedExportState {
    isExporting: boolean;
    progress: number;
    error: string | null;
    success: boolean;
    currentFormat?: ExportFormat;
}

import { Retrospective } from '../types/retrospective';
import { Card, CardGroup } from '../types/card';
