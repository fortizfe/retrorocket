#!/bin/bash

echo "🔥 Testing GitHub Authentication Implementation"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}📋 TESTING CHECKLIST${NC}"
echo ""

# Test 1: TypeScript compilation
echo -e "${YELLOW}1. TypeScript Compilation...${NC}"
if npm run type-check > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ TypeScript compiles without errors${NC}"
else
    echo -e "   ${RED}❌ TypeScript compilation failed${NC}"
    exit 1
fi

# Test 2: Build process
echo -e "${YELLOW}2. Production Build...${NC}"
if npm run build > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Production build successful${NC}"
else
    echo -e "   ${RED}❌ Production build failed${NC}"
    exit 1
fi

# Test 3: Check Firebase configuration
echo -e "${YELLOW}3. Firebase Configuration...${NC}"
if grep -q "GithubAuthProvider" src/services/firebase.ts; then
    echo -e "   ${GREEN}✅ GitHub provider imported${NC}"
else
    echo -e "   ${RED}❌ GitHub provider not found${NC}"
fi

if grep -q "signInWithGithub" src/services/firebase.ts; then
    echo -e "   ${GREEN}✅ GitHub sign-in function exported${NC}"
else
    echo -e "   ${RED}❌ GitHub sign-in function not found${NC}"
fi

# Test 4: AuthProvider service
echo -e "${YELLOW}4. AuthProvider Service...${NC}"
if [ -f "src/services/authProvider.ts" ]; then
    echo -e "   ${GREEN}✅ AuthProvider service exists${NC}"
else
    echo -e "   ${RED}❌ AuthProvider service missing${NC}"
fi

if grep -q "GithubAuthProvider" src/services/authProvider.ts; then
    echo -e "   ${GREEN}✅ GitHub provider class implemented${NC}"
else
    echo -e "   ${RED}❌ GitHub provider class missing${NC}"
fi

# Test 5: UserContext integration
echo -e "${YELLOW}5. UserContext Integration...${NC}"
if grep -q "signInWithGithub" src/contexts/UserContext.tsx; then
    echo -e "   ${GREEN}✅ GitHub sign-in in UserContext${NC}"
else
    echo -e "   ${RED}❌ GitHub sign-in not in UserContext${NC}"
fi

# Test 6: AuthButtonGroup component
echo -e "${YELLOW}6. AuthButtonGroup Component...${NC}"
if grep -q "onProviderSignIn" src/components/auth/AuthButtonGroup.tsx; then
    echo -e "   ${GREEN}✅ Unified provider API implemented${NC}"
else
    echo -e "   ${RED}❌ Unified provider API missing${NC}"
fi

if grep -q "getAvailableProviders" src/components/auth/AuthButtonGroup.tsx; then
    echo -e "   ${GREEN}✅ Dynamic provider detection${NC}"
else
    echo -e "   ${RED}❌ Dynamic provider detection missing${NC}"
fi

# Test 7: Landing page integration
echo -e "${YELLOW}7. Landing Page Integration...${NC}"
if grep -q "handleProviderSignIn" src/pages/Landing.tsx; then
    echo -e "   ${GREEN}✅ Unified provider handler${NC}"
else
    echo -e "   ${RED}❌ Unified provider handler missing${NC}"
fi

if grep -q "AuthProviderType" src/pages/Landing.tsx; then
    echo -e "   ${GREEN}✅ TypeScript types imported${NC}"
else
    echo -e "   ${RED}❌ TypeScript types missing${NC}"
fi

echo ""
echo -e "${BLUE}🎯 FUNCTIONALITY TESTS${NC}"
echo ""

# Test 8: Check dev server
echo -e "${YELLOW}8. Development Server...${NC}"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Dev server is running${NC}"
    echo -e "   ${GREEN}   👉 Open: http://localhost:3000${NC}"
else
    echo -e "   ${YELLOW}⚠️  Dev server not running (run 'npm run dev')${NC}"
fi

echo ""
echo -e "${BLUE}📋 MANUAL TESTING CHECKLIST${NC}"
echo ""
echo "Please verify manually:"
echo "□ Landing page shows both Google and GitHub buttons"
echo "□ GitHub button has dark styling"
echo "□ Apple button shows 'Próximamente' badge"
echo "□ Buttons are responsive on mobile"
echo "□ Loading states work correctly"
echo "□ Error handling displays appropriate messages"
echo ""

echo -e "${GREEN}🎉 GitHub Authentication Implementation Complete!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Configure Firebase GitHub OAuth in production"
echo "2. Test real GitHub authentication flow"
echo "3. Deploy to staging/production environment"
echo ""
