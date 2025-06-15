#!/bin/bash

echo "🚀 RetroRocket - User Providers Migration Script"
echo "================================================"
echo ""

# Check if the user wants to run the migration
echo "This script will migrate existing user documents in Firebase to use the new providers array structure."
echo ""
echo "⚠️  IMPORTANT: This will modify your production database!"
echo "   Make sure you have a backup before proceeding."
echo ""

read -p "Do you want to proceed with the migration? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "Starting migration process..."
echo ""

# Build the project first
echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix any compilation errors before running migration."
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Run the migration
echo "🔄 Running user providers migration..."
echo ""

# Create a temporary Node.js script to run the migration
cat > migrate.mjs << 'EOF'
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { migrateUserProviders, verifyMigration } from './dist/utils/migrateUserProviders.js';

// Firebase config - replace with your actual config
const firebaseConfig = {
    // Your Firebase config here
    // You would need to load this from your environment or config
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runMigration() {
    try {
        console.log('🔍 Verifying current state...');
        const beforeState = await verifyMigration();
        
        console.log(`📊 Before migration:`);
        console.log(`   - Already migrated: ${beforeState.migrated}`);
        console.log(`   - Needs migration: ${beforeState.needsMigration}`);
        console.log(`   - Errors: ${beforeState.errors.length}`);
        
        if (beforeState.needsMigration === 0) {
            console.log('✅ All users are already migrated!');
            return;
        }
        
        console.log('');
        console.log('🚀 Starting migration...');
        await migrateUserProviders();
        
        console.log('');
        console.log('🔍 Verifying migration results...');
        const afterState = await verifyMigration();
        
        console.log(`📊 After migration:`);
        console.log(`   - Migrated: ${afterState.migrated}`);
        console.log(`   - Still needs migration: ${afterState.needsMigration}`);
        console.log(`   - Errors: ${afterState.errors.length}`);
        
        if (afterState.errors.length > 0) {
            console.log('⚠️  Errors encountered:');
            afterState.errors.forEach(error => console.log(`   - ${error}`));
        }
        
        if (afterState.needsMigration === 0 && afterState.errors.length === 0) {
            console.log('');
            console.log('🎉 Migration completed successfully!');
        } else {
            console.log('');
            console.log('⚠️  Migration completed with issues. Please review the errors above.');
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
EOF

# Run the migration script
node migrate.mjs

# Clean up
rm migrate.mjs

echo ""
echo "🏁 Migration process completed!"
echo ""
echo "Next steps:"
echo "1. Test your application to ensure everything works correctly"
echo "2. If everything looks good, you can run the cleanup script to remove old 'provider' fields"
echo "3. Consider running 'npm run test' to verify functionality"
echo ""
