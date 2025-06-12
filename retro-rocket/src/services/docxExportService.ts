import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    Table,
    TableRow,
    TableCell,
    WidthType,
    ShadingType,
    Header,
    Footer,
    PageNumber
} from 'docx';
import { saveAs } from 'file-saver';
import { Retrospective } from '../types/retrospective';
import { Card, CardGroup } from '../types/card';
import { COLUMNS, COLUMN_ORDER } from '../utils/constants';
import { getCardColorHex } from '../utils/cardColors';

export interface DocxExportOptions {
    includeParticipants?: boolean;
    includeStatistics?: boolean;
    includeGroupDetails?: boolean;
    includeFacilitatorNotes?: boolean;
    facilitatorNotes?: string;
}

export interface RetrospectiveDocxData {
    retrospective: Retrospective;
    cards: Card[];
    groups: CardGroup[];
    participants: Array<{ name: string; joinedAt: Date }>;
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
            const statsSections = options.includeStatistics ? this.createStatisticsSection(data.cards, data.groups) : [];
            const contentSections = this.createColumnsContent(data.cards, data.groups, options);
            const notesSections = (options.includeFacilitatorNotes && options.facilitatorNotes) ?
                this.createFacilitatorNotesSection(options.facilitatorNotes) : [];

            // Flatten all sections into a single array
            const allSections = [
                ...headerSections,
                ...infoSections,
                ...statsSections,
                ...contentSections,
                ...notesSections
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
     * Create document header with title and date
     */
    private createDocumentHeader(retrospective: Retrospective): Paragraph[] {
        return [
            new Paragraph({
                children: [
                    new TextRun({
                        text: 'RetroRocket',
                        bold: true,
                        size: 32,
                        color: '3B82F6'
                    })
                ],
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 }
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: retrospective.title,
                        bold: true,
                        size: 28
                    })
                ],
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 }
            }),
            ...(retrospective.description ? [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: retrospective.description,
                            size: 22,
                            color: '4B5563',
                            italics: true
                        })
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 }
                })
            ] : [])
        ];
    }

    /**
     * Create retrospective information section
     */
    private createRetrospectiveInfo(
        retrospective: Retrospective,
        participants: Array<{ name: string; joinedAt: Date }>,
        options: DocxExportOptions
    ): Paragraph[] {
        const sections: Paragraph[] = [
            new Paragraph({
                children: [
                    new TextRun({
                        text: 'Informacion de la Retrospectiva',
                        bold: true,
                        size: 24
                    })
                ],
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 200 }
            })
        ];

        // Export date
        const exportDate = new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        sections.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: 'Fecha de exportacion: ',
                        bold: true
                    }),
                    new TextRun({
                        text: exportDate
                    })
                ],
                spacing: { after: 100 }
            })
        );

        // Creation date
        if (retrospective.createdAt) {
            const createdDate = new Date(retrospective.createdAt).toLocaleDateString('es-ES');
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: 'Retrospectiva creada: ',
                            bold: true
                        }),
                        new TextRun({
                            text: createdDate
                        })
                    ],
                    spacing: { after: 100 }
                })
            );
        }

        // Participants
        if (options.includeParticipants && participants.length > 0) {
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `Participantes (${participants.length}): `,
                            bold: true
                        }),
                        new TextRun({
                            text: participants.map(p => p.name).join(', ')
                        })
                    ],
                    spacing: { after: 100 }
                })
            );
        }

        return sections;
    }

    /**
     * Create statistics section
     */
    private createStatisticsSection(cards: Card[], groups: CardGroup[]): Paragraph[] {
        const sections: Paragraph[] = [
            new Paragraph({
                children: [
                    new TextRun({
                        text: 'Estadisticas',
                        bold: true,
                        size: 24
                    })
                ],
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 200 }
            })
        ];

        // Calculate statistics
        const totalCards = cards.length;
        const totalGroups = groups.length;
        const totalVotes = cards.reduce((sum, card) => sum + (card.votes ?? 0), 0);
        const totalLikes = cards.reduce((sum, card) => sum + (card.likes?.length ?? 0), 0);
        const totalReactions = cards.reduce((sum, card) => sum + (card.reactions?.length ?? 0), 0);

        // Create statistics table
        const statsTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                // Header row
                new TableRow({
                    children: [
                        new TableCell({
                            children: [new Paragraph({
                                children: [new TextRun({ text: 'Metrica', bold: true })]
                            })],
                            shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }
                        }),
                        new TableCell({
                            children: [new Paragraph({
                                children: [new TextRun({ text: 'Valor', bold: true })]
                            })],
                            shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }
                        })
                    ]
                }),
                // Data rows
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Total de tarjetas' })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: totalCards.toString() })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Total de grupos' })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: totalGroups.toString() })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Total de votos' })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: totalVotes.toString() })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Total de likes' })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: totalLikes.toString() })] })] })
                    ]
                }),
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Total de reacciones' })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: totalReactions.toString() })] })] })
                    ]
                })
            ]
        });

        sections.push(
            new Paragraph({
                children: [statsTable],
                spacing: { after: 300 }
            })
        );

        return sections;
    }

    /**
     * Create columns content sections
     */
    private createColumnsContent(cards: Card[], groups: CardGroup[], options: DocxExportOptions): Paragraph[] {
        const sections: Paragraph[] = [];

        COLUMN_ORDER.forEach((columnId) => {
            const column = COLUMNS[columnId];
            const columnCards = cards.filter(card => card.column === columnId);
            const columnGroups = groups.filter(group => group.column === columnId);

            if (columnCards.length === 0) return;

            // Column title
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: column.title,
                            bold: true,
                            size: 24
                        })
                    ],
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 400, after: 200 }
                })
            );

            // Column description
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: column.description,
                            size: 20,
                            color: '6B7280',
                            italics: true
                        })
                    ],
                    spacing: { after: 300 }
                })
            );

            // Add groups first
            columnGroups.forEach(group => {
                sections.push(...this.createGroupSection(group, cards, options));
            });

            // Add ungrouped cards
            const ungroupedCards = columnCards.filter(card => !card.groupId);
            ungroupedCards.forEach(card => {
                sections.push(...this.createCardSection(card, false));
            });
        });

        return sections;
    }

    /**
     * Create group section
     */
    private createGroupSection(group: CardGroup, allCards: Card[], options: DocxExportOptions): Paragraph[] {
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
            const totalVotes = groupCards.reduce((sum, card) => sum + (card.votes ?? 0), 0);
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
            sections.push(...this.createCardSection(headCard, true, true));
        }

        // Add member cards with indentation
        memberCards.forEach(card => {
            sections.push(...this.createCardSection(card, true, false));
        });

        return sections;
    }

    /**
     * Create card section
     */
    private createCardSection(card: Card, isGrouped: boolean = false, isHeadCard: boolean = false): Paragraph[] {
        const sections: Paragraph[] = [];

        // Card content with background color
        const cardColor = card.color ?? 'pastelWhite';
        const hexColor = getCardColorHex(cardColor);

        // Calculate indentation
        let leftIndent = 0;
        if (isGrouped) {
            leftIndent = isHeadCard ? 360 : 720;
        }

        const cardParagraph = new Paragraph({
            children: [
                ...(isHeadCard ? [
                    new TextRun({
                        text: '[Principal] ',
                        bold: true,
                        size: 16,
                        color: '3B82F6'
                    })
                ] : []),
                new TextRun({
                    text: card.content,
                    size: 20
                })
            ],
            spacing: { before: 150, after: 100 },
            indent: { left: leftIndent },
            ...(hexColor && hexColor !== '#FFFFFF' ? {
                shading: {
                    fill: hexColor.substring(1), // Remove # from hex color
                    type: ShadingType.CLEAR
                }
            } : {})
        });

        sections.push(cardParagraph);

        // Card metadata
        const metadata = [];
        if (card.createdBy) metadata.push(`Autor: ${card.createdBy}`);
        if (card.votes && card.votes > 0) metadata.push(`${card.votes} votos`);
        if (card.likes && card.likes.length > 0) metadata.push(`${card.likes.length} likes`);
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

        if (metadata.length > 0) {
            sections.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: metadata.join(' | '),
                            size: 16,
                            color: '6B7280',
                            italics: true
                        })
                    ],
                    spacing: { after: 150 },
                    indent: { left: leftIndent }
                })
            );
        }

        return sections;
    }

    /**
     * Create facilitator notes section
     */
    private createFacilitatorNotesSection(notes: string): Paragraph[] {
        return [
            new Paragraph({
                children: [
                    new TextRun({
                        text: 'Notas del Facilitador',
                        bold: true,
                        size: 24
                    })
                ],
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 200 }
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: notes,
                        size: 20
                    })
                ],
                spacing: { after: 300 }
            })
        ];
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
