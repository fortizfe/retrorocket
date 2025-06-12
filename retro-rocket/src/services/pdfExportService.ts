import jsPDF from 'jspdf';
import { Retrospective } from '../types/retrospective';
import { Card, CardGroup } from '../types/card';
import { COLUMNS, COLUMN_ORDER } from '../utils/constants';
import { getCardColorHex } from '../utils/cardColors';

export interface ExportOptions {
    includeParticipants?: boolean;
    includeStatistics?: boolean;
    includeGroupDetails?: boolean;
    logoUrl?: string;
}

export interface RetrospectiveExportData {
    retrospective: Retrospective;
    cards: Card[];
    groups: CardGroup[];
    participants: Array<{ name: string; joinedAt: Date }>;
}

export class PdfExportService {
    private pdf: jsPDF;
    private pageWidth: number;
    private pageHeight: number;
    private margin: number;
    private currentY: number;
    private logoHeight: number = 20;

    constructor() {
        this.pdf = new jsPDF('portrait', 'mm', 'a4');
        this.pageWidth = this.pdf.internal.pageSize.getWidth();
        this.pageHeight = this.pdf.internal.pageSize.getHeight();
        this.margin = 20;
        this.currentY = this.margin;
    }

    /**
     * Sanitize text to ensure proper rendering in PDF
     */
    private sanitizeText(text: string): string {
        return text
            .replace(/[^\x00-\x7F]/g, (char) => {
                // Replace common Spanish characters with ASCII equivalents
                const replacements: { [key: string]: string } = {
                    'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
                    'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
                    'ñ': 'n', 'Ñ': 'N', 'ü': 'u', 'Ü': 'U',
                    '¿': '?', '¡': '!', '–': '-', '—': '-'
                };
                return replacements[char] || char;
            })
            // Remove emojis and special symbols
            .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
            // Clean up extra spaces
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Enhanced text method that sanitizes input
     */
    private addText(text: string, x: number, y: number): void {
        const sanitizedText = this.sanitizeText(text);
        // Debug: Log text transformations for troubleshooting
        if (text !== sanitizedText) {
            console.log(`Text sanitized: "${text}" → "${sanitizedText}"`);
        }
        this.pdf.text(sanitizedText, x, y);
    }

    /**
     * Export complete retrospective to PDF
     */
    async exportRetrospective(
        data: RetrospectiveExportData,
        options: ExportOptions = {}
    ): Promise<void> {
        try {
            console.log('Starting PDF export for retrospective:', data.retrospective.title);

            // Reset PDF state
            this.currentY = this.margin;

            // Add header with logo and title
            await this.addHeader(data.retrospective, options.logoUrl);

            // Add retrospective info
            this.addRetrospectiveInfo(data.retrospective, data.participants, options);

            // Add statistics if requested
            if (options.includeStatistics) {
                this.addStatistics(data.cards, data.groups);
            }

            // Add columns with cards and groups
            this.addColumnsContent(data.cards, data.groups, options);

            // Add footer
            this.addFooter();

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `retrospectiva-${data.retrospective.title.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.pdf`;

            // Save the PDF
            this.pdf.save(filename);

            console.log('PDF export completed successfully:', filename);
        } catch (error) {
            console.error('Error exporting PDF:', error);
            throw new Error('Failed to export PDF');
        }
    }

    /**
     * Add header with logo and title
     */
    private async addHeader(retrospective: Retrospective, logoUrl?: string): Promise<void> {
        // Add logo if provided
        if (logoUrl) {
            try {
                // Note: In a real implementation, you'd need to handle image loading
                this.currentY += this.logoHeight + 5;
            } catch (error) {
                console.warn('Could not load logo:', error);
            }
        }

        // Add RetroRocket title
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setFontSize(24);
        this.pdf.setTextColor(59, 130, 246); // Blue color
        this.addText('RetroRocket', this.margin, this.currentY);
        this.currentY += 10;

        // Add retrospective title
        this.pdf.setFontSize(20);
        this.pdf.setTextColor(0, 0, 0);
        const title = this.truncateText(retrospective.title, 60);
        this.addText(title, this.margin, this.currentY);
        this.currentY += 8;

        // Add description if exists
        if (retrospective.description) {
            this.pdf.setFont('helvetica', 'normal');
            this.pdf.setFontSize(12);
            this.pdf.setTextColor(75, 85, 99); // Gray color
            const lines = this.wrapText(retrospective.description, this.pageWidth - 2 * this.margin);
            lines.forEach(line => {
                this.addText(line, this.margin, this.currentY);
                this.currentY += 5;
            });
        }

        this.currentY += 10;
    }

    /**
     * Add retrospective information
     */
    private addRetrospectiveInfo(
        retrospective: Retrospective,
        participants: Array<{ name: string; joinedAt: Date }>,
        options: ExportOptions
    ): void {
        // Section title
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setFontSize(14);
        this.pdf.setTextColor(0, 0, 0);
        this.addText('Informacion de la Retrospectiva', this.margin, this.currentY);
        this.currentY += 8;

        // Info box
        this.pdf.setDrawColor(229, 231, 235);
        this.pdf.setFillColor(249, 250, 251);
        this.pdf.roundedRect(this.margin, this.currentY - 5, this.pageWidth - 2 * this.margin, 25, 2, 2, 'FD');

        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setFontSize(10);
        this.pdf.setTextColor(75, 85, 99);

        // Date
        const exportDate = new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        this.addText(`Fecha de exportacion: ${exportDate}`, this.margin + 5, this.currentY);
        this.currentY += 5;

        // Creation date
        if (retrospective.createdAt) {
            const createdDate = new Date(retrospective.createdAt).toLocaleDateString('es-ES');
            this.addText(`Retrospectiva creada: ${createdDate}`, this.margin + 5, this.currentY);
            this.currentY += 5;
        }

        // Participants
        if (options.includeParticipants && participants.length > 0) {
            this.addText(`Participantes: ${participants.length}`, this.margin + 5, this.currentY);
            this.currentY += 5;

            const participantNames = participants.map(p => p.name).join(', ');
            const wrappedNames = this.wrapText(participantNames, this.pageWidth - 2 * this.margin - 10);
            wrappedNames.forEach(line => {
                this.addText(`    ${line}`, this.margin + 5, this.currentY);
                this.currentY += 4;
            });
        }

        this.currentY += 15;
    }

    /**
     * Add statistics section
     */
    private addStatistics(cards: Card[], groups: CardGroup[]): void {
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setFontSize(14);
        this.pdf.setTextColor(0, 0, 0);
        this.addText('Estadisticas', this.margin, this.currentY);
        this.currentY += 8;

        // Calculate statistics
        const totalCards = cards.length;
        const totalGroups = groups.length;
        const totalVotes = cards.reduce((sum, card) => sum + (card.votes || 0), 0);
        const totalLikes = cards.reduce((sum, card) => sum + (card.likes?.length || 0), 0);
        const totalReactions = cards.reduce((sum, card) => sum + (card.reactions?.length || 0), 0);

        // Statistics by column
        const columnStats = COLUMN_ORDER.map(columnId => {
            const columnCards = cards.filter(card => card.column === columnId);
            const columnGroups = groups.filter(group => group.column === columnId);
            return {
                column: COLUMNS[columnId],
                cards: columnCards.length,
                groups: columnGroups.length,
                votes: columnCards.reduce((sum, card) => sum + (card.votes || 0), 0)
            };
        });

        // Stats box
        this.pdf.setDrawColor(229, 231, 235);
        this.pdf.setFillColor(249, 250, 251);
        this.pdf.roundedRect(this.margin, this.currentY - 5, this.pageWidth - 2 * this.margin, 35, 2, 2, 'FD');

        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setFontSize(10);
        this.pdf.setTextColor(75, 85, 99);

        // General stats
        this.addText(`Total de tarjetas: ${totalCards}`, this.margin + 5, this.currentY);
        this.addText(`Total de grupos: ${totalGroups}`, this.margin + 70, this.currentY);
        this.currentY += 5;

        this.addText(`Total de votos: ${totalVotes}`, this.margin + 5, this.currentY);
        this.addText(`Total de likes: ${totalLikes}`, this.margin + 70, this.currentY);
        this.currentY += 5;

        this.addText(`Total de reacciones: ${totalReactions}`, this.margin + 5, this.currentY);
        this.currentY += 8;

        // Column statistics
        columnStats.forEach((stat, index) => {
            const x = this.margin + 5 + (index * 55);
            this.addText(`${stat.column.title}:`, x, this.currentY);
            this.addText(`   ${stat.cards} tarjetas`, x, this.currentY + 4);
            if (stat.groups > 0) {
                this.addText(`   ${stat.groups} grupos`, x, this.currentY + 8);
            }
        });

        this.currentY += 20;
    }

    /**
     * Add columns with cards and groups
     */
    private addColumnsContent(cards: Card[], groups: CardGroup[], options: ExportOptions): void {
        COLUMN_ORDER.forEach((columnId, index) => {
            const column = COLUMNS[columnId];
            const columnCards = cards.filter(card => card.column === columnId);
            const columnGroups = groups.filter(group => group.column === columnId);

            if (columnCards.length === 0) return;

            // Check if we need a new page
            if (this.currentY > this.pageHeight - 60) {
                this.pdf.addPage();
                this.currentY = this.margin;
            }

            this.addColumnSection(column, columnCards, columnGroups, options);
        });
    }

    /**
     * Add a single column section
     */
    private addColumnSection(
        column: any,
        cards: Card[],
        groups: CardGroup[],
        options: ExportOptions
    ): void {
        // Column header
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setFontSize(16);
        this.pdf.setTextColor(0, 0, 0);
        this.addText(`${column.title}`, this.margin, this.currentY);
        this.currentY += 8;

        // Column description
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setFontSize(10);
        this.pdf.setTextColor(107, 114, 128);
        this.addText(column.description, this.margin, this.currentY);
        this.currentY += 10;

        // Get ungrouped cards
        const ungroupedCards = cards.filter(card => !card.groupId);

        // Add groups first
        groups.forEach(group => {
            this.addGroupSection(group, cards, options);
        });

        // Add ungrouped cards
        ungroupedCards.forEach(card => {
            this.addCardSection(card, false);
        });

        this.currentY += 10;
    }

    /**
     * Add a group section
     */
    private addGroupSection(group: CardGroup, allCards: Card[], options: ExportOptions): void {
        const groupCards = allCards.filter(card =>
            card.id === group.headCardId || group.memberCardIds.includes(card.id)
        );

        if (groupCards.length === 0) return;

        // Check if we need a new page
        if (this.currentY > this.pageHeight - 40) {
            this.pdf.addPage();
            this.currentY = this.margin;
        }

        // Group header
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setFontSize(12);
        this.pdf.setTextColor(59, 130, 246); // Blue
        const groupTitle = group.title || `Grupo de ${groupCards.length} tarjetas`;
        this.addText(`${groupTitle}`, this.margin + 5, this.currentY);
        this.currentY += 6;

        // Group stats
        if (options.includeGroupDetails) {
            this.pdf.setFont('helvetica', 'normal');
            this.pdf.setFontSize(9);
            this.pdf.setTextColor(107, 114, 128);

            const totalVotes = groupCards.reduce((sum, card) => sum + (card.votes || 0), 0);
            const totalLikes = groupCards.reduce((sum, card) => sum + (card.likes?.length || 0), 0);

            this.addText(`${groupCards.length} tarjetas - ${totalVotes} votos - ${totalLikes} likes`, this.margin + 10, this.currentY);
            this.currentY += 6;
        }

        // Add group cards
        const headCard = groupCards.find(card => card.id === group.headCardId);
        const memberCards = groupCards.filter(card =>
            card.id !== group.headCardId && group.memberCardIds.includes(card.id)
        );

        // Add head card first
        if (headCard) {
            this.addCardSection(headCard, true, true);
        }

        // Add member cards with indentation
        memberCards.forEach(card => {
            this.addCardSection(card, true, false);
        });

        this.currentY += 5;
    }

    /**
     * Add a single card section
     */
    private addCardSection(card: Card, isGrouped: boolean = false, isHeadCard: boolean = false): void {
        // Check if we need a new page
        if (this.currentY > this.pageHeight - 30) {
            this.pdf.addPage();
            this.currentY = this.margin;
        }

        const leftMargin = this.margin + (isGrouped ? (isHeadCard ? 10 : 20) : 0);
        const cardWidth = this.pageWidth - leftMargin - this.margin;

        // Card background color
        const cardColor = card.color || 'pastelWhite';
        const hexColor = getCardColorHex(cardColor);
        if (hexColor && hexColor !== '#FFFFFF') {
            const rgb = this.hexToRgb(hexColor);
            if (rgb) {
                this.pdf.setFillColor(rgb.r, rgb.g, rgb.b);
                this.pdf.roundedRect(leftMargin - 2, this.currentY - 4, cardWidth + 4, 15, 1, 1, 'F');
            }
        }

        // Card border
        this.pdf.setDrawColor(229, 231, 235);
        this.pdf.roundedRect(leftMargin - 2, this.currentY - 4, cardWidth + 4, 15, 1, 1, 'D');

        // Head card indicator
        if (isHeadCard) {
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.setFontSize(8);
            this.pdf.setTextColor(59, 130, 246);
            this.addText('Principal', leftMargin, this.currentY - 1);
            this.currentY += 3;
        }

        // Card content
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setFontSize(10);
        this.pdf.setTextColor(0, 0, 0);

        const contentLines = this.wrapText(card.content, cardWidth - 5);
        contentLines.forEach(line => {
            this.addText(line, leftMargin, this.currentY);
            this.currentY += 4;
        });

        // Card metadata
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setFontSize(8);
        this.pdf.setTextColor(107, 114, 128);

        const metadata = [];
        if (card.createdBy) metadata.push(`${card.createdBy}`);
        if (card.votes && card.votes > 0) metadata.push(`${card.votes} votos`);
        if (card.likes && card.likes.length > 0) metadata.push(`${card.likes.length} likes`);
        if (card.reactions && card.reactions.length > 0) metadata.push(`${card.reactions.length} reacciones`);

        if (metadata.length > 0) {
            this.addText(metadata.join(' - '), leftMargin, this.currentY);
            this.currentY += 4;
        }

        this.currentY += 6;
    }

    /**
     * Add footer with page numbers and timestamp
     */
    private addFooter(): void {
        const pageCount = this.pdf.internal.getNumberOfPages();

        for (let i = 1; i <= pageCount; i++) {
            this.pdf.setPage(i);

            // Page number
            this.pdf.setFont('helvetica', 'normal');
            this.pdf.setFontSize(8);
            this.pdf.setTextColor(107, 114, 128);
            this.addText(
                `Pagina ${i} de ${pageCount}`,
                this.pageWidth - this.margin - 15,
                this.pageHeight - 10
            );

            // Timestamp
            const timestamp = new Date().toLocaleString('es-ES');
            this.addText(
                `Generado el ${timestamp} por RetroRocket`,
                this.margin,
                this.pageHeight - 10
            );
        }
    }

    /**
     * Utility methods
     */
    private wrapText(text: string, maxWidth: number): string[] {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        words.forEach(word => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const textWidth = this.pdf.getTextWidth(testLine);

            if (textWidth > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines;
    }

    private truncateText(text: string, maxLength: number): string {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
}

/**
 * Main export function
 */
export const exportRetrospectiveToPdf = async (
    data: RetrospectiveExportData,
    options: ExportOptions = {}
): Promise<void> => {
    const service = new PdfExportService();
    await service.exportRetrospective(data, options);
};
