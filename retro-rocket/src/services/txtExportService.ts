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

    // ============================================================================
    // PROFESSIONAL DESIGN SYSTEM - VISUAL COMPONENTS FOR ELEGANT TXT EXPORT
    // ============================================================================

    /**
     * Create elegant main title with decorative border
     */
    private createMainTitle(title: string): string[] {
        const lines: string[] = [];
        const upperTitle = title.toUpperCase();
        const titleLength = upperTitle.length;
        const totalWidth = Math.max(60, titleLength + 10);

        // Create decorative top border
        const topBorder = '╔' + '═'.repeat(totalWidth - 2) + '╗';
        const bottomBorder = '╚' + '═'.repeat(totalWidth - 2) + '╝';

        // Center the title
        const padding = Math.floor((totalWidth - titleLength - 4) / 2);
        const titleLine = '║' + ' '.repeat(padding) + '🚀 ' + upperTitle + ' '.repeat(totalWidth - titleLength - padding - 5) + '║';

        lines.push(topBorder);
        lines.push('║' + ' '.repeat(totalWidth - 2) + '║');
        lines.push(titleLine);
        lines.push('║' + ' '.repeat(totalWidth - 2) + '║');
        lines.push(bottomBorder);

        return lines;
    }

    /**
     * Create elegant section header
     */
    private createSectionHeader(title: string, icon: string = '📋'): string[] {
        const lines: string[] = [];
        const fullTitle = `${icon} ${title.toUpperCase()}`;
        const width = Math.max(50, fullTitle.length + 6);

        lines.push('');
        lines.push('┌' + '─'.repeat(width - 2) + '┐');
        lines.push('│ ' + fullTitle + ' '.repeat(width - fullTitle.length - 3) + '│');
        lines.push('└' + '─'.repeat(width - 2) + '┘');

        return lines;
    }

    /**
     * Create elegant subsection header
     */
    private createSubsectionHeader(title: string, icon: string = '▶️'): string[] {
        return ['', `${icon} ${title}`, '━'.repeat(Math.min(40, title.length + 10))];
    }

    /**
     * Create professional info box
     */
    private createInfoBox(items: { label: string; value: string; icon?: string }[]): string[] {
        const lines: string[] = [];
        const maxLabelWidth = Math.max(...items.map(item => item.label.length));

        lines.push('┌─ ℹ️  INFORMACIÓN GENERAL ' + '─'.repeat(25) + '┐');

        items.forEach(item => {
            const icon = item.icon || '•';
            const paddedLabel = item.label.padEnd(maxLabelWidth);
            lines.push(`│ ${icon} ${paddedLabel} : ${item.value}`.padEnd(54) + ' │');
        });

        lines.push('└' + '─'.repeat(52) + '┘');
        return lines;
    }

    /**
     * Create elegant statistics table
     */
    private createStatsTable(stats: { label: string; value: number | string; icon?: string }[]): string[] {
        const lines: string[] = [];
        const maxLabelWidth = Math.max(...stats.map(stat => stat.label.length));

        lines.push('┌─ 📊 RESUMEN ESTADÍSTICO ' + '─'.repeat(25) + '┐');
        lines.push('│' + ' '.repeat(52) + '│');

        stats.forEach(stat => {
            const icon = stat.icon || '▪️';
            const paddedLabel = stat.label.padEnd(maxLabelWidth);
            const value = typeof stat.value === 'number' ? stat.value.toString() : stat.value;
            const dotLength = Math.max(1, 35 - paddedLabel.length - value.length);
            lines.push(`│  ${icon} ${paddedLabel} ${'·'.repeat(dotLength)} ${value}`.padEnd(53) + '│');
        });

        lines.push('│' + ' '.repeat(52) + '│');
        lines.push('└' + '─'.repeat(52) + '┘');
        return lines;
    }

    /**
     * Create professional footer
     */
    private createFooter(): string[] {
        const lines: string[] = [];
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        lines.push('');
        lines.push('┌' + '─'.repeat(58) + '┐');
        lines.push('│' + ' '.repeat(58) + '│');
        lines.push('│' + ' '.repeat(15) + '🎯 GENERADO POR RETROROCKET 🎯' + ' '.repeat(12) + '│');
        lines.push('│' + ' '.repeat(58) + '│');
        lines.push(`│ 📅 ${dateStr}`.padEnd(59) + '│');
        lines.push('│ 🌐 retrorocket.com' + ' '.repeat(39) + '│');
        lines.push('│' + ' '.repeat(58) + '│');
        lines.push('└' + '─'.repeat(58) + '┘');

        return lines;
    }

    /**
     * Create elegant participant list
     */
    private createParticipantList(participants: Array<{ name: string; joinedAt: Date }>): string[] {
        const lines: string[] = [];

        lines.push(...this.createSectionHeader('PARTICIPANTES', '👥'));
        lines.push('');

        participants.forEach((participant, index) => {
            const number = (index + 1).toString().padStart(2, '0');
            lines.push(`  ${number}. 👤 ${participant.name}`);
        });

        return lines;
    }

    /**
     * Create elegant card display
     */
    private createCardDisplay(card: Card, index: number, options: TxtExportOptions, sentimentResults?: Map<string, SentimentResult>): string[] {
        const lines: string[] = [];
        const cardNumber = (index + 1).toString().padStart(2, '0');
        const content = card.content?.trim() || '[Sin contenido]';

        // Card header with number
        lines.push(`┌─ 📝 TARJETA ${cardNumber} ${'─'.repeat(35)}`);

        // Card content with proper wrapping
        const wrappedContent = this.wrapText(content, 50);
        wrappedContent.forEach(line => {
            lines.push(`│ ${line.padEnd(50)} │`);
        });

        // Metadata section
        const metadata = this.buildCardMetadata(card, options);
        if (metadata.length > 0 || (options.includeSentimentBadges && sentimentResults)) {
            lines.push('├' + '─'.repeat(52) + '┤');

            // Add regular metadata
            metadata.forEach(meta => {
                lines.push(`│ ℹ️  ${meta.padEnd(48)} │`);
            });

            // Add sentiment metadata if enabled
            if (options.includeSentimentBadges && sentimentResults) {
                const sentimentMeta = this.buildSentimentMetadata(card, sentimentResults);
                sentimentMeta.forEach(meta => {
                    lines.push(`│ 🧠 ${meta.padEnd(48)} │`);
                });
            }
        }

        lines.push('└' + '─'.repeat(52) + '┘');
        lines.push('');

        return lines;
    }

    /**
     * Wrap text to specified width
     */
    private wrapText(text: string, maxWidth: number): string[] {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        words.forEach(word => {
            if ((currentLine + word).length > maxWidth) {
                if (currentLine) {
                    lines.push(currentLine.trim());
                    currentLine = word + ' ';
                } else {
                    // Word is longer than maxWidth, force break
                    lines.push(word.substring(0, maxWidth));
                    currentLine = word.substring(maxWidth) + ' ';
                }
            } else {
                currentLine += word + ' ';
            }
        });

        if (currentLine.trim()) {
            lines.push(currentLine.trim());
        }

        return lines.length > 0 ? lines : [''];
    }

    /**
     * Build the complete text content with professional design
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

        // Build document sections
        this.buildHeader(lines, data, templateId);
        this.buildMainContent(lines, data, options, columns, columnOrder);
        this.buildFooter(lines);

        return lines.join('\n');
    }

    /**
     * Build header section
     */
    private buildHeader(lines: string[], data: RetrospectiveTxtData, templateId?: string): void {
        // Main title with elegant design
        lines.push(...this.createMainTitle(`RETROSPECTIVA: ${data.retrospective.title}`));
        lines.push('');

        // Basic information in professional info box
        const basicInfo: { label: string; value: string; icon?: string }[] = [];

        if (templateId) {
            basicInfo.push({
                label: 'Plantilla',
                value: getTemplateName(templateId),
                icon: '🎨'
            });
        }

        if (data.retrospective.createdAt) {
            basicInfo.push({
                label: 'Fecha de creación',
                value: new Date(data.retrospective.createdAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                icon: '📅'
            });
        }

        if (data.participants.length > 0) {
            basicInfo.push({
                label: 'Participantes',
                value: `${data.participants.length} miembros del equipo`,
                icon: '👥'
            });
        }

        if (basicInfo.length > 0) {
            lines.push(...this.createInfoBox(basicInfo));
            lines.push('');
        }

        // Description if exists
        if (data.retrospective.description) {
            lines.push(...this.createSectionHeader('DESCRIPCIÓN', '📝'));
            lines.push('');
            const wrappedDescription = this.wrapText(data.retrospective.description, 70);
            wrappedDescription.forEach(line => {
                lines.push(`  ${line}`);
            });
            lines.push('');
        }
    }

    /**
     * Build main content sections
     */
    private buildMainContent(lines: string[], data: RetrospectiveTxtData, options: TxtExportOptions, columns: Record<string, any>, columnOrder: string[]): void {
        // Statistics section  
        if (options.includeStatistics) {
            this.addProfessionalStatistics(lines, data, columns, columnOrder);
        }

        // Participants section
        if (options.includeParticipants && data.participants.length > 0) {
            lines.push(...this.createParticipantList(data.participants));
            lines.push('');
        }

        // Cards section - organized by columns
        this.addProfessionalCardsByColumn(lines, data, options, columns, columnOrder);

        // Groups section
        if (options.includeGroupDetails && data.groups.length > 0) {
            this.addProfessionalGroups(lines, data);
        }

        // Facilitator notes section
        if (options.includeFacilitatorNotes && data.facilitatorNotes && data.facilitatorNotes.length > 0) {
            this.addProfessionalFacilitatorNotes(lines, data.facilitatorNotes);
        }

        // Action items section
        if (options.includeActionItems && data.actionItems && data.actionItems.length > 0) {
            this.addProfessionalActionItems(lines, data.actionItems);
        }

        // Team mood analysis section (Facilitator only)
        if (options.includeTeamMoodAnalysis && data.teamMoodReport) {
            this.addProfessionalTeamMoodAnalysis(lines, data.teamMoodReport);
        }
    }

    /**
     * Build footer section
     */
    private buildFooter(lines: string[]): void {
        lines.push(...this.createFooter());
    }

    /**
     * Add professional statistics section
     */
    private addProfessionalStatistics(lines: string[], data: RetrospectiveTxtData, columns: Record<string, any>, columnOrder: string[]): void {
        const totalCards = data.cards.length;
        const totalVotes = data.cards.reduce((sum, card) => sum + (card.votes ?? 0), 0);
        const totalLikes = data.cards.reduce((sum, card) => sum + (card.likes?.length ?? 0), 0);

        const stats = [
            { label: 'Total de tarjetas', value: totalCards, icon: '📝' },
            { label: 'Total de votos', value: totalVotes, icon: '🗳️' },
            { label: 'Total de likes', value: totalLikes, icon: '❤️' },
            { label: 'Participantes activos', value: data.participants.length, icon: '👥' },
            { label: 'Grupos formados', value: data.groups.length, icon: '🔗' }
        ];

        if (data.actionItems && data.actionItems.length > 0) {
            stats.push({ label: 'Elementos de acción', value: data.actionItems.length, icon: '🎯' });
        }

        // Add cards per column
        columnOrder.forEach(columnId => {
            const columnCards = data.cards.filter(card => card.column === columnId);
            const columnConfig = columns[columnId];
            if (columnConfig && columnCards.length > 0) {
                stats.push({
                    label: columnConfig.title,
                    value: columnCards.length,
                    icon: columnConfig.icon || '📋'
                });
            }
        });

        lines.push(...this.createStatsTable(stats));
        lines.push('');
    }

    /**
     * Add professional cards organized by column
     */
    private addProfessionalCardsByColumn(lines: string[], data: RetrospectiveTxtData, options: TxtExportOptions, columns: Record<string, any>, columnOrder: string[]): void {
        columnOrder.forEach(columnId => {
            const columnConfig = columns[columnId];
            const columnCards = data.cards.filter(card => card.column === columnId);

            if (columnCards.length === 0 || !columnConfig) return;

            // Column header
            lines.push(...this.createSectionHeader(`${columnConfig.title} (${columnCards.length} tarjetas)`, columnConfig.icon));
            lines.push('');

            // Column description
            if (columnConfig.description) {
                const wrappedDesc = this.wrapText(columnConfig.description, 60);
                lines.push('┌─ 💡 DESCRIPCIÓN ' + '─'.repeat(35) + '┐');
                wrappedDesc.forEach(descLine => {
                    lines.push(`│ ${descLine.padEnd(50)} │`);
                });
                lines.push('└' + '─'.repeat(52) + '┘');
                lines.push('');
            }

            // Cards
            columnCards.forEach((card, index) => {
                lines.push(...this.createCardDisplay(card, index, options, data.sentimentResults));
            });

            lines.push('');
        });
    }

    /**
     * Add professional groups section
     */
    private addProfessionalGroups(lines: string[], data: RetrospectiveTxtData): void {
        lines.push(...this.createSectionHeader('AGRUPACIONES DE TARJETAS', '🔗'));
        lines.push('');

        data.groups.forEach((group, index) => {
            const groupTitle = group.title?.trim() || `Grupo ${index + 1}`;

            // Get all cards in this group
            const allCardIds = [group.headCardId, ...group.memberCardIds];
            const groupCards = data.cards.filter(card => allCardIds.includes(card.id));
            const headCard = groupCards.find(card => card.id === group.headCardId);
            const memberCards = groupCards.filter(card => card.id !== group.headCardId);

            // Group header
            lines.push(`┌─ 🏷️  GRUPO ${(index + 1).toString().padStart(2, '0')}: ${groupTitle.toUpperCase()} ${'─'.repeat(Math.max(0, 30 - groupTitle.length))}`);
            lines.push(`│ 📊 ${groupCards.length} tarjetas agrupadas`);
            lines.push('├' + '─'.repeat(52) + '┤');

            // Head card
            if (headCard) {
                const headContent = headCard.content?.trim() || '[Sin contenido]';
                const wrappedHead = this.wrapText(headContent, 45);
                lines.push('│ ⭐ TARJETA PRINCIPAL:' + ' '.repeat(30) + '│');
                wrappedHead.forEach(line => {
                    lines.push(`│   ${line.padEnd(48)} │`);
                });

                if (memberCards.length > 0) {
                    lines.push('├' + '─'.repeat(52) + '┤');
                    lines.push('│ 📎 TARJETAS AGRUPADAS:' + ' '.repeat(28) + '│');
                }
            }

            // Member cards
            memberCards.forEach((card, cardIndex) => {
                const cardContent = card.content?.trim() || '[Sin contenido]';
                const wrappedContent = this.wrapText(cardContent, 45);
                lines.push(`│   ${(cardIndex + 1).toString().padStart(2, '0')}. ${wrappedContent[0].padEnd(45)} │`);
                wrappedContent.slice(1).forEach(line => {
                    lines.push(`│       ${line.padEnd(44)} │`);
                });
            });

            // Group statistics
            const totalVotes = groupCards.reduce((sum, card) => sum + (card.likes?.length ?? 0), 0);
            const totalLikes = groupCards.reduce((sum, card) => sum + (card.likes?.length || 0), 0);

            if (totalVotes > 0 || totalLikes > 0) {
                lines.push('├' + '─'.repeat(52) + '┤');
                lines.push(`│ 📈 Estadísticas: ${totalVotes} votos, ${totalLikes} likes`.padEnd(53) + '│');
            }

            lines.push('└' + '─'.repeat(52) + '┘');
            lines.push('');
        });
    }

    /**
     * Add professional facilitator notes section
     */
    private addProfessionalFacilitatorNotes(lines: string[], facilitatorNotes: FacilitatorNote[]): void {
        lines.push(...this.createSectionHeader('NOTAS DEL FACILITADOR', '📋'));
        lines.push('');

        facilitatorNotes.forEach((note, index) => {
            const noteNumber = (index + 1).toString().padStart(2, '0');
            const timestamp = note.timestamp.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            lines.push(`┌─ 📝 NOTA ${noteNumber} ${'─'.repeat(40)}`);
            lines.push(`│ 📅 ${timestamp.padEnd(48)} │`);
            lines.push('├' + '─'.repeat(52) + '┤');

            const wrappedContent = this.wrapText(note.content, 50);
            wrappedContent.forEach(line => {
                lines.push(`│ ${line.padEnd(50)} │`);
            });

            lines.push('└' + '─'.repeat(52) + '┘');
            lines.push('');
        });
    }

    /**
     * Add professional action items section
     */
    private addProfessionalActionItems(lines: string[], actionItems: ActionItem[]): void {
        lines.push(...this.createSectionHeader('ELEMENTOS DE ACCIÓN', '🎯'));
        lines.push('');

        actionItems.forEach((actionItem, index) => {
            const actionNumber = (index + 1).toString().padStart(2, '0');
            const assignee = actionItem.assignedToName || 'Sin asignar';

            lines.push(`┌─ 🎯 ACCIÓN ${actionNumber} ${'─'.repeat(38)}`);
            lines.push(`│ 👤 Responsable: ${assignee.padEnd(33)} │`);

            if (actionItem.dueDate) {
                const dueDate = new Date(actionItem.dueDate).toLocaleDateString('es-ES');
                lines.push(`│ ⏰ Vencimiento: ${dueDate.padEnd(32)} │`);
            }

            lines.push('├' + '─'.repeat(52) + '┤');

            const wrappedContent = this.wrapText(actionItem.content, 50);
            wrappedContent.forEach(line => {
                lines.push(`│ ${line.padEnd(50)} │`);
            });

            // Timestamps
            if (actionItem.createdAt) {
                const created = new Date(actionItem.createdAt).toLocaleDateString('es-ES');
                lines.push('├' + '─'.repeat(52) + '┤');
                lines.push(`│ 📅 Creado: ${created.padEnd(39)} │`);
            }

            if (actionItem.updatedAt && actionItem.updatedAt !== actionItem.createdAt) {
                const updated = new Date(actionItem.updatedAt).toLocaleDateString('es-ES');
                lines.push(`│ 🔄 Actualizado: ${updated.padEnd(34)} │`);
            }

            lines.push('└' + '─'.repeat(52) + '┘');
            lines.push('');
        });
    }

    /**
     * Get mood label based on score
     */
    private getMoodLabel(moodScore: number): string {
        if (moodScore >= 8.5) return '🌟 Excelente';
        if (moodScore >= 7.5) return '🎉 Muy Bueno';
        if (moodScore >= 6.5) return '👍 Bueno';
        if (moodScore >= 5.5) return '😐 Regular';
        if (moodScore >= 4.5) return '⚠️ Preocupante';
        return '🚨 Crítico';
    }

    /**
     * Get priority label for insights
     */
    private getPriorityInfo(severity: number): { icon: string; label: string } {
        if (severity >= 4) return { icon: '🚨', label: 'CRÍTICO' };
        if (severity >= 3) return { icon: '⚠️', label: 'IMPORTANTE' };
        if (severity >= 2) return { icon: '💡', label: 'INFORMACIÓN' };
        return { icon: '✨', label: 'POSITIVO' };
    }

    /**
     * Add professional team mood analysis section (facilitator only) - Simplified
     */
    private addProfessionalTeamMoodAnalysis(lines: string[], teamMoodReport: TeamMoodReport): void {
        lines.push(...this.createSectionHeader('ANÁLISIS DEL ESTADO DE ÁNIMO DEL EQUIPO', '🧠'));
        lines.push('');

        const { metrics, insights, moodScore } = teamMoodReport;
        const moodLabel = this.getMoodLabel(moodScore);

        // Mood score box
        lines.push('┌─ 🎯 PUNTUACIÓN GENERAL ' + '─'.repeat(26) + '┐');
        lines.push(`│ 📊 Puntuación: ${moodScore}/10 (${moodLabel})`.padEnd(53) + '│');
        lines.push(`│ 📈 Confianza promedio: ${Math.round(metrics.overallConfidence * 100)}%`.padEnd(53) + '│');
        lines.push(`│ 🔍 Tarjetas analizadas: ${metrics.analyzedCards}/${metrics.totalCards} (${Math.round(metrics.analysisCompleteness)}%)`.padEnd(53) + '│');
        lines.push('└' + '─'.repeat(52) + '┘');
        lines.push('');

        this.addSentimentDistribution(lines, metrics);
        this.addColumnMetrics(lines, metrics);
        this.addInsightsAndRecommendations(lines, insights);

        // Professional disclaimer
        lines.push('┌─ ⚠️  NOTA IMPORTANTE ' + '─'.repeat(29) + '┐');
        lines.push('│ Este análisis está basado en IA y es solo para'.padEnd(53) + '│');
        lines.push('│ facilitadores. Los datos se procesan localmente'.padEnd(53) + '│');
        lines.push('│ y no salen del navegador.'.padEnd(53) + '│');
        lines.push('└' + '─'.repeat(52) + '┘');
        lines.push('');
    }

    /**
     * Add sentiment distribution section
     */
    private addSentimentDistribution(lines: string[], metrics: any): void {
        lines.push('┌─ 😊 DISTRIBUCIÓN DE SENTIMIENTOS ' + '─'.repeat(16) + '┐');
        lines.push(`│ 😊 Positivo: ${metrics.totalPositive} tarjetas (${metrics.positivePercentage}%)`.padEnd(53) + '│');
        lines.push(`│ 😐 Neutral: ${metrics.totalNeutral} tarjetas (${metrics.neutralPercentage}%)`.padEnd(53) + '│');
        lines.push(`│ 😞 Negativo: ${metrics.totalNegative} tarjetas (${metrics.negativePercentage}%)`.padEnd(53) + '│');
        lines.push('└' + '─'.repeat(52) + '┘');
        lines.push('');
    }

    /**
     * Add column metrics section
     */
    private addColumnMetrics(lines: string[], metrics: any): void {
        if (metrics.columnMetrics && metrics.columnMetrics.length > 0) {
            lines.push(...this.createSubsectionHeader('ANÁLISIS POR SECCIÓN', '📋'));
            lines.push('');

            metrics.columnMetrics.forEach((column: any) => {
                lines.push(`┌─ 📁 ${column.columnTitle.toUpperCase()} ${'─'.repeat(Math.max(0, 45 - column.columnTitle.length))}`);
                lines.push(`│ 📝 Total: ${column.total} tarjetas`.padEnd(53) + '│');
                lines.push(`│ 😊 Positivo: ${column.positive} (${column.positivePercentage}%)`.padEnd(53) + '│');
                lines.push(`│ 😐 Neutral: ${column.neutral} (${column.neutralPercentage}%)`.padEnd(53) + '│');
                lines.push(`│ 😞 Negativo: ${column.negative} (${column.negativePercentage}%)`.padEnd(53) + '│');
                lines.push(`│ 🎯 Confianza: ${Math.round(column.averageConfidence * 100)}%`.padEnd(53) + '│');
                lines.push('└' + '─'.repeat(52) + '┘');
                lines.push('');
            });
        }
    }

    /**
     * Add insights and recommendations section
     */
    private addInsightsAndRecommendations(lines: string[], insights: any[]): void {
        if (insights && insights.length > 0) {
            lines.push(...this.createSubsectionHeader('INSIGHTS Y RECOMENDACIONES', '💡'));
            lines.push('');

            const sortedInsights = [...insights].sort((a, b) => b.severity - a.severity);

            sortedInsights.slice(0, 5).forEach((insight, index) => {
                const { icon, label } = this.getPriorityInfo(insight.severity);

                lines.push(`┌─ ${icon} INSIGHT ${(index + 1).toString().padStart(2, '0')}: ${label} ${'─'.repeat(Math.max(0, 25 - label.length))}`);

                const wrappedTitle = this.wrapText(insight.title, 48);
                wrappedTitle.forEach(line => {
                    lines.push(`│ 📌 ${line.padEnd(48)} │`);
                });

                lines.push('├' + '─'.repeat(52) + '┤');

                const wrappedDesc = this.wrapText(insight.description, 48);
                wrappedDesc.forEach(line => {
                    lines.push(`│ ${line.padEnd(50)} │`);
                });

                if (insight.actionable) {
                    lines.push('├' + '─'.repeat(52) + '┤');
                    lines.push('│ 🎯 Requiere acción del facilitador'.padEnd(53) + '│');
                }

                lines.push('└' + '─'.repeat(52) + '┘');
                lines.push('');
            });
        }
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
