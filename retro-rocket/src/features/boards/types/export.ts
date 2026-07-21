// Interfaces compartidas para exportación unificada
export type ExportFormat = 'pdf' | 'txt' | 'docx';

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
    includeActionItems: boolean; // Nueva opción para elementos de acción

    // Ordenamiento
    sortOrder: SortOrder;

    // Notas adicionales
    includeFacilitatorNotes: boolean;
    facilitatorNotes?: string;

    // Funcionalidades avanzadas del facilitador
    includeSentimentBadges?: boolean;
    includeTeamMoodAnalysis?: boolean;

    // Configuraciones específicas por formato
    pdfOptions?: {
        pageSize?: 'a4' | 'letter';
        orientation?: 'portrait' | 'landscape';
    };

    txtOptions?: {
        encoding?: 'utf-8' | 'latin1';
        lineEnding?: 'unix' | 'windows';
    };

    docxOptions?: {
        pageSize?: 'a4' | 'letter';
        orientation?: 'portrait' | 'landscape';
    };
}

export interface UnifiedExportData {
    retrospective: Retrospective;
    cards: Card[];
    groups: CardGroup[];
    participants: Array<{ name: string; joinedAt: Date }>;
    facilitatorNotes?: FacilitatorNote[];
    actionItems?: ActionItem[]; // Añadir elementos de acción
    // New sentiment analysis data
    sentimentResults?: Map<string, import('@/features/boards/types/sentiment').SentimentResult>;
    teamMoodReport?: import('@/features/boards/types/teamMood').TeamMoodReport;
}

export interface UseUnifiedExportState {
    isExporting: boolean;
    progress: number;
    error: string | null;
    success: boolean;
    currentFormat?: ExportFormat;
}

import { Retrospective } from '@/features/boards/types/retrospective';
import { Card, CardGroup } from '@/features/boards/types/card';
import { FacilitatorNote } from '@/features/boards/types/facilitatorNotes';
import { ActionItem } from '@/features/boards/types/actionItem';
