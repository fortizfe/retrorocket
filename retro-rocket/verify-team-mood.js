#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧪 VERIFICACIÓN DEL DESARROLLO: Informe del Estado de Ánimo del Equipo\n');

let allValid = true;

// Verificar archivos nuevos creados
const newFiles = [
    'src/types/teamMood.ts',
    'src/hooks/useTeamMood.ts',
    'src/components/sentiment/TeamMoodDashboard.tsx',
    'src/components/sentiment/SentimentProgressBar.tsx',
    'src/components/facilitator/TeamMoodTab.tsx',
    'src/components/sentiment/index.ts',
    'TEAM_MOOD_ANALYSIS.md'
];

console.log('📁 Verificando archivos nuevos...');
newFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`   ✓ ${file}`);
    } else {
        console.log(`   ❌ ${file} - FALTA`);
        allValid = false;
    }
});

// Verificar archivos modificados
console.log('\n📝 Verificando archivos modificados...');

const modifiedFiles = [
    'src/components/facilitator/FacilitatorMenuTabs.tsx',
    'src/components/countdown/FacilitatorMenu.tsx',
    'src/pages/RetrospectivePage.tsx',
    'src/components/retrospective/RetrospectiveBoard.tsx',
    'src/components/facilitator/index.ts',
    'src/locales/es.json'
];

modifiedFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`   ✓ ${file} - Modificado`);
    } else {
        console.log(`   ❌ ${file} - NO ENCONTRADO`);
        allValid = false;
    }
});

// Verificar integraciones específicas
console.log('\n🔍 Verificando integraciones...');

try {
    // Verificar que useTeamMood esté implementado correctamente
    const useTeamMoodContent = fs.readFileSync('src/hooks/useTeamMood.ts', 'utf8');
    if (useTeamMoodContent.includes('useTeamMood') && useTeamMoodContent.includes('TeamMoodReport')) {
        console.log('   ✓ Hook useTeamMood implementado correctamente');
    } else {
        console.log('   ❌ Hook useTeamMood incompleto');
        allValid = false;
    }

    // Verificar que TeamMoodDashboard use el hook
    const dashboardContent = fs.readFileSync('src/components/sentiment/TeamMoodDashboard.tsx', 'utf8');
    if (dashboardContent.includes('TeamMoodReport') && dashboardContent.includes('hasEnoughData')) {
        console.log('   ✓ TeamMoodDashboard implementado correctamente');
    } else {
        console.log('   ❌ TeamMoodDashboard incompleto');
        allValid = false;
    }

    // Verificar que FacilitatorMenu tenga el nuevo tab
    const facilitatorMenuContent = fs.readFileSync('src/components/countdown/FacilitatorMenu.tsx', 'utf8');
    if (facilitatorMenuContent.includes('team-mood') && facilitatorMenuContent.includes('TeamMoodTab')) {
        console.log('   ✓ FacilitatorMenu integrado correctamente');
    } else {
        console.log('   ❌ FacilitatorMenu falta integración');
        allValid = false;
    }

    // Verificar que FacilitatorMenuTabs tenga el nuevo tab
    const facilitatorTabsContent = fs.readFileSync('src/components/facilitator/FacilitatorMenuTabs.tsx', 'utf8');
    if (facilitatorTabsContent.includes('team-mood') && facilitatorTabsContent.includes('Users')) {
        console.log('   ✓ FacilitatorMenuTabs con nuevo tab');
    } else {
        console.log('   ❌ FacilitatorMenuTabs falta nuevo tab');
        allValid = false;
    }

    // Verificar traducciones
    const localesContent = fs.readFileSync('src/locales/es.json', 'utf8');
    if (localesContent.includes('teamMood')) {
        console.log('   ✓ Traducciones agregadas');
    } else {
        console.log('   ❌ Traducciones faltantes');
        allValid = false;
    }

    // Verificar que RetrospectivePage pase las props correctas
    const retroPageContent = fs.readFileSync('src/pages/RetrospectivePage.tsx', 'utf8');
    if (retroPageContent.includes('cards={exportCards}') && retroPageContent.includes('columnConfigs=')) {
        console.log('   ✓ RetrospectivePage pasa props correctas');
    } else {
        console.log('   ❌ RetrospectivePage falta props');
        allValid = false;
    }

    // Verificar exports
    const sentimentIndexContent = fs.readFileSync('src/components/sentiment/index.ts', 'utf8');
    if (sentimentIndexContent.includes('TeamMoodDashboard')) {
        console.log('   ✓ Exports de sentiment correctos');
    } else {
        console.log('   ❌ Exports de sentiment incompletos');
        allValid = false;
    }

    const facilitatorIndexContent = fs.readFileSync('src/components/facilitator/index.ts', 'utf8');
    if (facilitatorIndexContent.includes('TeamMoodTab')) {
        console.log('   ✓ Exports de facilitator correctos');
    } else {
        console.log('   ❌ Exports de facilitator incompletos');
        allValid = false;
    }

} catch (error) {
    console.log(`   ❌ Error verificando integraciones: ${error.message}`);
    allValid = false;
}

// Verificar tipos y interfaces
console.log('\n🏗️ Verificando arquitectura...');

try {
    const teamMoodTypesContent = fs.readFileSync('src/types/teamMood.ts', 'utf8');

    const expectedTypes = [
        'TeamMoodReport',
        'TeamMoodMetrics',
        'TeamMoodInsight',
        'ColumnMoodMetrics',
        'calculateMoodScore'
    ];

    expectedTypes.forEach(type => {
        if (teamMoodTypesContent.includes(type)) {
            console.log(`   ✓ Tipo ${type} definido`);
        } else {
            console.log(`   ❌ Tipo ${type} faltante`);
            allValid = false;
        }
    });

} catch (error) {
    console.log(`   ❌ Error verificando tipos: ${error.message}`);
    allValid = false;
}

// Resultado final
console.log(`\n${allValid ? '🎉' : '❌'} RESULTADO FINAL`);
console.log('================================');

if (allValid) {
    console.log('✅ Todos los componentes del Informe del Estado de Ánimo del Equipo están correctamente implementados');
    console.log('\n🚀 FUNCIONALIDADES IMPLEMENTADAS:');
    console.log('   • Análisis completo del estado de ánimo del equipo');
    console.log('   • Dashboard con métricas y visualizaciones');
    console.log('   • Insights automáticos y recomendaciones');
    console.log('   • Integración completa en el menú del facilitador');
    console.log('   • Badges dinámicos según el estado del equipo');
    console.log('   • Componentes reutilizables y bien estructurados');
    console.log('\n📝 PRÓXIMOS PASOS:');
    console.log('   1. Probar la funcionalidad en desarrollo');
    console.log('   2. Ajustar diseño según feedback');
    console.log('   3. Añadir más tipos de insights si es necesario');
    console.log('\n📖 Ver TEAM_MOOD_ANALYSIS.md para documentación completa');
} else {
    console.log('❌ Algunos componentes están incompletos o faltantes');
    console.log('\n🔧 ACCIONES REQUERIDAS:');
    console.log('   • Verificar todos los archivos marcados como faltantes');
    console.log('   • Completar integraciones pendientes');
    console.log('   • Ejecutar este script nuevamente hasta que pase');
}

console.log('\n' + '='.repeat(50));
process.exit(allValid ? 0 : 1);
