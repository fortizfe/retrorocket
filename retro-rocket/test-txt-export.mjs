// Test para verificar exportación TXT con notas del facilitador

console.log('=== TEST: Exportación TXT con notas del facilitador ===');

const mockData = {
    retrospective: {
        id: 'test-retro-123',
        title: 'Test Retrospective TXT',
        createdAt: new Date(),
        isActive: false,
        description: 'Retrospectiva de prueba para TXT'
    },
    cards: [
        {
            id: 'card-1',
            content: 'Tarjeta de prueba',
            column: 'what_went_well',
            createdBy: 'Usuario Test',
            votes: 3
        }
    ],
    groups: [],
    participants: [
        {
            name: 'Usuario Test',
            joinedAt: new Date()
        }
    ],
    facilitatorNotes: [
        {
            id: 'note-1',
            content: 'Nota importante del facilitador',
            timestamp: new Date(),
            facilitatorId: 'user-123',
            retrospectiveId: 'test-retro-123'
        },
        {
            id: 'note-2',
            content: 'Segunda nota con emoji 🚀 y más detalles importantes',
            timestamp: new Date(),
            facilitatorId: 'user-123',
            retrospectiveId: 'test-retro-123'
        }
    ]
};

const options = {
    includeParticipants: true,
    includeStatistics: true,
    includeCardAuthors: true,
    includeGroupDetails: true,
    includeFacilitatorNotes: true
};

console.log('✅ Datos de prueba preparados');
console.log('- Retrospectiva:', mockData.retrospective.title);
console.log('- Tarjetas:', mockData.cards.length);
console.log('- Participantes:', mockData.participants.length);
console.log('- Notas del facilitador:', mockData.facilitatorNotes.length);
console.log('- Incluir notas del facilitador:', options.includeFacilitatorNotes);
console.log('\n🎯 Las notas del facilitador deberían aparecer en la exportación TXT');
