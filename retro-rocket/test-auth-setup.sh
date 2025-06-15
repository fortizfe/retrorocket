#!/bin/bash

# Test script to verify authentication setup
echo "🚀 Retro Rocket Authentication Setup Test"
echo "=========================================="

# Check if development server is running
echo "📋 Checking development server status..."
if pgrep -f "vite" > /dev/null; then
    echo "✅ Development server is running"
else
    echo "❌ Development server is not running"
    echo "Run 'npm run dev' to start the server"
    exit 1
fi

# Check TypeScript compilation
echo "📋 Checking TypeScript compilation..."
if npx tsc --noEmit --skipLibCheck; then
    echo "✅ No TypeScript errors found"
else
    echo "❌ TypeScript errors detected"
    exit 1
fi

# Check if Firebase config is properly set up
echo "📋 Checking Firebase configuration..."
if [ -f ".env.local" ]; then
    echo "✅ .env.local file exists"
    if grep -q "VITE_FIREBASE_API_KEY" .env.local; then
        echo "✅ Firebase API key configured"
    else
        echo "⚠️  Firebase API key not configured (running in mock mode)"
    fi
else
    echo "⚠️  .env.local file not found (running in mock mode)"
fi

# Check key files exist
echo "📋 Checking key authentication files..."
files=(
    "src/contexts/UserContext.tsx"
    "src/components/auth/AuthButtonGroup.tsx" 
    "src/components/auth/UserProfileForm.tsx"
    "src/components/auth/AuthWrapper.tsx"
    "src/pages/Landing.tsx"
    "src/pages/Dashboard.tsx"
    "src/pages/Profile.tsx"
    "src/services/firebase.ts"
    "src/services/userService.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file is missing"
        exit 1
    fi
done

echo ""
echo "🎉 Authentication setup test completed successfully!"
echo ""
echo "📖 Next steps:"
echo "1. Open http://localhost:5173 in your browser"
echo "2. You should see the landing page with Google Sign In"
echo "3. If Firebase is configured, you can test Google authentication"
echo "4. If not configured, the app will run in mock mode for development"
echo ""
echo "🔧 To configure Firebase:"
echo "1. Copy .env.example to .env.local"
echo "2. Add your Firebase configuration values"
echo "3. Restart the development server"
