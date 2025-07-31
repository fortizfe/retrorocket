import { saveAs } from 'file-saver';
import { Retrospective } from '../types/retrospective';
import { Card, CardGroup } from '../types/card';
import { FacilitatorNote } from '../types/facilitatorNotes';
import { COLUMNS, COLUMN_ORDER } from '../utils/constants';

export interface TxtExportOptions {
    includeParticipants?: boolean;
    includeStatistics?: boolean;
    includeCardAuthors?: boolean;
    includeGroupDetails?: boolean;
    includeFacilitatorNotes?: boolean;
}

export interface RetrospectiveTxtData {
    retrospective: Retrospective;
    cards: Card[];
    groups: CardGroup[];
    participants: Array<{ name: string; joinedAt: Date }>;
    facilitatorNotes?: FacilitatorNote[];
}

export class TxtExportService {

    /**
     * Export complete retrospective to TXT
     */
    async exportRetrospective(
        data: RetrospectiveTxtData,
        options: TxtExportOptions = {}
    ): Promise<void> {
        try {
            console.log('Starting TXT export for retrospective:', data.retrospective.title);

            // Build text content
            const content = this.buildTextContent(data, options);

            // Create blob and download
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const filename = `${this.sanitizeFilename(data.retrospective.title)}.txt`;

            saveAs(blob, filename);

            console.log('TXT export completed successfully');
        } catch (error) {
            console.error('Error exporting to TXT:', error);
            throw error;
        }
    }

    /**
     * Build the complete text content
     */
    private buildTextContent(data: RetrospectiveTxtData, options: TxtExportOptions): string {
        const lines: string[] = [];

        // Title
        lines.push(`RETROSPECTIVA: ${data.retrospective.title.toUpperCase()}`);
        lines.push('='.repeat(50));
        lines.push('');

        // Description if exists
        if (data.retrospective.description) {
            lines.push('DESCRIPCIÓN:');
            lines.push(data.retrospective.description);
            lines.push('');
        }

        // Creation info
        if (data.retrospective.createdAt) {
            lines.push(`Fecha de creación: ${new Date(data.retrospective.createdAt).toLocaleDateString('es-ES')}`);
            lines.push('');
        }

        // Participants
        if (options.includeParticipants && data.participants.length > 0) {
            lines.push('PARTICIPANTES:');
            lines.push('-'.repeat(20));
            data.participants.forEach((participant, index) => {
                lines.push(`${index + 1}. ${participant.name}`);
            });
            lines.push('');
        }

        // Statistics
        if (options.includeStatistics) {
            this.addStatistics(lines, data);
        }

        // Cards by column
        this.addCardsByColumn(lines, data, options);

        // Groups
        if (options.includeGroupDetails && data.groups.length > 0) {
            this.addGroups(lines, data);
        }

        // Facilitator notes
        if (options.includeFacilitatorNotes && data.facilitatorNotes && data.facilitatorNotes.length > 0) {
            lines.push('NOTAS DEL FACILITADOR:');
            lines.push('-'.repeat(30));

            data.facilitatorNotes.forEach((note, index) => {
                lines.push(`${index + 1}. ${note.content}`);
                lines.push(`   Fecha: ${note.timestamp.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}`);
                lines.push('');
            });
        }

        // Footer
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push(`Generado por RetroRocket el ${new Date().toLocaleDateString('es-ES')}`);

        return lines.join('\n');
    }

    /**
     * Add statistics section
     */
    private addStatistics(lines: string[], data: RetrospectiveTxtData): void {
        lines.push('ESTADÍSTICAS:');
        lines.push('-'.repeat(20));

        const totalCards = data.cards.length;
        const totalVotes = data.cards.reduce((sum, card) => sum + (card.votes ?? 0), 0);
        const totalLikes = data.cards.reduce((sum, card) => sum + (card.likes?.length ?? 0), 0);

        lines.push(`Total de tarjetas: ${totalCards}`);
        lines.push(`Total de votos: ${totalVotes}`);
        lines.push(`Total de likes: ${totalLikes}`);
        lines.push(`Participantes: ${data.participants.length}`);
        lines.push(`Grupos formados: ${data.groups.length}`);

        // Cards per column
        COLUMN_ORDER.forEach(columnId => {
            const columnCards = data.cards.filter(card => card.column === columnId);
            lines.push(`${COLUMNS[columnId].title}: ${columnCards.length} tarjetas`);
        });

        lines.push('');
    }

