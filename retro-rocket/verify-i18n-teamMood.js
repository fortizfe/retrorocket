#!/usr/bin/env node

/**
 * Script de verificación para el sistema i18n en Team Mood
 * Verifica que todas las traducciones estén implementadas correctamente
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando implementación del sistema i18n en Team Mood...\n');

// Verificar archivos de traducción
const esPath = path.join(__dirname, 'src/locales/es.json');
const enPath = path.join(__dirname, 'src/locales/en.json');

let esTranslations = {};
let enTranslations = {};

try {
    esTranslations = JSON.parse(fs.readFileSync(esPath, 'utf8'));
    enTranslations = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    console.log('✅ Archivos de traducciones cargados correctamente');
} catch (error) {
    console.error('❌ Error al cargar archivos de traducción:', error.message);
    process.exit(1);
}

// Verificar que las claves de teamMood existen
const requiredKeys = [
    'retrospective.facilitator.teamMood.title',
    'retrospective.facilitator.teamMood.analyzing',
    'retrospective.facilitator.teamMood.insufficientData.title',
    'retrospective.facilitator.teamMood.insufficientData.description',
    'retrospective.facilitator.teamMood.insufficientData.tip',
    'retrospective.facilitator.teamMood.disabled.title',
    'retrospective.facilitator.teamMood.disabled.description',
    'retrospective.facilitator.teamMood.disabled.tip',
    'retrospective.facilitator.teamMood.initializing.title',
    'retrospective.facilitator.teamMood.initializing.description',
    'retrospective.facilitator.teamMood.sentiments.positive',
    'retrospective.facilitator.teamMood.sentiments.negative',
    'retrospective.facilitator.teamMood.sentiments.neutral',
    'retrospective.facilitator.teamMood.sections.columnAnalysis',
    'retrospective.facilitator.teamMood.sections.insights',
    'retrospective.facilitator.teamMood.sections.detailedStats',
    'retrospective.facilitator.teamMood.stats.totalCards',
    'retrospective.facilitator.teamMood.stats.analyzed',
    'retrospective.facilitator.teamMood.stats.averageConfidence',
    'retrospective.facilitator.teamMood.stats.dominantSentiment',
    'retrospective.facilitator.teamMood.stats.cards_singular',
    'retrospective.facilitator.teamMood.stats.cards_plural',
    'retrospective.facilitator.teamMood.actionable',
    'retrospective.facilitator.teamMood.moreInsights',
    'retrospective.facilitator.teamMood.moreInsights_plural',
    'retrospective.facilitator.teamMood.facilitatorNote.title',
    'retrospective.facilitator.teamMood.facilitatorNote.description',
    'retrospective.facilitator.teamMood.moodLabels.excellent',
    'retrospective.facilitator.teamMood.moodLabels.good',
    'retrospective.facilitator.teamMood.moodLabels.fair',
    'retrospective.facilitator.teamMood.moodLabels.poor',
    'retrospective.facilitator.teamMood.moodLabels.critical'
];

// Función para obtener valor anidado
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
}

let missingInEs = [];
let missingInEn = [];

requiredKeys.forEach(key => {
    if (!getNestedValue(esTranslations, key)) {
        missingInEs.push(key);
    }
    if (!getNestedValue(enTranslations, key)) {
        missingInEn.push(key);
    }
});

if (missingInEs.length === 0 && missingInEn.length === 0) {
    console.log('✅ Todas las claves de traducción requeridas están presentes');
} else {
    if (missingInEs.length > 0) {
        console.log('❌ Claves faltantes en español:');
        missingInEs.forEach(key => console.log(`   - ${key}`));
    }
    if (missingInEn.length > 0) {
        console.log('❌ Claves faltantes en inglés:');
        missingInEn.forEach(key => console.log(`   - ${key}`));
    }
}

// Verificar uso de useTranslation en los componentes
const componentsToCheck = [
    'src/components/sentiment/TeamMoodDashboard.tsx',
    'src/components/facilitator/TeamMoodTab.tsx',
    'src/hooks/useTeamMood.ts'
];

console.log('\n🔍 Verificando importación de useTranslation...');
let importErrors = [];

componentsToCheck.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) {
        importErrors.push(`Archivo no encontrado: ${filePath}`);
        return;
    }

    const content = fs.readFileSync(fullPath, 'utf8');

    if (!content.includes('useTranslation')) {
        importErrors.push(`${filePath}: No importa useTranslation`);
    }

    if (!content.includes("from 'react-i18next'")) {
        importErrors.push(`${filePath}: No importa react-i18next`);
    }

    // Verificar que se use t()
    if (!content.includes('const { t } = useTranslation()') && !content.includes('const {t} = useTranslation()')) {
        importErrors.push(`${filePath}: No extrae función t de useTranslation`);
    }
});

if (importErrors.length === 0) {
    console.log('✅ Todos los componentes importan y usan useTranslation correctamente');
} else {
    console.log('❌ Errores en importaciones:');
    importErrors.forEach(error => console.log(`   - ${error}`));
}

// Verificar que no haya textos hardcodeados remanentes
console.log('\n🔍 Verificando textos hardcodeados...');
const hardcodedTexts = [
    'Estado de Ánimo del Equipo',
    'Analizando estado de ánimo',
    'Datos insuficientes',
    'Análisis de Sentimientos Desactivado',
    'Inicializando Análisis',
    'Positivo',
    'Negativo',
    'Neutral',
    'Análisis por Sección',
    'Insights y Recomendaciones',
    'Estadísticas Detalladas',
    'Tarjetas totales:',
    'Analizadas:',
    'Confianza promedio:',
    'Sentimiento dominante:',
    'Acción recomendada',
    'Solo visible para facilitadores'
];

let hardcodedFound = [];

componentsToCheck.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) return;

    const content = fs.readFileSync(fullPath, 'utf8');

    hardcodedTexts.forEach(text => {
        if (content.includes(`'${text}'`) || content.includes(`"${text}"`)) {
            hardcodedFound.push(`${filePath}: "${text}"`);
        }
    });
});

if (hardcodedFound.length === 0) {
    console.log('✅ No se encontraron textos hardcodeados remanentes');
} else {
    console.log('⚠️ Textos hardcodeados encontrados:');
    hardcodedFound.forEach(text => console.log(`   - ${text}`));
}

// Resumen final
console.log('\n📊 RESUMEN DE VERIFICACIÓN:');
console.log(`✅ Archivos de traducción: OK`);
console.log(`${missingInEs.length + missingInEn.length === 0 ? '✅' : '❌'} Claves de traducción: ${missingInEs.length + missingInEn.length === 0 ? 'OK' : 'FALTAN ' + (missingInEs.length + missingInEn.length)}`);
console.log(`${importErrors.length === 0 ? '✅' : '❌'} Importaciones useTranslation: ${importErrors.length === 0 ? 'OK' : importErrors.length + ' errores'}`);
console.log(`${hardcodedFound.length === 0 ? '✅' : '⚠️'} Textos hardcodeados: ${hardcodedFound.length === 0 ? 'OK' : hardcodedFound.length + ' encontrados'}`);

if (missingInEs.length + missingInEn.length + importErrors.length === 0) {
    console.log('\n🎉 ¡Sistema i18n para Team Mood implementado correctamente!');
    console.log('🌐 La funcionalidad ahora soporta múltiples idiomas.');
    process.exit(0);
} else {
    console.log('\n⚠️ Se encontraron algunos problemas que deben ser corregidos.');
    process.exit(1);
}
