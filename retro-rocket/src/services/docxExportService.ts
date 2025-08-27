import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    ShadingType,
    Header,
    Footer,
    PageNumber,
    Table,
    TableRow,
    TableCell,
    BorderStyle,
    WidthType,
    UnderlineType
} from 'docx';
import { saveAs } from 'file-saver';
import { Retrospective } from '../types/retrospective';
import { Card, CardGroup } from '../types/card';
import { FacilitatorNote } from '../types/facilitatorNotes';
import { ActionItem } from '../types/actionItem';
import { SentimentResult } from '../types/sentiment';
import { TeamMoodReport } from '../types/teamMood';
import { getExportColumns, getExportColumnOrder, getTemplateName, validateCardsForTemplate } from '../utils/exportColumns';
import { getCardColorHex } from '../utils/cardColors';

export interface DocxExportOptions {
    includeParticipants?: boolean;
    includeStatistics?: boolean;
    includeCardAuthors?: boolean;
    includeReactions?: boolean;
    includeGroupDetails?: boolean;
    includeFacilitatorNotes?: boolean;
    facilitatorNotes?: string;
    includeActionItems?: boolean;
    // New sentiment analysis options
    includeSentimentBadges?: boolean;
    includeTeamMoodAnalysis?: boolean;
}

export interface RetrospectiveDocxData {
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

export class DocxExportService {

