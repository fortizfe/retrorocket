import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
    pdf,
    Image
} from '@react-pdf/renderer';
import { Retrospective } from '../types/retrospective';
import { Card, CardGroup } from '../types/card';
import { FacilitatorNote } from '../types/facilitatorNotes';
import { COLUMNS, COLUMN_ORDER } from '../utils/constants';
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
    logoUrl?: string;
}

export interface RetrospectiveExportData {
    retrospective: Retrospective;
    cards: Card[];
    groups: CardGroup[];
    participants: Array<{ name: string; joinedAt: Date }>;
    facilitatorNotes?: FacilitatorNote[];
}

// Estilos para el PDF
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        padding: 20,
        fontFamily: 'Helvetica'
    },
    header: {
        flexDirection: 'row',
        marginBottom: 20,
        borderBottom: '2 solid #e5e7eb',
        paddingBottom: 15
    },
    logo: {
        width: 40,
        height: 40,
        marginRight: 15
    },
    headerContent: {
        flex: 1,
        flexDirection: 'column'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4
    },
    subtitle: {
        fontSize: 12,
        color: '#6b7280'
    },
    section: {
        marginBottom: 20
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 10,
        borderBottom: '1 solid #d1d5db',
        paddingBottom: 5
    },
    retrospectiveInfo: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
        marginBottom: 15
    },
    infoItem: {
        flexDirection: 'column',
        minWidth: 120
    },
    infoLabel: {
        fontSize: 10,
        color: '#6b7280',
        marginBottom: 2
    },
    infoValue: {
        fontSize: 12,
        color: '#1f2937',
        fontWeight: 'bold'
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#f9fafb',
        padding: 15,
        borderRadius: 8,
        marginBottom: 15
    },
    statItem: {
        flexDirection: 'column',
        alignItems: 'center'
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#3b82f6'
    },
    statLabel: {
        fontSize: 10,
        color: '#6b7280',
        marginTop: 2
    },
    columnSection: {
        marginBottom: 25
    },
    columnHeader: {
        backgroundColor: '#f3f4f6',
        padding: 10,
        borderRadius: 8,
        marginBottom: 10
    },
    columnTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#374151'
    },
    columnDescription: {
        fontSize: 10,
        color: '#6b7280',
        marginTop: 2
    },
    card: {
        backgroundColor: '#ffffff',
        border: '1 solid #e5e7eb',
        borderRadius: 6,
        padding: 8,
        marginBottom: 6
    },
    cardContent: {
        fontSize: 11,
        color: '#374151',
        lineHeight: 1.4
    },
    cardMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
        fontSize: 9,
        color: '#9ca3af'
    },
    groupSection: {
        marginBottom: 15,
        backgroundColor: '#f9fafb',
        padding: 10,
        borderRadius: 8
    },
    groupTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 6
    },
    groupStats: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 8,
        fontSize: 10,
        color: '#6b7280'
    },
    facilitatorNotesSection: {
        backgroundColor: '#fef3c7',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20
    },
    noteItem: {
        marginBottom: 10,
        padding: 8,
        backgroundColor: '#ffffff',
        borderRadius: 4,
        border: '1 solid #fbbf24'
    },
    noteContent: {
        fontSize: 11,
        color: '#374151',
        marginBottom: 4
    },
    noteTimestamp: {
        fontSize: 9,
        color: '#92400e'
    },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        textAlign: 'center',
        fontSize: 10,
        color: '#9ca3af',
        borderTop: '1 solid #e5e7eb',
        paddingTop: 10
    }
});

/**
 * Crea el componente del documento PDF usando createElement
 */
