import { UnifiedExportOptions, UnifiedExportData, ExportFormat, SortOrder } from '../types/export';
import { exportRetrospectiveToPdf, ExportOptions as PdfExportOptions } from './pdfExportService';
import { exportRetrospectiveToTxt, TxtExportOptions } from './txtExportService';
import { exportRetrospectiveToDocx, DocxExportOptions } from './docxExportService';
import { Card } from '../types/card';

export class UnifiedExportService {

    /**
     * Main export function that delegates to specific format exporters
     */
    async exportRetrospective(
        data: UnifiedExportData,
        options: UnifiedExportOptions
    ): Promise<void> {
        try {
            console.log(`Starting ${options.format.toUpperCase()} export for: ${data.retrospective?.title}`);
            console.log(`Exporting ${data.cards?.length || 0} cards and ${data.groups?.length || 0} groups`);

            // Validate data
            if (!data.retrospective) {
                throw new Error('Retrospective data is required for export');
            }

            if (!data.cards || data.cards.length === 0) {
                console.warn('No cards found for export. The retrospective might be empty.');
            }

            // Prepare data with common transformations
            const processedData = this.prepareData(data, options);

            // Delegate to specific exporter based on format
            if (options.format === 'pdf') {
                await this.exportToPdf(processedData, options);
            } else if (options.format === 'txt') {
                await this.exportToTxt(processedData, options);
            } else if (options.format === 'docx') {
                await this.exportToDocx(processedData, options);
            } else {
                throw new Error(`Unsupported export format: ${options.format}`);
            }

            console.log(`${options.format.toUpperCase()} export completed successfully`);
        } catch (error) {
            console.error('Error in unified export:', error);
            throw error;
        }
    }

    /**
     * Prepare and transform data based on common options
     */
    private prepareData(data: UnifiedExportData, options: UnifiedExportOptions): UnifiedExportData {
        let processedCards = [...data.cards];

        // Apply sorting
        processedCards = this.sortCards(processedCards, options.sortOrder);

        // Filter or modify based on options
        if (!options.includeCardAuthors) {
            processedCards = processedCards.map(card => ({
                ...card,
                createdBy: ''
            }));
        }

        if (!options.includeReactions) {
            processedCards = processedCards.map(card => ({
                ...card,
                reactions: [],
                likes: []
            }));
        }

        // Ensure all cards have content
        processedCards = processedCards.map(card => ({
            ...card,
            content: card.content?.trim() || '[Sin contenido]'
        }));

        console.log(`Prepared ${processedCards.length} cards for export`);

        return {
            ...data,
            cards: processedCards
        };
    }

    /**
     * Sort cards based on selected order
     */
    private sortCards(cards: Card[], sortOrder: SortOrder): Card[] {
        switch (sortOrder) {
            case 'alphabetical':
                return cards.sort((a, b) => a.content.localeCompare(b.content, 'es'));

            case 'votes':
                return cards.sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));

            case 'likes':
                return cards.sort((a, b) => (b.likes?.length ?? 0) - (a.likes?.length ?? 0));

            case 'original':
            default:
                return cards.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        }
    }

    /**
     * Export to PDF format
     */
    private async exportToPdf(data: UnifiedExportData, options: UnifiedExportOptions): Promise<void> {
        const pdfOptions: PdfExportOptions = {
            includeParticipants: options.includeParticipants,
            includeStatistics: options.includeStatistics,
            includeGroupDetails: options.includeGroupDetails,
            includeFacilitatorNotes: options.includeFacilitatorNotes,
            logoUrl: options.includeRetroRocketLogo ? '/rocket.svg' : undefined
        };

        // Convert to PDF service format
        const pdfData = {
            retrospective: {
                ...data.retrospective,
                title: options.customTitle ?? data.retrospective.title
            },
            cards: data.cards,
            groups: data.groups,
            participants: data.participants,
            facilitatorNotes: data.facilitatorNotes
        };

        console.log(`Exporting ${pdfData.cards.length} cards to PDF`);
        await exportRetrospectiveToPdf(pdfData, pdfOptions);
    }

    /**
     * Export to TXT format
     */
    private async exportToTxt(data: UnifiedExportData, options: UnifiedExportOptions): Promise<void> {
        const txtOptions: TxtExportOptions = {
            includeParticipants: options.includeParticipants,
            includeStatistics: options.includeStatistics,
            includeCardAuthors: options.includeCardAuthors,
            includeGroupDetails: options.includeGroupDetails,
            includeFacilitatorNotes: options.includeFacilitatorNotes
        };

        // Convert to TXT service format
        const txtData = {
            retrospective: {
                ...data.retrospective,
                title: options.customTitle ?? data.retrospective.title
            },
            cards: data.cards,
            groups: data.groups,
            participants: data.participants,
            facilitatorNotes: data.facilitatorNotes
        };

        console.log(`Exporting ${txtData.cards.length} cards to TXT`);
        await exportRetrospectiveToTxt(txtData, txtOptions);
    }

    /**
     * Export to DOCX format
     */
    private async exportToDocx(data: UnifiedExportData, options: UnifiedExportOptions): Promise<void> {
        const docxOptions: DocxExportOptions = {
            includeParticipants: options.includeParticipants,
            includeStatistics: options.includeStatistics,
            includeCardAuthors: options.includeCardAuthors,
            includeReactions: options.includeReactions,
            includeGroupDetails: options.includeGroupDetails,
            includeFacilitatorNotes: options.includeFacilitatorNotes,
            facilitatorNotes: options.facilitatorNotes
        };

        // Convert to DOCX service format
        const docxData = {
            retrospective: {
                ...data.retrospective,
                title: options.customTitle ?? data.retrospective.title
            },
            cards: data.cards,
            groups: data.groups,
            participants: data.participants
        };

        console.log(`Exporting ${docxData.cards.length} cards to DOCX`);
        await exportRetrospectiveToDocx(docxData, docxOptions);
    }

    /**
     * Get available export formats
     */
    static getAvailableFormats(): { value: ExportFormat; label: string; description: string }[] {
        return [
            {
                value: 'pdf',
                label: 'PDF',
                description: 'Documento portable, ideal para imprimir y archivar'
            },
            {
                value: 'txt',
                label: 'TXT',
                description: 'Archivo de texto plano, simple y universal'
            },
            {
                value: 'docx',
                label: 'DOCX',
                description: 'Documento Word, editable y con formato avanzado'
            }
        ];
    }

    /**
     * Get available sort orders
     */
    static getSortOrders(): { value: SortOrder; label: string; description: string }[] {
        return [
            {
                value: 'original',
                label: 'Orden original',
                description: 'Mantener el orden en que fueron creadas'
            },
            {
                value: 'alphabetical',
                label: 'Alfabético',
                description: 'Ordenar por contenido de la tarjeta'
            },
            {
                value: 'votes',
                label: 'Por votos',
                description: 'Ordenar por cantidad de votos (mayor a menor)'
            },
            {
                value: 'likes',
                label: 'Por likes',
                description: 'Ordenar por cantidad de likes (mayor a menor)'
            }
        ];
    }
}

/**
 * Main unified export function
 */
export const exportRetrospective = async (
    data: UnifiedExportData,
    options: UnifiedExportOptions
): Promise<void> => {
    const service = new UnifiedExportService();
    await service.exportRetrospective(data, options);
};