    /**
     * Add cards organized by column
     */
    private addCardsByColumn(lines: string[], data: RetrospectiveTxtData, options: TxtExportOptions): void {
        COLUMN_ORDER.forEach(columnId => {
            const column = COLUMNS[columnId];
            const columnCards = data.cards.filter(card => card.column === columnId);

            if (columnCards.length === 0) return;

            lines.push(`${column.title.toUpperCase()}:`);
            lines.push('-'.repeat(column.title.length + 1));
            lines.push(`${column.description}`);
            lines.push(''); columnCards.forEach((card, index) => {
                // Ensure card content exists and is not empty
                const cardContent = card.content?.trim() || '[Sin contenido]';

                lines.push(`${index + 1}. ${cardContent}`);

                // Add metadata based on options
                const metadata = this.buildCardMetadata(card, options);
                metadata.forEach(meta => {
                    lines.push(`   ${meta}`);
                });

                lines.push('');
            });

            lines.push('');
        });
    }

    /**
     * Build card metadata based on options
     */
    private buildCardMetadata(card: Card, options: TxtExportOptions): string[] {
        const metadata: string[] = [];

        // Author
        if (options.includeCardAuthors && card.createdBy?.trim()) {
            metadata.push(`Autor: ${card.createdBy}`);
        }

        // Votes
        if (card.votes && card.votes > 0) {
            metadata.push(`Votos: ${card.votes}`);
        }

        // Likes
        const likesCount = card.likes?.length || 0;
        if (likesCount > 0) {
            metadata.push(`Likes: ${likesCount}`);
        }

        // Other reactions
        const totalReactions = card.reactions?.length || 0;
        const reactionsCount = totalReactions - likesCount;
        if (reactionsCount > 0) {
            metadata.push(`Otras reacciones: ${reactionsCount}`);
        }

        return metadata;
    }

    /**
     * Add groups section
     */
    private addGroups(lines: string[], data: RetrospectiveTxtData): void {
        lines.push('AGRUPACIONES:');
        lines.push('-'.repeat(20));
        lines.push('');

        data.groups.forEach((group, index) => {
            const groupTitle = group.title?.trim() || `Grupo ${index + 1}`;
            lines.push(`${index + 1}. ${groupTitle}`);

            // Get all cards in this group (head card + member cards)
            const allCardIds = [group.headCardId, ...group.memberCardIds];
            const groupCards = data.cards.filter(card =>
                allCardIds.includes(card.id)
            );

            // Find head card
            const headCard = groupCards.find(card => card.id === group.headCardId);
            const memberCards = groupCards.filter(card => card.id !== group.headCardId);

            lines.push(`   Tarjetas agrupadas: ${groupCards.length}`);

            // Show head card first
            if (headCard) {
                const headContent = headCard.content?.trim() || '[Sin contenido]';
                lines.push(`   ★ Principal: ${headContent}`);
            }

            // Show member cards
            memberCards.forEach(card => {
                const cardContent = card.content?.trim() || '[Sin contenido]';
                lines.push(`   - ${cardContent}`);
            });

            // Group statistics
            const totalVotes = groupCards.reduce((sum, card) => sum + (card.votes || 0), 0);
            const totalLikes = groupCards.reduce((sum, card) => sum + (card.likes?.length || 0), 0);

            if (totalVotes > 0 || totalLikes > 0) {
                lines.push(`   Estadísticas: ${totalVotes} votos, ${totalLikes} likes`);
            }

            lines.push('');
        });

        lines.push('');
    }

    /**
     * Sanitize filename for safe file system usage
     */
    private sanitizeFilename(filename: string): string {
        return filename
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, '_')
            .toLowerCase();
    }
}

/**
 * Export retrospective to TXT format
 */
export const exportRetrospectiveToTxt = async (
    data: RetrospectiveTxtData,
    options: TxtExportOptions = {}
): Promise<void> => {
    const service = new TxtExportService();
    await service.exportRetrospective(data, options);
};