    /**
     * Export complete retrospective to DOCX
     */
    async exportRetrospective(
        data: RetrospectiveDocxData,
        options: DocxExportOptions = {}
    ): Promise<void> {
        try {
            console.log('Starting DOCX export for retrospective:', data.retrospective.title);

            // Create document sections
            const headerSections = this.createDocumentHeader(data.retrospective);
            const infoSections = this.createRetrospectiveInfo(data.retrospective, data.participants, options);
            const statsSections = options.includeStatistics ? this.createStatisticsSection(data.cards, data.groups, data.actionItems) : [];
            const contentSections = this.createColumnsContent(data.cards, data.groups, options, data.retrospective, data.sentimentResults);
            const notesSections = (options.includeFacilitatorNotes && options.facilitatorNotes) ?
                this.createFacilitatorNotesSection(options.facilitatorNotes) : [];
            const actionItemsSections = (options.includeActionItems && data.actionItems && data.actionItems.length > 0) ?
                this.createActionItemsSection(data.actionItems) : [];

            // Add team mood analysis section (facilitator only)
            const teamMoodSections = (options.includeTeamMoodAnalysis && data.teamMoodReport) ?
                this.createTeamMoodAnalysisSection(data.teamMoodReport) : [];

            // Flatten all sections into a single array
            const allSections = [
                ...headerSections,
                ...infoSections,
                ...statsSections,
                ...contentSections,
                ...notesSections,
                ...actionItemsSections,
                ...teamMoodSections
            ];

            // Create the document
            const doc = new Document({
                creator: 'RetroRocket',
                title: `Retrospectiva: ${data.retrospective.title}`,
                description: `Documento generado desde RetroRocket el ${new Date().toLocaleDateString('es-ES')}`,
                sections: [{
                    headers: {
                        default: new Header({
                            children: [
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: 'RetroRocket - Retrospectiva',
                                            size: 20,
                                            color: '3B82F6'
                                        })
                                    ],
                                    alignment: AlignmentType.RIGHT
                                })
                            ]
                        })
                    },
                    footers: {
                        default: new Footer({
                            children: [
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: `Generado el ${new Date().toLocaleDateString('es-ES')} por RetroRocket - Pagina `,
                                            size: 16,
                                            color: '6B7280'
                                        }),
                                        new TextRun({
                                            children: [PageNumber.CURRENT]
                                        })
                                    ],
                                    alignment: AlignmentType.CENTER
                                })
                            ]
                        })
                    },
                    children: allSections
                }]
            });

            // Generate and download the file
            const blob = await Packer.toBlob(doc);
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `retrospectiva-${data.retrospective.title.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.docx`;

            saveAs(blob, filename);
            console.log('DOCX export completed successfully:', filename);
        } catch (error) {
            console.error('Error exporting DOCX:', error);
            throw new Error('Failed to export DOCX');
        }
    }

    /**
     * Create document header with professional design
     */
    private createDocumentHeader(retrospective: Retrospective): Paragraph[] {
        return [
            // Professional main title with decorative frame
            new Paragraph({
                children: [
                    new TextRun({
                        text: '══════════════════════════════════════════════════════════════',
                        size: 24,
                        color: '3B82F6'
                    })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 100 }
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: '║                                                            ║',
                        size: 24,
                        color: '3B82F6'
                    })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 }
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: '║           🚀 RETRO ROCKET - RETROSPECTIVA           ║',
                        bold: true,
                        size: 28,
                        color: '3B82F6'
                    })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 }
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: '║                                                            ║',
                        size: 24,
                        color: '3B82F6'
                    })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 }
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: '══════════════════════════════════════════════════════════════',
                        size: 24,
                        color: '3B82F6'
                    })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 }
            }),

            // Professional subtitle
            new Paragraph({
                children: [
                    new TextRun({
                        text: retrospective.title,
                        bold: true,
                        size: 32,
                        color: '1F2937'
                    })
                ],
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { after: 150 }
            }),

            // Description with elegant styling
            ...(retrospective.description ? [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '┌─ 📝 DESCRIPCIÓN ─────────────────────────────────────────┐',
                            size: 18,
                            color: '6B7280'
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: retrospective.description,
                            size: 20,
                            color: '4B5563',
                            italics: true
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '└──────────────────────────────────────────────────────────┘',
                            size: 18,
                            color: '6B7280'
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 }
                })
            ] : [
                new Paragraph({
                    text: '',
                    spacing: { after: 300 }
                })
            ])
        ];
    }

    /**
     * Create professional information box
     */
    private createInfoBox(title: string, icon: string, items: Array<{ label: string, value: string }>): Paragraph[] {
        const sections: Paragraph[] = [];

        // Box header with icon and title
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: `┌─ ${icon} ${title.toUpperCase()} `,
                        bold: true,
                        size: 20,
                        color: '1F2937'
                    }),
                    new TextRun({
                        text: '─'.repeat(Math.max(0, 54 - title.length - icon.length - 4)),
                        size: 20,
                        color: '1F2937'
                    }),
                    new TextRun({
                        text: '┐',
                        size: 20,
                        color: '1F2937'
                    })
                ],
                spacing: { before: 300, after: 100 }
            })
        );

        // Box content with elegant formatting
        items.forEach((item) => {
            const dotsCount = Math.max(2, 45 - item.label.length - item.value.length);
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `│ `,
                            size: 18,
                            color: '1F2937'
                        }),
                        new TextRun({
                            text: item.label,
                            bold: true,
                            size: 18,
                            color: '374151'
                        }),
                        new TextRun({
                            text: ' ' + '·'.repeat(dotsCount) + ' ',
                            size: 18,
                            color: '9CA3AF'
                        }),
                        new TextRun({
                            text: item.value,
                            size: 18,
                            color: '1F2937'
                        }),
                        new TextRun({
                            text: ' │',
                            size: 18,
                            color: '1F2937'
                        })
                    ],
                    spacing: { after: 50 }
                })
            );
        });

        // Box footer
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: '└' + '─'.repeat(54) + '┘',
                        size: 20,
                        color: '1F2937'
                    })
                ],
                spacing: { after: 200 }
            })
        );

        return sections;
    }

    /**
     * Create professional retrospective information section
     */
    private createRetrospectiveInfo(
        retrospective: Retrospective,
        participants: Array<{ name: string; joinedAt: Date }>,
        options: DocxExportOptions
    ): Paragraph[] {
        const infoItems: Array<{ label: string, value: string }> = [];

        // Export date
        const exportDate = new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        infoItems.push({
            label: '📅 Fecha de exportación',
            value: exportDate
        });

        // Creation date
        if (retrospective.createdAt) {
            const createdDate = new Date(retrospective.createdAt).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            infoItems.push({
                label: '🎨 Creada el',
                value: createdDate
            });
        }

        // Template info
        const templateName = this.getTemplateDisplayName(retrospective.templateId);
        infoItems.push({
            label: '📋 Plantilla',
            value: templateName
        });

        // Participants count
        if (options.includeParticipants && participants.length > 0) {
            infoItems.push({
                label: '👥 Participantes',
                value: `${participants.length} miembros del equipo`
            });
        }

        return this.createInfoBox('Información General', 'ℹ️', infoItems);
    }

    /**
     * Get template display name
     */
    private getTemplateDisplayName(templateId?: string): string {
        const templateNames: Record<string, string> = {
            'default': 'Ayudó - Retrasó - Mejorar',
            'mad-sad-glad': 'Mad Sad Glad',
            'start-stop-continue': 'Start Stop Continue',
            '4ls': '4Ls (Liked, Learned, Lacked, Longed)',
            'rose-bud-thorn': 'Rose Bud Thorn'
        };
        return templateNames[templateId || 'default'] || 'Plantilla Personalizada';
    }

    /**
     * Create professional statistics section
     */
    private createStatisticsSection(cards: Card[], groups: CardGroup[], actionItems?: ActionItem[]): Paragraph[] {
        // Calculate statistics
        const totalCards = cards.length;
        const totalGroups = groups.length;
        const totalVotes = cards.reduce((sum, card) => sum + (card.likes?.length ?? 0), 0);
        const totalLikes = cards.reduce((sum, card) => sum + (card.likes?.length ?? 0), 0);
        const totalReactions = cards.reduce((sum, card) => sum + (card.reactions?.length ?? 0), 0);
        const totalActionItems = actionItems?.length ?? 0;

        const statsItems = [
            { label: '📝 Total de tarjetas', value: totalCards.toString() },
            { label: '🗂️ Grupos formados', value: totalGroups.toString() },
            { label: '🗳️ Total de votos', value: totalVotes.toString() },
            { label: '❤️ Total de likes', value: totalLikes.toString() },
            { label: '😊 Reacciones', value: totalReactions.toString() },
            { label: '🎯 Elementos de acción', value: totalActionItems.toString() }
        ];

        const sections: Paragraph[] = [];

        // Professional header
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: '┌─ 📊 RESUMEN ESTADÍSTICO ─────────────────────────────────┐',
                        bold: true,
                        size: 20,
                        color: '059669'
                    })
                ],
                spacing: { before: 400, after: 150 }
            })
        );

        // Empty line for better spacing
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: '│                                                          │',
                        size: 18,
                        color: '059669'
                    })
                ],
                spacing: { after: 50 }
            })
        );

        // Statistics in elegant format
        statsItems.forEach((stat) => {
            const dotsCount = Math.max(2, 35 - stat.label.length - stat.value.length);
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '│  ',
                            size: 18,
                            color: '059669'
                        }),
                        new TextRun({
                            text: stat.label,
                            size: 18,
                            color: '1F2937'
                        }),
                        new TextRun({
                            text: ' ' + '·'.repeat(dotsCount) + ' ',
                            size: 18,
                            color: '9CA3AF'
                        }),
                        new TextRun({
                            text: stat.value,
                            bold: true,
                            size: 18,
                            color: '059669'
                        }),
                        new TextRun({
                            text: '  │',
                            size: 18,
                            color: '059669'
                        })
                    ],
                    spacing: { after: 80 }
                })
            );
        });

        // Empty line for better spacing
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: '│                                                          │',
                        size: 18,
                        color: '059669'
                    })
                ],
                spacing: { after: 150 }
            })
        );

        // Footer
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: '└──────────────────────────────────────────────────────────┘',
                        size: 20,
                        color: '059669'
                    })
                ],
                spacing: { after: 400 }
            })
        );

        return sections;
    }

    /**
     * Create professional columns content sections
     */
    private createColumnsContent(
        cards: Card[],
        groups: CardGroup[],
        options: DocxExportOptions,
        retrospective: Retrospective,
        sentimentResults?: Map<string, SentimentResult>
    ): Paragraph[] {
        const sections: Paragraph[] = [];

        // Get dynamic columns based on template
        const templateId = retrospective.templateId;
        const columns = getExportColumns(templateId);
        const columnOrder = getExportColumnOrder(templateId);

        // Validate cards structure
        const validation = validateCardsForTemplate(cards, templateId);
        if (!validation.isValid) {
            console.warn('⚠️ Cards validation issues:', validation.issues);
        }

        columnOrder.forEach((columnId) => {
            const columnConfig = columns[columnId];
            const columnCards = cards.filter(card => card.column === columnId);
            const columnGroups = groups.filter(group => group.column === columnId);

            if (columnCards.length === 0 || !columnConfig) return;

            // Professional column header with frame
            const columnIcon = this.getColumnIcon(columnId);
            const headerText = `${columnIcon} ${columnConfig.title.toUpperCase()}`;
            const frameLength = Math.max(54, headerText.length + 6);
            const padding = Math.floor((frameLength - headerText.length - 2) / 2);

            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '┌' + '─'.repeat(frameLength) + '┐',
                            bold: true,
                            size: 22,
                            color: '7C3AED'
                        })
                    ],
                    spacing: { before: 500, after: 100 }
                })
            );

            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '│' + ' '.repeat(padding),
                            size: 22,
                            color: '7C3AED'
                        }),
                        new TextRun({
                            text: headerText,
                            bold: true,
                            size: 22,
                            color: '7C3AED'
                        }),
                        new TextRun({
                            text: ' '.repeat(frameLength - padding - headerText.length - 1) + '│',
                            size: 22,
                            color: '7C3AED'
                        })
                    ],
                    spacing: { after: 100 }
                })
            );

            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '└' + '─'.repeat(frameLength) + '┘',
                            size: 22,
                            color: '7C3AED'
                        })
                    ],
                    spacing: { after: 200 }
                })
            );

            // Column description
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: columnConfig.description,
                            size: 18,
                            color: '6B7280',
                            italics: true
                        })
                    ],
                    spacing: { after: 300 }
                })
            );

            // Add groups first
            columnGroups.forEach(group => {
                sections.push(...this.createGroupSection(group, cards, options, sentimentResults));
            });

            // Add ungrouped cards
            const ungroupedCards = columnCards.filter(card => !card.groupId);
            ungroupedCards.forEach(card => {
                sections.push(...this.createCardSection(card, false, false, options, sentimentResults));
            });
        });

        return sections;
    }

    /**
     * Get column icon based on column ID
     */
    private getColumnIcon(columnId: string): string {
        const iconMap: Record<string, string> = {
            'helped': '🟢',
            'hindered': '🔴',
            'improve': '🟡',
            'mad': '😠',
            'sad': '😞',
            'glad': '😊',
            'start': '🚀',
            'stop': '🛑',
            'continue': '🔄',
            'liked': '❤️',
            'learned': '🧠',
            'lacked': '⚠️',
            'longed': '✨',
            'rose': '🌹',
            'bud': '🌱',
            'thorn': '🥀'
        };
        return iconMap[columnId] || '📝';
    }

    /**
     * Create group section
     */
    private createGroupSection(
        group: CardGroup,
        allCards: Card[],
        options: DocxExportOptions,
        sentimentResults?: Map<string, SentimentResult>
    ): Paragraph[] {
        const groupCards = allCards.filter(card =>
            card.id === group.headCardId || group.memberCardIds.includes(card.id)
        );

        if (groupCards.length === 0) return [];

        const sections: Paragraph[] = [];

        // Group header
        const groupTitle = group.title ?? `Grupo de ${groupCards.length} tarjetas`;
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: groupTitle,
                        bold: true,
                        size: 22,
                        color: '3B82F6'
                    })
                ],
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 300, after: 150 }
            })
        );

        // Group stats
        if (options.includeGroupDetails) {
            const totalVotes = groupCards.reduce((sum, card) => sum + (card.likes?.length ?? 0), 0);
            const totalLikes = groupCards.reduce((sum, card) => sum + (card.likes?.length ?? 0), 0);

            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `${groupCards.length} tarjetas - ${totalVotes} votos - ${totalLikes} likes`,
                            size: 18,
                            color: '6B7280',
                            italics: true
                        })
                    ],
                    spacing: { after: 200 }
                })
            );
        }

        // Add group cards
        const headCard = groupCards.find(card => card.id === group.headCardId);
        const memberCards = groupCards.filter(card =>
            card.id !== group.headCardId && group.memberCardIds.includes(card.id)
        );

        // Add head card first
        if (headCard) {
            sections.push(...this.createCardSection(headCard, true, true, options, sentimentResults));
        }

        // Add member cards with indentation
        memberCards.forEach(card => {
            sections.push(...this.createCardSection(card, true, false, options, sentimentResults));
        });

        return sections;
    }

    /**
     * Create professional card section
     */
    private createCardSection(
        card: Card,
        isGrouped: boolean = false,
        isHeadCard: boolean = false,
        options?: DocxExportOptions,
        sentimentResults?: Map<string, SentimentResult>
    ): Paragraph[] {
        const sections: Paragraph[] = [];
        const cardColor = card.color ?? 'pastelWhite';
        const hexColor = getCardColorHex(cardColor);

        // Calculate indentation
        let leftIndent = 0;
        if (isGrouped) {
            leftIndent = isHeadCard ? 360 : 720;
        }

        // Professional card header
        const cardNumber = Math.random().toString().substring(2, 4); // Simple card numbering
        const cardTitle = isHeadCard ? '📝 TARJETA PRINCIPAL' : '📝 TARJETA';
        const headerText = `${cardTitle} ${cardNumber}`;

        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: `┌─ ${headerText} `,
                        bold: true,
                        size: 16,
                        color: '1F2937'
                    }),
                    new TextRun({
                        text: '─'.repeat(Math.max(0, 45 - headerText.length)),
                        size: 16,
                        color: '1F2937'
                    })
                ],
                spacing: { before: 200, after: 50 },
                indent: { left: leftIndent }
            })
        );

        // Card content with professional styling
        const cardParagraph = new Paragraph({
            children: [
                new TextRun({
                    text: '│ ',
                    size: 16,
                    color: '1F2937'
                }),
                new TextRun({
                    text: card.content?.trim() || '[Sin contenido]',
                    size: 18,
                    color: '374151'
                })
            ],
            spacing: { after: 100 },
            indent: { left: leftIndent },
            ...(hexColor && hexColor !== '#FFFFFF' ? {
                shading: {
                    fill: hexColor.substring(1), // Remove # from hex color
                    type: ShadingType.CLEAR
                }
            } : {})
        });

        sections.push(cardParagraph);

        // Card metadata in elegant format
        const metadata = this.buildCardMetadata(card);
        if (metadata.length > 0) {
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '│ ',
                            size: 14,
                            color: '1F2937'
                        }),
                        new TextRun({
                            text: `💡 ${metadata.join(' • ')}`,
                            size: 14,
                            color: '6B7280',
                            italics: true
                        })
                    ],
                    spacing: { after: 50 },
                    indent: { left: leftIndent }
                })
            );
        }

        // Add sentiment analysis if enabled
        if (options?.includeSentimentBadges && sentimentResults?.has(card.id)) {
            const sentimentInfo = this.buildSentimentInfo(sentimentResults.get(card.id)!);
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '│ ',
                            size: 14,
                            color: '1F2937'
                        }),
                        new TextRun({
                            text: sentimentInfo.text,
                            size: 14,
                            color: sentimentInfo.color,
                            italics: true
                        })
                    ],
                    spacing: { after: 50 },
                    indent: { left: leftIndent }
                })
            );
        }

        // Card footer
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: '└' + '─'.repeat(45),
                        size: 16,
                        color: '1F2937'
                    })
                ],
                spacing: { after: 150 },
                indent: { left: leftIndent }
            })
        );

        return sections;
    }

    /**
     * Build card metadata string
     */
    private buildCardMetadata(card: Card): string[] {
        const metadata: string[] = [];

        if (card.createdBy) {
            metadata.push(`Autor: ${card.createdBy}`);
        }

        if (card.likes && card.likes.length > 0) {
            metadata.push(`${card.likes.length} votos`);
        }

        if (card.reactions && card.reactions.length > 0) {
            const reactionCounts = card.reactions.reduce((acc: { [key: string]: number }, reaction) => {
                acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                return acc;
            }, {});
            const reactionText = Object.entries(reactionCounts)
                .map(([emoji, count]) => `${emoji} ${count}`)
                .join(' ');
            metadata.push(`Reacciones: ${reactionText}`);
        }

        return metadata;
    }

    /**
     * Build sentiment information
     */
    private buildSentimentInfo(sentimentResult: SentimentResult): { text: string; color: string } {
        const confidencePercent = Math.round(sentimentResult.confidence * 100);

        const sentimentConfig = {
            positive: { label: 'Positivo', icon: '😊', color: '059669' },
            negative: { label: 'Negativo', icon: '😞', color: 'DC2626' },
            neutral: { label: 'Neutral', icon: '😐', color: '6B7280' }
        };

        const config = sentimentConfig[sentimentResult.sentiment] || sentimentConfig.neutral;

        return {
            text: `${config.icon} Sentimiento: ${config.label} (${confidencePercent}% confianza)`,
            color: config.color
        };
    }

    /**
     * Create professional facilitator notes section
     */
    private createFacilitatorNotesSection(notes: string): Paragraph[] {
        const sections: Paragraph[] = [];

        // Professional header with frame
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: '┌─ 📋 NOTAS DEL FACILITADOR ──────────────────────────────┐',
                        bold: true,
                        size: 20,
                        color: 'D97706'
                    })
                ],
                spacing: { before: 500, after: 150 }
            })
        );

        // Notes content with proper formatting
        const noteLines = notes.split('\n');
        noteLines.forEach((line, index) => {
            if (line.trim()) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '│ ',
                                size: 18,
                                color: 'D97706'
                            }),
                            new TextRun({
                                text: line.trim(),
                                size: 18,
                                color: '374151'
                            })
                        ],
                        spacing: { after: 100 }
                    })
                );
            } else if (index < noteLines.length - 1) {
                // Add empty line for spacing
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '│',
                                size: 18,
                                color: 'D97706'
                            })
                        ],
                        spacing: { after: 50 }
                    })
                );
            }
        });

        // Footer
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: '└──────────────────────────────────────────────────────────┘',
                        size: 20,
                        color: 'D97706'
                    })
                ],
                spacing: { after: 400 }
            })
        );

        return sections;
    }

    /**
     * Create professional action items section
     */
    private createActionItemsSection(actionItems: ActionItem[]): Paragraph[] {
        const formatDate = (date: Date) => {
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        const sections: Paragraph[] = [];

        // Professional header
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: '┌─ 🎯 ELEMENTOS DE ACCIÓN ────────────────────────────────┐',
                        bold: true,
                        size: 20,
                        color: 'DC2626'
                    })
                ],
                spacing: { before: 500, after: 200 }
            })
        );

        actionItems.forEach((item, index) => {
            // Action item header
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '│ ',
                            size: 18,
                            color: 'DC2626'
                        }),
                        new TextRun({
                            text: `🎯 ACCIÓN ${(index + 1).toString().padStart(2, '0')}`,
                            bold: true,
                            size: 18,
                            color: 'DC2626'
                        }),
                        new TextRun({
                            text: ' ─'.repeat(30),
                            size: 16,
                            color: 'DC2626'
                        })
                    ],
                    spacing: { before: 150, after: 100 }
                })
            );

            // Action content
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '│ ',
                            size: 18,
                            color: 'DC2626'
                        }),
                        new TextRun({
                            text: item.content,
                            size: 18,
                            color: '1F2937'
                        })
                    ],
                    spacing: { after: 100 }
                })
            );

            // Assignment info
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '│   ',
                            size: 16,
                            color: 'DC2626'
                        }),
                        new TextRun({
                            text: '👤 Responsable: ',
                            bold: true,
                            size: 16,
                            color: '374151'
                        }),
                        new TextRun({
                            text: item.assignedToName || 'Sin asignar',
                            size: 16,
                            color: '6B7280'
                        })
                    ],
                    spacing: { after: 50 }
                })
            );

            // Due date if available
            if (item.dueDate) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '│   ',
                                size: 16,
                                color: 'DC2626'
                            }),
                            new TextRun({
                                text: '📅 Vencimiento: ',
                                bold: true,
                                size: 16,
                                color: '374151'
                            }),
                            new TextRun({
                                text: formatDate(item.dueDate),
                                size: 16,
                                color: '6B7280'
                            })
                        ],
                        spacing: { after: 50 }
                    })
                );
            }

            // Creation date
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '│   ',
                            size: 16,
                            color: 'DC2626'
                        }),
                        new TextRun({
                            text: '🕒 Creado: ',
                            bold: true,
                            size: 16,
                            color: '374151'
                        }),
                        new TextRun({
                            text: formatDate(item.createdAt),
                            size: 16,
                            color: '6B7280'
                        })
                    ],
                    spacing: { after: 100 }
                })
            );

            // Separator line between items (except for last item)
            if (index < actionItems.length - 1) {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '├' + '─'.repeat(54) + '┤',
                                size: 16,
                                color: 'DC2626'
                            })
                        ],
                        spacing: { after: 100 }
                    })
                );
            }
        });

        // Footer
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: '└──────────────────────────────────────────────────────────┘',
                        size: 20,
                        color: 'DC2626'
                    })
                ],
                spacing: { after: 400 }
            })
        );

        return sections;
    }

    /**
     * Create team mood analysis section (facilitator only)
     */
    /**
     * Create professional team mood analysis section
     */
    private createTeamMoodAnalysisSection(teamMoodReport: TeamMoodReport): Paragraph[] {
        const sections: Paragraph[] = [];
        const { metrics, insights, moodScore } = teamMoodReport;

        // Professional header with frame
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: '┌─ 🧠 ANÁLISIS DEL ESTADO DE ÁNIMO DEL EQUIPO ──────────┐',
                        bold: true,
                        size: 20,
                        color: '7C3AED'
                    })
                ],
                spacing: { before: 500, after: 200 }
            })
        );

        // Mood score with visual representation
        let moodLabel = '';
        let moodIcon = '';
        let moodColor = '';
        if (moodScore >= 8.5) {
            moodLabel = 'EXCELENTE';
            moodIcon = '🚀';
            moodColor = '10B981';
        } else if (moodScore >= 7.5) {
            moodLabel = 'MUY BUENO';
            moodIcon = '😊';
            moodColor = '059669';
        } else if (moodScore >= 6.5) {
            moodLabel = 'BUENO';
            moodIcon = '🙂';
            moodColor = '65A30D';
        } else if (moodScore >= 5.5) {
            moodLabel = 'REGULAR';
            moodIcon = '😐';
            moodColor = 'D97706';
        } else if (moodScore >= 4.5) {
            moodLabel = 'PREOCUPANTE';
            moodIcon = '😕';
            moodColor = 'DC2626';
        } else {
            moodLabel = 'CRÍTICO';
            moodIcon = '🚨';
            moodColor = 'B91C1C';
        }

        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: '│ ',
                        size: 18,
                        color: '7C3AED'
                    }),
                    new TextRun({
                        text: `${moodIcon} PUNTUACIÓN GENERAL: `,
                        bold: true,
                        size: 20,
                        color: '7C3AED'
                    }),
                    new TextRun({
                        text: `${moodScore}/10 - ${moodLabel}`,
                        bold: true,
                        size: 20,
                        color: moodColor
                    })
                ],
                spacing: { after: 200 }
            })
        );

        // Professional metrics section
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: '├─ 📊 MÉTRICAS GENERALES ───────────────────────────────┤',
                        bold: true,
                        size: 18,
                        color: '7C3AED'
                    })
                ],
                spacing: { before: 100, after: 150 }
            })
        );

        // Metrics content in professional boxes
        const metricsData = [
            { label: 'Total de tarjetas', value: metrics.totalCards, icon: '📝' },
            { label: 'Tarjetas analizadas', value: `${metrics.analyzedCards} (${Math.round(metrics.analysisCompleteness)}%)`, icon: '🔍' },
            { label: 'Confianza promedio', value: `${Math.round(metrics.overallConfidence * 100)}%`, icon: '🎯' }
        ];

        metricsData.forEach(metric => {
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '│ ',
                            size: 16,
                            color: '7C3AED'
                        }),
                        new TextRun({
                            text: `${metric.icon} ${metric.label}: `,
                            bold: true,
                            size: 16,
                            color: '374151'
                        }),
                        new TextRun({
                            text: metric.value.toString(),
                            size: 16,
                            color: '6B7280'
                        })
                    ],
                    spacing: { after: 75 }
                })
            );
        });

        // Sentiment distribution with visual bars
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: '├─ 💭 DISTRIBUCIÓN DE SENTIMIENTOS ─────────────────────┤',
                        bold: true,
                        size: 18,
                        color: '7C3AED'
                    })
                ],
                spacing: { before: 150, after: 150 }
            })
        );

        const sentiments = [
            { label: 'POSITIVO', count: metrics.totalPositive, percentage: metrics.positivePercentage, icon: '😊', color: '10B981' },
            { label: 'NEUTRAL', count: metrics.totalNeutral, percentage: metrics.neutralPercentage, icon: '😐', color: 'D97706' },
            { label: 'NEGATIVO', count: metrics.totalNegative, percentage: metrics.negativePercentage, icon: '😞', color: 'DC2626' }
        ];

        sentiments.forEach(sentiment => {
            const barLength = Math.round(sentiment.percentage / 5); // Scale bar to fit
            const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);

            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '│ ',
                            size: 16,
                            color: '7C3AED'
                        }),
                        new TextRun({
                            text: `${sentiment.icon} ${sentiment.label}: `,
                            bold: true,
                            size: 16,
                            color: sentiment.color
                        }),
                        new TextRun({
                            text: `${sentiment.count} (${sentiment.percentage}%)`,
                            size: 16,
                            color: '374151'
                        })
                    ],
                    spacing: { after: 50 }
                })
            );

            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '│   ',
                            size: 14,
                            color: '7C3AED'
                        }),
                        new TextRun({
                            text: bar,
                            size: 14,
                            color: sentiment.color
                        })
                    ],
                    spacing: { after: 100 }
                })
            );
        });

        // Column breakdown section
        if (metrics.columnMetrics && metrics.columnMetrics.length > 0) {
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '├─ 📋 ANÁLISIS POR SECCIÓN ─────────────────────────────┤',
                            bold: true,
                            size: 18,
                            color: '7C3AED'
                        })
                    ],
                    spacing: { before: 200, after: 150 }
                })
            );

            metrics.columnMetrics.forEach((column, index) => {
                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '│ ',
                                size: 16,
                                color: '7C3AED'
                            }),
                            new TextRun({
                                text: `📂 ${column.columnTitle}`,
                                bold: true,
                                size: 16,
                                color: '1F2937'
                            }),
                            new TextRun({
                                text: ` (${column.total} tarjetas)`,
                                size: 16,
                                color: '6B7280'
                            })
                        ],
                        spacing: { before: 100, after: 50 }
                    })
                );

                const columnSentiments = [
                    { label: 'Positivo', count: column.positive, percentage: column.positivePercentage, icon: '😊' },
                    { label: 'Neutral', count: column.neutral, percentage: column.neutralPercentage, icon: '😐' },
                    { label: 'Negativo', count: column.negative, percentage: column.negativePercentage, icon: '😞' }
                ];

                columnSentiments.forEach(sent => {
                    if (sent.count > 0) {
                        sections.push(
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: '│   ',
                                        size: 14,
                                        color: '7C3AED'
                                    }),
                                    new TextRun({
                                        text: `${sent.icon} ${sent.label}: ${sent.count} (${sent.percentage}%)`,
                                        size: 14,
                                        color: '6B7280'
                                    })
                                ],
                                spacing: { after: 25 }
                            })
                        );
                    }
                });

                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '│   ',
                                size: 14,
                                color: '7C3AED'
                            }),
                            new TextRun({
                                text: `🎯 Confianza: ${Math.round(column.averageConfidence * 100)}%`,
                                bold: true,
                                size: 14,
                                color: '059669'
                            })
                        ],
                        spacing: { after: 100 }
                    })
                );

                // Separator between columns (except last)
                if (index < metrics.columnMetrics.length - 1) {
                    sections.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: '├' + '─'.repeat(54) + '┤',
                                    size: 14,
                                    color: '7C3AED'
                                })
                            ],
                            spacing: { after: 50 }
                        })
                    );
                }
            });
        }

        // Insights and recommendations
        if (insights && insights.length > 0) {
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: '├─ 💡 INSIGHTS Y RECOMENDACIONES ──────────────────────┤',
                            bold: true,
                            size: 18,
                            color: '7C3AED'
                        })
                    ],
                    spacing: { before: 200, after: 150 }
                })
            );

            const sortedInsights = [...insights].sort((a, b) => b.severity - a.severity);

            sortedInsights.slice(0, 5).forEach((insight, index) => {
                let priorityData = { icon: '✨', label: 'POSITIVO', color: '059669' };
                if (insight.severity >= 4) {
                    priorityData = { icon: '🚨', label: 'CRÍTICO', color: 'B91C1C' };
                } else if (insight.severity >= 3) {
                    priorityData = { icon: '⚠️', label: 'IMPORTANTE', color: 'DC2626' };
                } else if (insight.severity >= 2) {
                    priorityData = { icon: '💡', label: 'INFORMACIÓN', color: '2563EB' };
                }

                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '│ ',
                                size: 16,
                                color: '7C3AED'
                            }),
                            new TextRun({
                                text: `${(index + 1).toString().padStart(2, '0')}. `,
                                bold: true,
                                size: 16,
                                color: '374151'
                            }),
                            new TextRun({
                                text: `${priorityData.icon} ${priorityData.label}: `,
                                bold: true,
                                size: 16,
                                color: priorityData.color
                            }),
                            new TextRun({
                                text: insight.title,
                                bold: true,
                                size: 16,
                                color: '1F2937'
                            })
                        ],
                        spacing: { before: 150, after: 50 }
                    })
                );

                sections.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: '│    ',
                                size: 14,
                                color: '7C3AED'
                            }),
                            new TextRun({
                                text: insight.description,
                                size: 14,
                                color: '374151'
                            })
                        ],
                        spacing: { after: insight.actionable ? 50 : 100 }
                    })
                );

                if (insight.actionable) {
                    sections.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: '│    ',
                                    size: 14,
                                    color: '7C3AED'
                                }),
                                new TextRun({
                                    text: '🎯 Requiere acción del facilitador',
                                    italics: true,
                                    bold: true,
                                    size: 14,
                                    color: '059669'
                                })
                            ],
                            spacing: { after: 100 }
                        })
                    );
                }

                // Separator between insights (except last)
                if (index < Math.min(sortedInsights.length, 5) - 1) {
                    sections.push(
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: '│' + '─'.repeat(54) + '│',
                                    size: 12,
                                    color: '7C3AED'
                                })
                            ],
                            spacing: { after: 100 }
                        })
                    );
                }
            });
        }

        // Professional footer with disclaimer
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: '├─ ℹ️ INFORMACIÓN IMPORTANTE ───────────────────────────┤',
                        bold: true,
                        size: 16,
                        color: '7C3AED'
                    })
                ],
                spacing: { before: 200, after: 100 }
            })
        );

        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: '│ ',
                        size: 14,
                        color: '7C3AED'
                    }),
                    new TextRun({
                        text: 'Este análisis está basado en IA y es solo para facilitadores.',
                        italics: true,
                        size: 14,
                        color: '6B7280'
                    })
                ],
                spacing: { after: 50 }
            })
        );

        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: '│ ',
                        size: 14,
                        color: '7C3AED'
                    }),
                    new TextRun({
                        text: 'Los datos de sentimiento se procesan localmente y no salen del navegador.',
                        italics: true,
                        size: 14,
                        color: '6B7280'
                    })
                ],
                spacing: { after: 100 }
            })
        );

        // Final footer
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: '└──────────────────────────────────────────────────────────┘',
                        size: 20,
                        color: '7C3AED'
                    })
                ],
                spacing: { after: 400 }
            })
        );

        return sections;
    }
}

/**
 * Main export function
 */
export const exportRetrospectiveToDocx = async (
    data: RetrospectiveDocxData,
    options: DocxExportOptions = {}
): Promise<void> => {
    const service = new DocxExportService();
    await service.exportRetrospective(data, options);
};
