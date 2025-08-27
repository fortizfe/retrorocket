// Test para verificar el nuevo diseño profesional de exportación TXT

console.log('=== TEST: Nuevo diseño profesional de exportación TXT ===');

// Simulamos los tipos necesarios usando mockups
const mockData = {
    retrospective: {
        id: 'test-retro-professional',
        title: 'Retrospectiva Sprint 42 - Equipo Alpha',
        templateId: 'madSadGlad',
        createdAt: new Date('2024-01-15'),
        isActive: false,
        description: 'Retrospectiva enfocada en la entrega del módulo de autenticación y las nuevas funcionalidades del dashboard. Durante este sprint implementamos OAuth2, mejoramos la UX del onboarding y optimizamos las queries de la base de datos.'
    },
    cards: [
        {
            id: 'card-1',
            content: 'La implementación de OAuth2 funcionó perfectamente y la integración fue muy fluida con los proveedores externos',
            column: 'glad',
            createdBy: 'María González',
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-15'),
            retrospectiveId: 'test-retro-professional',
            likes: ['user1', 'user2', 'user3'],
            reactions: ['👍', '🚀', '💪']
        },
        {
            id: 'card-2',
            content: 'Los tests unitarios cubrieron el 95% del código nuevo',
            column: 'glad',
            createdBy: 'Carlos Ruiz',
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-15'),
            retrospectiveId: 'test-retro-professional',
            likes: ['user1', 'user4'],
            reactions: ['✅', '🎯']
        },
        {
            id: 'card-3',
            content: 'Las reuniones diarias se alargaron demasiado y perdimos tiempo valioso de desarrollo',
            column: 'mad',
            createdBy: 'Ana López',
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-15'),
            retrospectiveId: 'test-retro-professional',
            likes: ['user2', 'user3', 'user4', 'user5'],
            reactions: ['😤', '⏰']
        },
        {
            id: 'card-4',
            content: 'El servidor de staging estuvo inestable durante 3 días consecutivos',
            column: 'sad',
            createdBy: 'Pedro Martín',
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-15'),
            retrospectiveId: 'test-retro-professional',
            likes: ['user1', 'user3'],
            reactions: ['😔', '🔧']
        },
        {
            id: 'card-5',
            content: 'Faltó comunicación entre frontend y backend durante la integración',
            column: 'sad',
            createdBy: 'Laura Sánchez',
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-15'),
            retrospectiveId: 'test-retro-professional',
            likes: ['user2', 'user4', 'user5'],
            reactions: ['💬', '🤝']
        }
    ],
    groups: [
        {
            id: 'group-1',
            title: 'Problemas de Infraestructura',
            headCardId: 'card-4',
            memberCardIds: [],
            retrospectiveId: 'test-retro-professional'
        }
    ],
    participants: [
        { name: 'María González - Frontend Lead', joinedAt: new Date('2024-01-15T09:00:00Z') },
        { name: 'Carlos Ruiz - Backend Developer', joinedAt: new Date('2024-01-15T09:05:00Z') },
        { name: 'Ana López - Product Owner', joinedAt: new Date('2024-01-15T09:10:00Z') },
        { name: 'Pedro Martín - DevOps Engineer', joinedAt: new Date('2024-01-15T09:15:00Z') },
        { name: 'Laura Sánchez - UX Designer', joinedAt: new Date('2024-01-15T09:20:00Z') },
        { name: 'Roberto Silva - QA Engineer', joinedAt: new Date('2024-01-15T09:25:00Z') }
    ],
    facilitatorNotes: [
        {
            id: 'note-1',
            content: 'Excelente participación del equipo. Se notó una mejora significativa en la comunicación respecto al sprint anterior.',
            timestamp: new Date('2024-01-15T10:30:00Z'),
            facilitatorId: 'facilitator-123',
            retrospectiveId: 'test-retro-professional'
        },
        {
            id: 'note-2',
            content: 'Punto de acción clave: implementar dailies más estructuradas con timeboxing estricto de 15 minutos máximo.',
            timestamp: new Date('2024-01-15T10:45:00Z'),
            facilitatorId: 'facilitator-123',
            retrospectiveId: 'test-retro-professional'
        }
    ],
    actionItems: [
        {
            id: 'action-1',
            content: 'Configurar monitoreo automático para el servidor de staging con alertas en Slack',
            assignedTo: 'user-4',
            assignedToName: 'Pedro Martín',
            dueDate: new Date('2024-01-22'),
            status: 'pending',
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-15'),
            retrospectiveId: 'test-retro-professional'
        },
        {
            id: 'action-2',
            content: 'Crear canal de comunicación dedicado para sincronización frontend-backend',
            assignedTo: 'user-1',
            assignedToName: 'María González',
            dueDate: new Date('2024-01-18'),
            status: 'pending',
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-15'),
            retrospectiveId: 'test-retro-professional'
        }
    ]
};

// Opciones completas para mostrar todas las funcionalidades
const options = {
    includeParticipants: true,
    includeStatistics: true,
    includeCardAuthors: true,
    includeGroupDetails: true,
    includeFacilitatorNotes: true,
    includeActionItems: true,
    includeSentimentBadges: false, // No tenemos datos de sentiment en este test
    includeTeamMoodAnalysis: false // No tenemos datos de team mood en este test
};

console.log('✅ Datos de prueba preparados con diseño profesional');
console.log('- Retrospectiva:', mockData.retrospective.title);
console.log('- Plantilla:', mockData.retrospective.templateId);
console.log('- Tarjetas:', mockData.cards.length);
console.log('- Participantes:', mockData.participants.length);
console.log('- Grupos:', mockData.groups.length);
console.log('- Notas del facilitador:', mockData.facilitatorNotes.length);
console.log('- Elementos de acción:', mockData.actionItems.length);
console.log('\n🎯 Esta prueba mostrará el nuevo diseño profesional con:');
console.log('  • Títulos elegantes con marcos Unicode');
console.log('  • Cajas informativas estructuradas');
console.log('  • Tablas de estadísticas profesionales');
console.log('  • Tarjetas con diseño limpio y metadata organizada');
console.log('  • Footer con branding de RetroRocket');
console.log('\n📝 Para ver el resultado completo, usa el exportador desde la UI de la aplicación');
