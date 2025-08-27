import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
    pdf
} from '@react-pdf/renderer';
import { Retrospective } from '../types/retrospective';
import { Card, CardGroup } from '../types/card';
import { FacilitatorNote } from '../types/facilitatorNotes';
import { ActionItem } from '../types/actionItem';
import { SentimentResult } from '../types/sentiment';
import { TeamMoodReport } from '../types/teamMood';
import { getExportColumns, getExportColumnOrder, getTemplateName, validateCardsForTemplate } from '../utils/exportColumns';
import { getCardColorHex } from '../utils/cardColors';

// Registra la fuente de emojis (esto se hace una sola vez en tu aplicación)
Font.registerEmojiSource({
    format: 'png',
    url: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/',
});

export interface ExportOptions {
    includeParticipants?: boolean;
    includeStatistics?: boolean;
    includeGroupDetails?: boolean;
    includeFacilitatorNotes?: boolean;
    includeActionItems?: boolean;
    logoUrl?: string;
    // New sentiment analysis options
    includeSentimentBadges?: boolean;
    includeTeamMoodAnalysis?: boolean;
}

export interface RetrospectiveExportData {
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

// Estilos para el PDF - Diseño Profesional
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        padding: 16,
        fontFamily: 'Helvetica'
    },

    // MAIN TITLE FRAME
    mainTitleFrame: {
        border: '2 solid #1f2937',
        marginBottom: 16,
        padding: 0
    },
    mainTitleInner: {
        border: '1 solid #1f2937',
        margin: 2,
        padding: 16,
        backgroundColor: '#f8fafc',
        textAlign: 'center'
    },
    mainTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4
    },
    mainSubtitle: {
        fontSize: 12,
        color: '#6b7280'
    },

    // INFO BOX
    infoBox: {
        border: '1 solid #3b82f6',
        borderRadius: 4,
        marginBottom: 12,
        padding: 0
    },
    infoBoxHeader: {
        backgroundColor: '#3b82f6',
        padding: 6,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4
    },
    infoBoxTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#ffffff'
    },
    infoBoxContent: {
        padding: 8,
        backgroundColor: '#f8fafc'
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 3
    },
    infoLabel: {
        fontSize: 9,
        color: '#374151',
        width: 120,
        fontWeight: 'bold'
    },
    infoValue: {
        fontSize: 9,
        color: '#1f2937',
        flex: 1
    },

    // STATS TABLE
    statsTable: {
        border: '1 solid #e5e7eb',
        borderRadius: 4,
        marginBottom: 12,
        backgroundColor: '#f8fafc'
    },
    statsTableHeader: {
        backgroundColor: '#374151',
        padding: 6,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4
    },
    statsTableTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center'
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 8
    },
    statCell: {
        width: '33.333%',
        alignItems: 'center',
        marginBottom: 6
    },
    statNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#3b82f6',
        marginBottom: 2
    },
    statLabel: {
        fontSize: 8,
        color: '#6b7280',
        textAlign: 'center'
    },

    // PARTICIPANTS LIST
    participantsSection: {
        border: '1 solid #d1d5db',
        borderRadius: 4,
        marginBottom: 12,
        padding: 0
    },
    participantsHeader: {
        backgroundColor: '#f3f4f6',
        padding: 6,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
        borderBottom: '1 solid #d1d5db'
    },
    participantsTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#374151'
    },
    participantsContent: {
        padding: 8
    },
    participantItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 3,
        paddingLeft: 4
    },
    participantNumber: {
        fontSize: 8,
        color: '#6b7280',
        width: 20
    },
    participantName: {
        fontSize: 9,
        color: '#1f2937'
    },

    // COLUMN SECTIONS
    columnFrame: {
        border: '1 solid #d1d5db',
        borderRadius: 4,
        marginBottom: 12,
        padding: 0
    },
    columnHeader: {
        backgroundColor: '#374151',
        padding: 8,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4
    },
    columnTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#ffffff'
    },
    columnDescription: {
        fontSize: 8,
        color: '#d1d5db',
        marginTop: 2
    },
    columnContent: {
        padding: 8,
        backgroundColor: '#fafafa'
    },

    // GROUP SECTIONS
    groupFrame: {
        border: '1 solid #fbbf24',
        borderRadius: 4,
        marginBottom: 8,
        padding: 0
    },
    groupHeader: {
        backgroundColor: '#fef3c7',
        padding: 6,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
        borderBottom: '1 solid #fbbf24'
    },
    groupTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#92400e'
    },
    groupStats: {
        fontSize: 8,
        color: '#a16207',
        marginTop: 2
    },
    groupContent: {
        padding: 6
    },

    // CARDS
    cardFrame: {
        border: '1 solid #e5e7eb',
        borderRadius: 3,
        marginBottom: 4,
        padding: 0,
        backgroundColor: '#ffffff'
    },
    cardHeader: {
        padding: 6,
        borderBottom: '1 solid #f3f4f6'
    },
    cardContent: {
        fontSize: 9,
        color: '#1f2937',
        lineHeight: 1.3
    },
    cardFooter: {
        backgroundColor: '#f8fafc',
        padding: 4,
        borderBottomLeftRadius: 3,
        borderBottomRightRadius: 3,
        borderTop: '1 solid #f3f4f6'
    },
    cardMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 7,
        color: '#6b7280'
    },
    cardMetaLeft: {
        flexDirection: 'row',
        gap: 8
    },

    // FACILITATOR NOTES
    facilitatorFrame: {
        border: '2 solid #fbbf24',
        borderRadius: 4,
        marginBottom: 12,
        padding: 0
    },
    facilitatorHeader: {
        backgroundColor: '#fbbf24',
        padding: 8,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4
    },
    facilitatorTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#ffffff'
    },
    facilitatorContent: {
        padding: 8,
        backgroundColor: '#fefce8'
    },
    noteFrame: {
        border: '1 solid #d97706',
        borderRadius: 3,
        marginBottom: 6,
        padding: 0,
        backgroundColor: '#ffffff'
    },
    noteHeader: {
        backgroundColor: '#fed7aa',
        padding: 4,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
        borderBottom: '1 solid #d97706'
    },
    noteDate: {
        fontSize: 7,
        color: '#9a3412'
    },
    noteContentBox: {
        padding: 6
    },
    noteText: {
        fontSize: 9,
        color: '#1f2937',
        lineHeight: 1.3
    },

    // ACTION ITEMS
    actionFrame: {
        border: '1 solid #10b981',
        borderRadius: 4,
        marginBottom: 12,
        padding: 0
    },
    actionHeader: {
        backgroundColor: '#10b981',
        padding: 8,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4
    },
    actionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#ffffff'
    },
    actionContent: {
        padding: 8,
        backgroundColor: '#f0fdf4'
    },
    actionItemFrame: {
        border: '1 solid #16a34a',
        borderRadius: 3,
        marginBottom: 6,
        padding: 0,
        backgroundColor: '#ffffff'
    },
    actionItemHeader: {
        backgroundColor: '#dcfce7',
        padding: 4,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
        borderBottom: '1 solid #16a34a'
    },
    actionResponsible: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#15803d'
    },
    actionItemContent: {
        padding: 6
    },
    actionItemText: {
        fontSize: 9,
        color: '#1f2937',
        marginBottom: 3
    },
    actionItemMeta: {
        fontSize: 7,
        color: '#6b7280',
        borderTop: '1 solid #f3f4f6',
        paddingTop: 3
    },

    // TEAM MOOD
    moodFrame: {
        border: '2 solid #8b5cf6',
        borderRadius: 4,
        marginBottom: 12,
        padding: 0
    },
    moodHeader: {
        backgroundColor: '#8b5cf6',
        padding: 8,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4
    },
    moodTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#ffffff'
    },
    moodContent: {
        padding: 8,
        backgroundColor: '#f5f3ff'
    },
    moodScoreBox: {
        border: '1 solid #a855f7',
        borderRadius: 3,
        backgroundColor: '#ffffff',
        padding: 6,
        marginBottom: 6,
        textAlign: 'center'
    },
    moodScore: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#7c3aed'
    },
    moodLabel: {
        fontSize: 8,
        color: '#6b46c1',
        marginTop: 2
    },
    moodInsight: {
        fontSize: 9,
        color: '#1f2937',
        marginBottom: 3,
        paddingLeft: 8
    },

    // FOOTER
    footerFrame: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        border: '1 solid #d1d5db',
        borderRadius: 4,
        padding: 0
    },
    footerContent: {
        backgroundColor: '#f8fafc',
        padding: 8,
        borderRadius: 4
    },
    footerText: {
        fontSize: 9,
        color: '#6b7280',
        textAlign: 'center',
        fontWeight: 'bold'
    },
    footerDate: {
        fontSize: 8,
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 2
    }
});