const createRetrospectivePDF = (data: RetrospectiveExportData, options: ExportOptions) => {
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

    // Función para obtener el estilo de una tarjeta con su color de fondo
    const getCardStyle = (card: Card) => {
        const backgroundColor = card.color ? getCardColorHex(card.color) : '#ffffff';
        return {
            ...styles.card,
            backgroundColor
        };
    };

    const calculateStatistics = () => {
        const totalCards = data.cards.length;
        const totalGroups = data.groups.length;
        const totalParticipants = data.participants.length;
        const totalVotes = data.cards.reduce((sum, card) => sum + (card.votes || 0), 0);
        const totalReactions = data.cards.reduce((sum, card) => sum + (card.reactions?.length || 0), 0);

        return {
            totalCards,
            totalGroups,
            totalParticipants,
            totalVotes,
            totalReactions
        };
    };

    const stats = calculateStatistics();

    // Header
    const headerElements = [
        ...(options.logoUrl ? [React.createElement(Image, {
            key: 'logo',
            style: styles.logo,
            src: options.logoUrl
        })] : []),
        React.createElement(View, { key: 'headerContent', style: styles.headerContent }, [
            React.createElement(Text, { key: 'title', style: styles.title }, data.retrospective.title),
            React.createElement(Text, { key: 'subtitle', style: styles.subtitle },
                `Retrospectiva generada el ${formatDate(new Date())}`
            )
        ])
    ];

    // Información general
    const infoElements = [
        React.createElement(View, { key: 'created', style: styles.infoItem }, [
            React.createElement(Text, { key: 'label', style: styles.infoLabel }, 'Fecha de creación'),
            React.createElement(Text, { key: 'value', style: styles.infoValue }, formatDate(data.retrospective.createdAt))
        ]),
        React.createElement(View, { key: 'status', style: styles.infoItem }, [
            React.createElement(Text, { key: 'label', style: styles.infoLabel }, 'Estado'),
            React.createElement(Text, { key: 'value', style: styles.infoValue },
                data.retrospective.isActive ? 'Activa' : 'Finalizada'
            )
        ]),
        ...(data.retrospective.description ? [
            React.createElement(View, { key: 'description', style: styles.infoItem }, [
                React.createElement(Text, { key: 'label', style: styles.infoLabel }, 'Descripción'),
                React.createElement(Text, { key: 'value', style: styles.infoValue }, data.retrospective.description)
            ])
        ] : [])
    ];

    // Estadísticas
    const statsElements = options.includeStatistics ? [
        React.createElement(View, { key: 'stats', style: styles.section }, [
            React.createElement(Text, { key: 'title', style: styles.sectionTitle }, 'Estadísticas'),
            React.createElement(View, { key: 'container', style: styles.statsContainer }, [
                React.createElement(View, { key: 'cards', style: styles.statItem }, [
                    React.createElement(Text, { key: 'number', style: styles.statNumber }, stats.totalCards.toString()),
                    React.createElement(Text, { key: 'label', style: styles.statLabel }, 'Tarjetas')
                ]),
                React.createElement(View, { key: 'groups', style: styles.statItem }, [
                    React.createElement(Text, { key: 'number', style: styles.statNumber }, stats.totalGroups.toString()),
                    React.createElement(Text, { key: 'label', style: styles.statLabel }, 'Grupos')
                ]),
                React.createElement(View, { key: 'participants', style: styles.statItem }, [
                    React.createElement(Text, { key: 'number', style: styles.statNumber }, stats.totalParticipants.toString()),
                    React.createElement(Text, { key: 'label', style: styles.statLabel }, 'Participantes')
                ]),
                React.createElement(View, { key: 'votes', style: styles.statItem }, [
                    React.createElement(Text, { key: 'number', style: styles.statNumber }, stats.totalVotes.toString()),
                    React.createElement(Text, { key: 'label', style: styles.statLabel }, 'Votos')
                ]),
                React.createElement(View, { key: 'reactions', style: styles.statItem }, [
                    React.createElement(Text, { key: 'number', style: styles.statNumber }, stats.totalReactions.toString()),
                    React.createElement(Text, { key: 'label', style: styles.statLabel }, 'Reacciones')
                ])
            ])
        ])
    ] : [];

    // Participantes
    const participantsElements = (options.includeParticipants && data.participants.length > 0) ? [
        React.createElement(View, { key: 'participants', style: styles.section }, [
            React.createElement(Text, { key: 'title', style: styles.sectionTitle },
                `Participantes (${data.participants.length})`
            ),
            ...data.participants.map((participant, index) =>
                React.createElement(View, { key: `participant-${participant.name}-${index}`, style: styles.card }, [
                    React.createElement(Text, { key: 'name', style: styles.cardContent }, participant.name),
                    React.createElement(Text, { key: 'joined', style: styles.cardMeta },
                        `Se unió: ${formatDate(participant.joinedAt)}`
                    )
                ])
            )
        ])
    ] : [];

    // Notas del facilitador
    const facilitatorNotesElements = (options.includeFacilitatorNotes && data.facilitatorNotes && data.facilitatorNotes.length > 0) ? [
        React.createElement(View, { key: 'facilitatorNotes', style: styles.section }, [
            React.createElement(Text, { key: 'title', style: styles.sectionTitle }, 'Notas del Facilitador'),
            React.createElement(View, { key: 'notesSection', style: styles.facilitatorNotesSection },
                data.facilitatorNotes.map((note, index) =>
                    React.createElement(View, { key: note.id || index, style: styles.noteItem }, [
                        React.createElement(Text, { key: 'content', style: styles.noteContent }, note.content),
                        React.createElement(Text, { key: 'timestamp', style: styles.noteTimestamp },
                            formatDate(note.timestamp)
                        )
                    ])
                )
            )
        ])
    ] : [];

    // Columnas
    const columnElements = COLUMN_ORDER.map((columnType) => {
        const column = COLUMNS[columnType];
        const columnCards = getColumnCards(columnType);
        const columnGroups = getColumnGroups(columnType);

        if (columnCards.length === 0) return null;

        const groupElements = options.includeGroupDetails ? columnGroups.map((group) => {
            const groupCards = columnCards.filter(card => card.groupId === group.id);
            if (groupCards.length === 0) return null;

            return React.createElement(View, { key: group.id, style: styles.groupSection }, [
                React.createElement(Text, { key: 'title', style: styles.groupTitle },
                    `📁 ${group.title || 'Grupo sin título'}`
                ),
                React.createElement(View, { key: 'stats', style: styles.groupStats }, [
                    React.createElement(Text, { key: 'count' }, `Tarjetas: ${groupCards.length}`),
                    React.createElement(Text, { key: 'votes' },
                        `Votos totales: ${groupCards.reduce((sum, card) => sum + (card.votes || 0), 0)}`
                    )
                ]),
                ...groupCards.map((card) =>
                    React.createElement(View, { key: card.id, style: getCardStyle(card) }, [
                        React.createElement(Text, { key: 'content', style: styles.cardContent }, card.content),
                        React.createElement(View, { key: 'meta', style: styles.cardMeta }, [
                            React.createElement(Text, { key: 'author' }, `Autor: ${card.createdBy || 'Anónimo'}`),
                            React.createElement(Text, { key: 'votes' }, `Votos: ${card.votes || 0}`)
                        ])
                    ])
                )
            ]);
        }).filter(Boolean) : [];

        const ungroupedCards = columnCards
            .filter(card => !card.groupId || !options.includeGroupDetails)
            .map((card) =>
                React.createElement(View, { key: card.id, style: getCardStyle(card) }, [
                    React.createElement(Text, { key: 'content', style: styles.cardContent }, card.content),
                    React.createElement(View, { key: 'meta', style: styles.cardMeta }, [
                        React.createElement(Text, { key: 'author' }, `Autor: ${card.createdBy || 'Anónimo'}`),
                        React.createElement(Text, { key: 'votes' }, `Votos: ${card.votes || 0}`)
                    ])
                ])
            );

        return React.createElement(View, { key: columnType, style: styles.columnSection }, [
            React.createElement(View, { key: 'header', style: styles.columnHeader }, [
                React.createElement(Text, { key: 'title', style: styles.columnTitle },
                    `${column.title} (${columnCards.length} tarjetas)`
                ),
                React.createElement(Text, { key: 'description', style: styles.columnDescription },
                    column.description
                )
            ]),
            ...groupElements,
            ...ungroupedCards
        ]);
    }).filter(Boolean);

    // Footer
    const footer = React.createElement(Text, { style: styles.footer },
        `Generado por Retro Rocket - ${formatDate(new Date())}`
    );

    // Construir página completa
    const pageElements = [
        React.createElement(View, { key: 'header', style: styles.header }, headerElements),
        React.createElement(View, { key: 'info', style: styles.section }, [
            React.createElement(Text, { key: 'title', style: styles.sectionTitle }, 'Información General'),
            React.createElement(View, { key: 'infoContent', style: styles.retrospectiveInfo }, infoElements)
        ]),
        ...statsElements,
        ...participantsElements,
        ...facilitatorNotesElements,
        ...columnElements,
        footer
    ];

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
