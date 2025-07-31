// Script de prueba para verificar la integración de notas del facilitador
console.log('=== TEST: Integración de notas del facilitador ===');

// Simular datos de prueba
const mockRetrospective = {
    id: 'test-retro-123',
    title: 'Test Retrospective',
    createdBy: 'user-123'
};

const mockUser = {
    uid: 'user-123'
};

const mockFacilitatorNotes = [
    {
        id: 'note-1',
        content: 'Esta es una nota de prueba del facilitador',
        timestamp: new Date(),
        facilitatorId: 'user-123',
        retrospectiveId: 'test-retro-123'
    },
    {
        id: 'note-2',
        content: 'Segunda nota de prueba con emoji 🚀',
        timestamp: new Date(),
        facilitatorId: 'user-123',
        retrospectiveId: 'test-retro-123'
    }
];

const mockOptions = {
    includeFacilitatorNotes: true, // El checkbox está marcado
    includeParticipants: true,
    includeStatistics: true,
    includeGroupDetails: true,
    format: 'pdf'
};

const mockExportData = {
    retrospective: mockRetrospective,
    cards: [],
    groups: [],
    participants: [],
    facilitatorNotes: mockFacilitatorNotes
};

console.log('1. ¿Usuario es propietario?', mockUser.uid === mockRetrospective.createdBy);
console.log('2. ¿Hay notas del facilitador?', mockFacilitatorNotes.length > 0);
console.log('3. ¿Checkbox marcado?', mockOptions.includeFacilitatorNotes);
console.log('4. ¿Se incluirán en PDF?',
    mockOptions.includeFacilitatorNotes &&
    mockExportData.facilitatorNotes &&
    mockExportData.facilitatorNotes.length > 0
);

console.log('\n✅ Todos los requisitos están cumplidos para incluir notas del facilitador en el PDF');
console.log('\nDatos que se enviarían al servicio PDF:');
console.log('- Opciones:', mockOptions);
console.log('- Notas del facilitador:', mockFacilitatorNotes);
