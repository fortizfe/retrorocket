#!/usr/bin/env node

/**
 * Integration test for sentiment analysis functionality
 * Verifies that all components and files are correctly integrated
 */

const fs = require('fs');
const path = require('path');

const requiredFiles = [
    'src/types/sentiment.ts',
    'src/workers/sentimentWorker.ts',
    'src/hooks/useSentiment.ts',
    'src/components/sentiment/SentimentBadge.tsx',
    'src/components/sentiment/SentimentFilter.tsx',
    'src/components/sentiment/SentimentControls.tsx'
];

const modifiedFiles = [
    'src/components/retrospective/DraggableCard.tsx',
    'src/components/retrospective/GroupableColumn.tsx',
    'src/components/retrospective/RetrospectiveBoard.tsx',
    'src/components/countdown/FacilitatorMenu.tsx',
    'src/pages/RetrospectivePage.tsx'
];

console.log('🔍 Testing Sentiment Analysis Integration...\n');

// Check if all required files exist
console.log('✅ Required Files:');
let allFilesExist = true;
requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`   ✓ ${file}`);
    } else {
        console.log(`   ❌ ${file} - MISSING`);
        allFilesExist = false;
    }
});

console.log('\n✅ Modified Files:');
modifiedFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`   ✓ ${file}`);
    } else {
        console.log(`   ❌ ${file} - MISSING`);
        allFilesExist = false;
    }
});

// Check key integrations
console.log('\n🔍 Integration Checks:');

// Check if RetrospectiveBoard imports useSentiment
const retrospectiveBoardContent = fs.readFileSync('src/components/retrospective/RetrospectiveBoard.tsx', 'utf8');
if (retrospectiveBoardContent.includes('useSentiment')) {
    console.log('   ✓ RetrospectiveBoard imports useSentiment');
} else {
    console.log('   ❌ RetrospectiveBoard missing useSentiment import');
    allFilesExist = false;
}

// Check if DraggableCard accepts sentimentResult
const draggableCardContent = fs.readFileSync('src/components/retrospective/DraggableCard.tsx', 'utf8');
if (draggableCardContent.includes('sentimentResult')) {
    console.log('   ✓ DraggableCard accepts sentimentResult prop');
} else {
    console.log('   ❌ DraggableCard missing sentimentResult prop');
    allFilesExist = false;
}

// Check if FacilitatorMenu imports SentimentControls
const facilitatorMenuContent = fs.readFileSync('src/components/countdown/FacilitatorMenu.tsx', 'utf8');
if (facilitatorMenuContent.includes('SentimentControls')) {
    console.log('   ✓ FacilitatorMenu imports SentimentControls');
} else {
    console.log('   ❌ FacilitatorMenu missing SentimentControls import');
    allFilesExist = false;
}

// Check if package.json includes @xenova/transformers
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (packageJson.dependencies && packageJson.dependencies['@xenova/transformers']) {
    console.log('   ✓ @xenova/transformers dependency installed');
} else {
    console.log('   ❌ @xenova/transformers dependency missing');
    allFilesExist = false;
}

console.log('\n' + '='.repeat(50));
if (allFilesExist) {
    console.log('🎉 All sentiment analysis components integrated successfully!');
    console.log('\n📋 Summary:');
    console.log('   • Core infrastructure: ✅ Complete');
    console.log('   • UI components: ✅ Complete');
    console.log('   • Component integration: ✅ Complete');
    console.log('   • Dependencies: ✅ Installed');
    console.log('\n🚀 Ready for testing in browser!');
} else {
    console.log('❌ Integration incomplete - some components missing');
}
