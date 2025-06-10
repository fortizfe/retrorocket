#!/bin/zsh

# Quick test script for RetroRocket
echo "🚀 RetroRocket Quick Test"
echo "========================"

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    echo "❌ Error: package.json not found"
    echo "   Please run this from the retro-rocket directory"
    exit 1
fi

# Check Node and npm
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo ""

# Quick type check
echo "🔍 Checking TypeScript..."
npm run type-check >/dev/null 2>&1
if [[ $? -eq 0 ]]; then
    echo "✅ TypeScript OK"
else
    echo "❌ TypeScript errors found"
    echo "   Run 'npm run type-check' for details"
fi

# Check if .env exists
if [[ -f ".env" ]]; then
    echo "✅ Environment file exists"
else
    echo "⚠️  No .env file (will use demo mode)"
fi

# Check dependencies
if [[ -d "node_modules" ]]; then
    echo "✅ Dependencies installed"
else
    echo "❌ Dependencies missing - run 'npm install'"
fi

echo ""
echo "🎯 To start the application:"
echo "   npm run dev"
echo ""
echo "📖 Documentation:"
echo "   README.md - General info"
echo "   FIREBASE_SETUP.md - Firebase setup"
echo "   TESTING.md - Testing guide"
echo "   STATUS.md - Current status"
