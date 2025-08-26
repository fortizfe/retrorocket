import { saveAs } from 'file-saver';
import { Retrospective } from '../types/retrospective';
import { Card, CardGroup } from '../types/card';
import { FacilitatorNote } from '../types/facilitatorNotes';
import { ActionItem } from '../types/actionItem';
import { SentimentResult } from '../types/sentiment';
import { TeamMoodReport } from '../types/teamMood';
import { getExportColumns, getExportColumnOrder, getTemplateName, validateCardsForTemplate } from '../utils/exportColumns';

export interface TxtExportOptions {
    includeParticipants?: boolean;
    includeStatistics?: boolean;
    includeCardAuthors?: boolean;
    includeGroupDetails?: boolean;
    includeFacilitatorNotes?: boolean;
    includeActionItems?: boolean;
    // New sentiment analysis options
    includeSentimentBadges?: boolean;
    includeTeamMoodAnalysis?: boolean;
}

export interface RetrospectiveTxtData {
    retrospective: Retrospective;
    cards: Card[];
    groups: CardGroup[];
    participants: Array<{ name: string; joinedAt: Date }>;
    facilitatorNotes?: FacilitatorNote[];
    actionItems?: ActionItem[];
    // New sentiment data
    sentimentResults?: Map<string, SentimentResult>;
    teamMoodReport?: TeamMoodReport;
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

        // Get dynamic columns based on template
        const templateId = data.retrospective.templateId;
        const columns = getExportColumns(templateId);
        const columnOrder = getExportColumnOrder(templateId);

        // Validate cards structure
        const validation = validateCardsForTemplate(data.cards, templateId);
        if (!validation.isValid) {
            console.warn('⚠️ Cards validation issues:', validation.issues);
        }

        // Title
        lines.push(`RETROSPECTIVA: ${data.retrospective.title.toUpperCase()}`);
        lines.push('='.repeat(50));
        lines.push('');