/**
 * Crea el componente del documento PDF usando createElement con diseño profesional
 */
const createRetrospectivePDF = (data: RetrospectiveExportData, options: ExportOptions) => {
    // Get dynamic columns based on template
    const templateId = data.retrospective.templateId;
    const columns = getExportColumns(templateId);
    const columnOrder = getExportColumnOrder(templateId);

    // Validate cards structure
    const validation = validateCardsForTemplate(data.cards, templateId);
    if (!validation.isValid) {
        console.warn('⚠️ Cards validation issues:', validation.issues);
    }

    const getColumnCards = (columnType: string) => {
        return data.cards.filter(card => card.column === columnType);
    };

    const getColumnGroups = (columnType: string) => {
        return data.groups.filter(group => group.column === columnType);
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Professional helper functions
    const createMainTitle = (title: string, subtitle: string) => {
        return React.createElement(View, { key: 'mainTitle', style: styles.mainTitleFrame }, [
            React.createElement(View, { key: 'inner', style: styles.mainTitleInner }, [
                React.createElement(Text, { key: 'title', style: styles.mainTitle },
                    `🚀 RETROSPECTIVA: ${title.toUpperCase()}`
                ),
                React.createElement(Text, { key: 'subtitle', style: styles.mainSubtitle }, subtitle)
            ])
        ]);
    };

    const createInfoBox = (title: string, infoItems: Array<{ label: string, value: string }>) => {
        return React.createElement(View, { key: 'infoBox', style: styles.infoBox }, [
            React.createElement(View, { key: 'header', style: styles.infoBoxHeader }, [
                React.createElement(Text, { key: 'title', style: styles.infoBoxTitle }, `ℹ️ ${title}`)
            ]),
            React.createElement(View, { key: 'content', style: styles.infoBoxContent },
                infoItems.map((item) =>
                    React.createElement(View, { key: `info-${item.label}`, style: styles.infoRow }, [
                        React.createElement(Text, { key: 'label', style: styles.infoLabel }, `📅 ${item.label}`),
                        React.createElement(Text, { key: 'value', style: styles.infoValue }, item.value)
                    ])
                )
            )
        ]);
    };

    const createStatsTable = (stats: any) => {
        const statsData = [
            { number: stats.totalCards, label: 'Total de tarjetas' },
            { number: stats.totalVotes, label: 'Total de votos' },
            { number: stats.totalReactions, label: 'Total de likes' },
            { number: stats.totalParticipants, label: 'Participantes activos' },
            { number: stats.totalGroups, label: 'Grupos formados' },
            { number: stats.totalActionItems, label: 'Elementos de acción' }
        ];

        return React.createElement(View, { key: 'statsTable', style: styles.statsTable }, [
            React.createElement(View, { key: 'header', style: styles.statsTableHeader }, [
                React.createElement(Text, { key: 'title', style: styles.statsTableTitle }, '📊 RESUMEN ESTADÍSTICO')
            ]),
            React.createElement(View, { key: 'grid', style: styles.statsGrid },
                statsData.map((stat) =>
                    React.createElement(View, { key: `stat-${stat.label}`, style: styles.statCell }, [
                        React.createElement(Text, { key: 'number', style: styles.statNumber },
                            stat.number.toString()
                        ),
                        React.createElement(Text, { key: 'label', style: styles.statLabel }, stat.label)
                    ])
                )
            )
        ]);
    };

    const createParticipantsList = () => {
        if (!options.includeParticipants || data.participants.length === 0) return null;

        return React.createElement(View, { key: 'participants', style: styles.participantsSection }, [
            React.createElement(View, { key: 'header', style: styles.participantsHeader }, [
                React.createElement(Text, { key: 'title', style: styles.participantsTitle },
                    `👥 PARTICIPANTES (${data.participants.length})`
                )
            ]),
            React.createElement(View, { key: 'content', style: styles.participantsContent },
                data.participants.map((participant, index) =>
                    React.createElement(View, { key: `participant-${participant.name}-${index}`, style: styles.participantItem }, [
                        React.createElement(Text, { key: 'number', style: styles.participantNumber },
                            `${String(index + 1).padStart(2, '0')}.`
                        ),
                        React.createElement(Text, { key: 'name', style: styles.participantName },
                            `👤 ${participant.name}`
                        )
                    ])
                )
            )
        ]);
    };

    const createCard = (card: Card) => {
        return React.createElement(View, { key: `card-${card.id}`, style: styles.cardFrame }, [
            React.createElement(View, { key: 'header', style: styles.cardHeader }, [
                React.createElement(Text, { key: 'content', style: styles.cardContent }, card.content)
            ]),
            React.createElement(View, { key: 'footer', style: styles.cardFooter }, [
                React.createElement(View, { key: 'meta', style: styles.cardMeta }, [
                    React.createElement(View, { key: 'left', style: styles.cardMetaLeft }, [
                        React.createElement(Text, { key: 'author' },
                            `ℹ️ Autor: ${card.createdBy || 'Anónimo'}`
                        ),
                        React.createElement(Text, { key: 'votes' },
                            `🗳️ Votos: ${card.likes?.length ?? 0}`
                        )
                    ]),
                    ...(options.includeSentimentBadges && data.sentimentResults?.has(card.id) ? [
                        React.createElement(Text, { key: 'sentiment' },
                            (() => {
                                const result = data.sentimentResults!.get(card.id);
                                if (!result) return '';

                                const getSentimentEmoji = (sentiment: string) => {
                                    if (sentiment === 'positive') return '😊';
                                    if (sentiment === 'negative') return '😞';
                                    return '😐';
                                };

                                return `🧠 Sentimiento: ${getSentimentEmoji(result.sentiment)} ${result.sentiment} (${(result.confidence * 100).toFixed(0)}%)`;
                            })()
                        )
                    ] : [])
                ])
            ])
        ]);
    };

    const createColumnSection = (columnType: string) => {
        const columnConfig = columns[columnType];
        const columnCards = getColumnCards(columnType);
        const columnGroups = getColumnGroups(columnType);

        if (columnCards.length === 0 || !columnConfig) return null;

        const groupElements = options.includeGroupDetails ? columnGroups.map((group) => {
            const groupCards = columnCards.filter(card => card.groupId === group.id);
            if (groupCards.length === 0) return null;

            return React.createElement(View, { key: `group-${group.id}`, style: styles.groupFrame }, [
                React.createElement(View, { key: 'header', style: styles.groupHeader }, [
                    React.createElement(Text, { key: 'title', style: styles.groupTitle },
                        `📁 ${group.title || 'Grupo sin título'}`
                    ),
                    React.createElement(Text, { key: 'stats', style: styles.groupStats },
                        `Tarjetas: ${groupCards.length} | Votos totales: ${groupCards.reduce((sum, card) => sum + (card.likes?.length ?? 0), 0)}`
                    )
                ]),
                React.createElement(View, { key: 'content', style: styles.groupContent },
                    groupCards.map(card => createCard(card))
                )
            ]);
        }).filter(Boolean) : [];

        const ungroupedCards = columnCards
            .filter(card => !card.groupId || !options.includeGroupDetails)
            .map(card => createCard(card));

        return React.createElement(View, { key: `column-${columnType}`, style: styles.columnFrame }, [
            React.createElement(View, { key: 'header', style: styles.columnHeader }, [
                React.createElement(Text, { key: 'title', style: styles.columnTitle },
                    `${columnConfig.title} (${columnCards.length} tarjetas)`
                ),
                React.createElement(Text, { key: 'description', style: styles.columnDescription },
                    columnConfig.description
                )
            ]),
            React.createElement(View, { key: 'content', style: styles.columnContent }, [
                ...groupElements,
                ...ungroupedCards
            ])
        ]);
    };

    const createFacilitatorNotes = () => {
        if (!options.includeFacilitatorNotes || !data.facilitatorNotes || data.facilitatorNotes.length === 0) {
            return null;
        }

        return React.createElement(View, { key: 'facilitatorNotes', style: styles.facilitatorFrame }, [
            React.createElement(View, { key: 'header', style: styles.facilitatorHeader }, [
                React.createElement(Text, { key: 'title', style: styles.facilitatorTitle },
                    '📋 NOTAS DEL FACILITADOR'
                )
            ]),
            React.createElement(View, { key: 'content', style: styles.facilitatorContent },
                data.facilitatorNotes.map((note, index) =>
                    React.createElement(View, {
                        key: note.id || `facilitator-${index}`,
                        style: styles.noteFrame
                    }, [
                        React.createElement(View, { key: 'header', style: styles.noteHeader }, [
                            React.createElement(Text, { key: 'date', style: styles.noteDate },
                                `📅 ${formatDate(note.timestamp)}`
                            )
                        ]),
                        React.createElement(View, { key: 'content', style: styles.noteContentBox }, [
                            React.createElement(Text, { key: 'text', style: styles.noteText }, note.content)
                        ])
                    ])
                )
            )
        ]);
    };

    const createActionItems = () => {
        if (!options.includeActionItems || !data.actionItems || data.actionItems.length === 0) {
            return null;
        }

        return React.createElement(View, { key: 'actionItems', style: styles.actionFrame }, [
            React.createElement(View, { key: 'header', style: styles.actionHeader }, [
                React.createElement(Text, { key: 'title', style: styles.actionTitle },
                    '🎯 ELEMENTOS DE ACCIÓN'
                )
            ]),
            React.createElement(View, { key: 'content', style: styles.actionContent },
                data.actionItems.map((item, index) =>
                    React.createElement(View, {
                        key: item.id || `action-${index}`,
                        style: styles.actionItemFrame
                    }, [
                        React.createElement(View, { key: 'header', style: styles.actionItemHeader }, [
                            React.createElement(Text, { key: 'responsible', style: styles.actionResponsible },
                                `👤 Responsable: ${item.assignedToName || 'Sin asignar'}`
                            ),
                            ...(item.dueDate ? [
                                React.createElement(Text, { key: 'dueDate', style: styles.actionResponsible },
                                    `⏰ Vencimiento: ${formatDate(item.dueDate)}`
                                )
                            ] : [])
                        ]),
                        React.createElement(View, { key: 'content', style: styles.actionItemContent }, [
                            React.createElement(Text, { key: 'text', style: styles.actionItemText }, item.content),
                            React.createElement(View, { key: 'meta', style: styles.actionItemMeta }, [
                                React.createElement(Text, { key: 'created' },
                                    `📅 Creado: ${formatDate(item.createdAt)}`
                                ),
                                React.createElement(Text, { key: 'updated' },
                                    `🔄 Actualizado: ${formatDate(item.createdAt)}`
                                )
                            ])
                        ])
                    ])
                )
            )
        ]);
    };

    const createTeamMoodAnalysis = () => {
        if (!options.includeTeamMoodAnalysis || !data.teamMoodReport) {
            return null;
        }

        const getMoodLabel = (score: number): string => {
            if (score >= 8.5) return 'Excelente';
            if (score >= 7.5) return 'Muy Bueno';
            if (score >= 6.5) return 'Bueno';
            if (score >= 5.5) return 'Regular';
            if (score >= 4.5) return 'Preocupante';
            return 'Crítico';
        };

        const getMoodEmoji = (score: number): string => {
            if (score >= 7.5) return '😊';
            if (score >= 5.5) return '😐';
            return '⚠️';
        };

        return React.createElement(View, { key: 'teamMood', style: styles.moodFrame }, [
            React.createElement(View, { key: 'header', style: styles.moodHeader }, [
                React.createElement(Text, { key: 'title', style: styles.moodTitle },
                    '🧠 ANÁLISIS DEL ESTADO DE ÁNIMO DEL EQUIPO'
                )
            ]),
            React.createElement(View, { key: 'content', style: styles.moodContent }, [
                React.createElement(View, { key: 'score', style: styles.moodScoreBox }, [
                    React.createElement(Text, { key: 'value', style: styles.moodScore },
                        `📊 Puntuación: ${data.teamMoodReport.moodScore}/10 (${getMoodEmoji(data.teamMoodReport.moodScore)} ${getMoodLabel(data.teamMoodReport.moodScore)})`
                    ),
                    React.createElement(Text, { key: 'confidence', style: styles.moodLabel },
                        `📈 Confianza promedio: ${Math.round(data.teamMoodReport.metrics.analysisCompleteness)}%`
                    )
                ]),
                React.createElement(Text, { key: 'distribution', style: styles.moodInsight },
                    `😊 Positivo: ${data.teamMoodReport.metrics.totalPositive} tarjetas (${data.teamMoodReport.metrics.positivePercentage}%)`
                ),
                React.createElement(Text, { key: 'neutral', style: styles.moodInsight },
                    `😐 Neutral: ${data.teamMoodReport.metrics.totalNeutral} tarjetas (${data.teamMoodReport.metrics.neutralPercentage}%)`
                ),
                React.createElement(Text, { key: 'negative', style: styles.moodInsight },
                    `😞 Negativo: ${data.teamMoodReport.metrics.totalNegative} tarjetas (${data.teamMoodReport.metrics.negativePercentage}%)`
                ),
                ...(data.teamMoodReport.insights.length > 0 ? [
                    React.createElement(Text, { key: 'insightsTitle', style: styles.moodInsight },
                        '💡 INSIGHTS Y RECOMENDACIONES'
                    ),
                    ...data.teamMoodReport.insights.map((insight, index) =>
                        React.createElement(Text, { key: `insight-${index}`, style: styles.moodInsight },
                            `• ${insight.description} (Nivel ${insight.severity})`
                        )
                    )
                ] : [])
            ])
        ]);
    };

    const createFooter = () => {
        return React.createElement(View, { key: 'footer', style: styles.footerFrame }, [
            React.createElement(View, { key: 'content', style: styles.footerContent }, [
                React.createElement(Text, { key: 'text', style: styles.footerText },
                    '🎯 GENERADO POR RETROROCKET 🎯'
                ),
                React.createElement(Text, { key: 'date', style: styles.footerDate },
                    `📅 ${formatDate(new Date())} | 🌐 retrorocket.com`
                )
            ])
        ]);
    };

    // Calculate statistics
    const calculateStatistics = () => {
        const totalCards = data.cards.length;
        const totalGroups = data.groups.length;
        const totalParticipants = data.participants.length;
        const totalVotes = data.cards.reduce((sum, card) => sum + (card.likes?.length ?? 0), 0);
        const totalReactions = data.cards.reduce((sum, card) => sum + (card.reactions?.length || 0), 0);
        const totalActionItems = data.actionItems?.length || 0;

        return {
            totalCards,
            totalGroups,
            totalParticipants,
            totalVotes,
            totalReactions,
            totalActionItems
        };
    };

    const stats = calculateStatistics();

    // Build main page elements
    const mainTitle = createMainTitle(data.retrospective.title,
        `Retrospectiva generada el ${formatDate(new Date())}`
    );

    const infoBox = createInfoBox('INFORMACIÓN GENERAL', [
        { label: 'Fecha de creación', value: formatDate(data.retrospective.createdAt) },
        { label: 'Participantes', value: `${data.participants.length} miembros del equipo` },
        ...(templateId ? [{ label: 'Plantilla', value: getTemplateName(templateId) }] : []),
        { label: 'Estado', value: data.retrospective.isActive ? 'Activa' : 'Finalizada' },
        ...(data.retrospective.description ? [{ label: 'Descripción', value: data.retrospective.description }] : [])
    ]);

    const statsTable = options.includeStatistics ? createStatsTable(stats) : null;
    const participantsList = createParticipantsList();
    const facilitatorNotes = createFacilitatorNotes();
    const actionItems = createActionItems();
    const teamMoodAnalysis = createTeamMoodAnalysis();

    const columnElements = columnOrder.map(createColumnSection).filter(Boolean);

    const footer = createFooter();

    // Build complete page
    const pageElements = [
        mainTitle,
        infoBox,
        ...(statsTable ? [statsTable] : []),
        ...(participantsList ? [participantsList] : []),
        ...columnElements,
        ...(facilitatorNotes ? [facilitatorNotes] : []),
        ...(actionItems ? [actionItems] : []),
        ...(teamMoodAnalysis ? [teamMoodAnalysis] : []),
        footer
    ].filter(Boolean);

    return React.createElement(Document, {}, [
        React.createElement(Page, { key: 'page', size: 'A4', style: styles.page }, pageElements)
    ]);
};

/**
 * Exporta la retrospectiva a PDF usando @react-pdf/renderer
 */
export const exportRetrospectiveToPdf = async (
    data: RetrospectiveExportData,
    options: ExportOptions = {}
): Promise<void> => {
    try {
        console.log('🚀 Starting PDF export for retrospective:', data.retrospective.title);

        // Log sentiment analysis features (PDF implementation pending)
        if (options.includeSentimentBadges && data.sentimentResults) {
            console.log('📊 Sentiment badges included for', data.sentimentResults.size, 'analyzed cards');
        }

        if (options.includeTeamMoodAnalysis && data.teamMoodReport) {
            console.log('🎯 Team mood analysis included with score:', data.teamMoodReport.moodScore);
        }

        // Crear el documento PDF
        const document = createRetrospectivePDF(data, options);

        // Generar el PDF
        const blob = await pdf(document).toBlob();

        // Crear link de descarga
        const url = URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = `retrospectiva-${data.retrospective.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;

        // Disparar descarga
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);

        // Limpiar URL
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Error exportando PDF:', error);
        throw error;
    }
};