        // Template info
        if (templateId) {
            lines.push(`Plantilla: ${getTemplateName(templateId)}`);
            lines.push('');
        }

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
            this.addStatistics(lines, data, columns, columnOrder);
        }

        // Cards by column
        this.addCardsByColumn(lines, data, options, columns, columnOrder);

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

        // Action Items
        if (options.includeActionItems && data.actionItems && data.actionItems.length > 0) {
            lines.push('ELEMENTOS DE ACCIÓN:');
            lines.push('-'.repeat(30));

            data.actionItems.forEach((actionItem, index) => {
                const assignee = actionItem.assignedToName || 'Sin asignar';

                lines.push(`${index + 1}. ${actionItem.content}`);
                lines.push(`   Responsable: ${assignee}`);

                if (actionItem.dueDate) {
                    lines.push(`   Fecha de vencimiento: ${new Date(actionItem.dueDate).toLocaleDateString('es-ES')}`);
                }

                if (actionItem.createdAt) {
                    lines.push(`   Creado: ${new Date(actionItem.createdAt).toLocaleDateString('es-ES')}`);
                }

                if (actionItem.updatedAt && actionItem.updatedAt !== actionItem.createdAt) {
                    lines.push(`   Actualizado: ${new Date(actionItem.updatedAt).toLocaleDateString('es-ES')}`);
                }

                lines.push('');
            });
        }

        // Team Mood Analysis (Facilitator only)
        if (options.includeTeamMoodAnalysis && data.teamMoodReport) {
            this.addTeamMoodAnalysis(lines, data.teamMoodReport);
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
    private addStatistics(lines: string[], data: RetrospectiveTxtData, columns: Record<string, any>, columnOrder: string[]): void {
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

        if (data.actionItems && data.actionItems.length > 0) {
            lines.push(`Elementos de acción: ${data.actionItems.length}`);
        }

        // Cards per column
        columnOrder.forEach(columnId => {
            const columnCards = data.cards.filter(card => card.column === columnId);
            const columnConfig = columns[columnId];
            if (columnConfig) {
                lines.push(`${columnConfig.title}: ${columnCards.length} tarjetas`);
            }
        });

        lines.push('');
    }

    /**
     * Add cards organized by column
     */
    private addCardsByColumn(lines: string[], data: RetrospectiveTxtData, options: TxtExportOptions, columns: Record<string, any>, columnOrder: string[]): void {
        columnOrder.forEach(columnId => {
            const columnConfig = columns[columnId];
            const columnCards = data.cards.filter(card => card.column === columnId);

            if (columnCards.length === 0 || !columnConfig) return;

            lines.push(`${columnConfig.title.toUpperCase()}:`);
            lines.push('-'.repeat(columnConfig.title.length + 1));
            lines.push(`${columnConfig.description}`);
            lines.push('');

            columnCards.forEach((card, index) => {
                // Ensure card content exists and is not empty
                const cardContent = card.content?.trim() || '[Sin contenido]';

                lines.push(`${index + 1}. ${cardContent}`);

                // Add metadata based on options
                const metadata = this.buildCardMetadata(card, options);
                metadata.forEach(meta => {
                    lines.push(`   ${meta}`);
                });

                // Add sentiment metadata if enabled
                if (options.includeSentimentBadges && data.sentimentResults) {
                    const sentimentMetadata = this.buildSentimentMetadata(card, data.sentimentResults);
                    sentimentMetadata.forEach(meta => {
                        lines.push(`   ${meta}`);
                    });
                }

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
        if (card.likes && card.likes.length > 0) {
            metadata.push(`Votos: ${card.likes.length}`);
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
     * Build sentiment metadata for card
     */
    private buildSentimentMetadata(card: Card, sentimentResults?: Map<string, SentimentResult>): string[] {
        const metadata: string[] = [];

        if (sentimentResults && sentimentResults.has(card.id)) {
            const result = sentimentResults.get(card.id)!;
            const confidencePercent = Math.round(result.confidence * 100);

            let sentimentLabel = '';
            let sentimentIcon = '';

            switch (result.sentiment) {
                case 'positive':
                    sentimentLabel = 'Positivo';
                    sentimentIcon = '😊';
                    break;
                case 'negative':
                    sentimentLabel = 'Negativo';
                    sentimentIcon = '😞';
                    break;
                case 'neutral':
                    sentimentLabel = 'Neutral';
                    sentimentIcon = '😐';
                    break;
            }

            metadata.push(`Sentimiento: ${sentimentIcon} ${sentimentLabel} (${confidencePercent}%)`);
        }

        return metadata;
    }

    /**
     * Add team mood analysis section (facilitator only)
     */
    private addTeamMoodAnalysis(lines: string[], teamMoodReport: TeamMoodReport): void {
        lines.push('ANÁLISIS DEL ESTADO DE ÁNIMO DEL EQUIPO:');
        lines.push('='.repeat(50));
        lines.push('');

        const { metrics, insights, moodScore } = teamMoodReport;

        // Mood score and overall sentiment
        lines.push(`Puntuación General: ${moodScore}/10`);

        let moodLabel = '';
        if (moodScore >= 8.5) moodLabel = 'Excelente';
        else if (moodScore >= 7.5) moodLabel = 'Muy Bueno';
        else if (moodScore >= 6.5) moodLabel = 'Bueno';
        else if (moodScore >= 5.5) moodLabel = 'Regular';
        else if (moodScore >= 4.5) moodLabel = 'Preocupante';
        else moodLabel = 'Crítico';

        lines.push(`Estado General: ${moodLabel}`);
        lines.push('');

        // Overall metrics
        lines.push('MÉTRICAS GENERALES:');
        lines.push('-'.repeat(20));
        lines.push(`Total de tarjetas: ${metrics.totalCards}`);
        lines.push(`Tarjetas analizadas: ${metrics.analyzedCards} (${Math.round(metrics.analysisCompleteness)}%)`);
        lines.push(`Confianza promedio: ${Math.round(metrics.overallConfidence * 100)}%`);
        lines.push('');

        // Sentiment distribution
        lines.push('DISTRIBUCIÓN DE SENTIMIENTOS:');
        lines.push('-'.repeat(30));
        lines.push(`😊 Positivo: ${metrics.totalPositive} tarjetas (${metrics.positivePercentage}%)`);
        lines.push(`😐 Neutral: ${metrics.totalNeutral} tarjetas (${metrics.neutralPercentage}%)`);
        lines.push(`😞 Negativo: ${metrics.totalNegative} tarjetas (${metrics.negativePercentage}%)`);
        lines.push('');

        // Column breakdown
        if (metrics.columnMetrics && metrics.columnMetrics.length > 0) {
            lines.push('ANÁLISIS POR SECCIÓN:');
            lines.push('-'.repeat(25));

            metrics.columnMetrics.forEach(column => {
                lines.push(`${column.columnTitle}:`);
                lines.push(`  Total: ${column.total} tarjetas`);
                lines.push(`  😊 Positivo: ${column.positive} (${column.positivePercentage}%)`);
                lines.push(`  😐 Neutral: ${column.neutral} (${column.neutralPercentage}%)`);
                lines.push(`  😞 Negativo: ${column.negative} (${column.negativePercentage}%)`);
                lines.push(`  Confianza: ${Math.round(column.averageConfidence * 100)}%`);
                lines.push('');
            });
        }

        // Insights
        if (insights && insights.length > 0) {
            lines.push('INSIGHTS Y RECOMENDACIONES:');
            lines.push('-'.repeat(35));

            // Sort insights by severity (highest first)
            const sortedInsights = [...insights].sort((a, b) => b.severity - a.severity);

            sortedInsights.slice(0, 5).forEach((insight, index) => {
                const priorityLabel = insight.severity >= 4 ? '🚨 CRÍTICO' :
                    insight.severity >= 3 ? '⚠️ IMPORTANTE' :
                        insight.severity >= 2 ? '💡 INFORMACIÓN' : '✨ POSITIVO';

                lines.push(`${index + 1}. ${priorityLabel}: ${insight.title}`);
                lines.push(`   ${insight.description}`);

                if (insight.actionable) {
                    lines.push(`   🎯 Requiere acción del facilitador`);
                }

                lines.push('');
            });
        }

        lines.push('');
        lines.push('NOTA: Este análisis está basado en IA y es solo para facilitadores.');
        lines.push('Los datos de sentimiento se procesan localmente y no salen del navegador.');
        lines.push('');
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
            const totalVotes = groupCards.reduce((sum, card) => sum + (card.likes?.length ?? 0), 0);
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
