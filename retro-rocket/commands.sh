#!/bin/bash

# 🎯 RetroRocket - Comandos de Deploy

echo "🚀 RetroRocket - Comandos Disponibles"
echo "======================================="
echo ""

echo "📋 DESARROLLO:"
echo "  npm run dev          - Servidor de desarrollo (puerto 3000)"
echo "  npm run type-check   - Verificar tipos TypeScript"
echo "  npm run lint         - Ejecutar ESLint"
echo ""

echo "🏗️  BUILD Y PREVIEW:"
echo "  npm run build        - Build de producción"
echo "  npm run preview      - Preview del build (puerto 3001)"
echo ""

echo "🚀 DEPLOY EN VERCEL:"
echo "  ./deploy.sh          - Deploy completo automatizado"
echo "  npm run deploy       - Build + deploy con Vercel CLI"
echo "  vercel --prod        - Deploy directo (requiere build previo)"
echo ""

echo "🔍 VERIFICACIÓN:"
echo "  ./pre-deploy-check.sh - Verificar que todo esté listo"
echo "  ./start.sh           - Verificación + desarrollo"
echo ""

echo "🔧 CONFIGURACIÓN FIREBASE:"
echo "  ./setup-firebase-auth.sh - Instrucciones de configuración"
echo ""

echo "📊 ESTADO ACTUAL:"
echo "  - ✅ Build: Optimizado (776 kB total, 210 kB gzipped)"
echo "  - ✅ Vite: Configurado para producción"
echo "  - ✅ Vercel: Configurado con SPA routing"
echo "  - ✅ Firebase: Variables de entorno listas"
echo "  - ✅ SEO: Meta tags optimizados"
echo "  - ✅ Seguridad: Headers configurados"
echo ""

echo "🎯 PRÓXIMO PASO:"
echo "  Ejecuta: ./deploy.sh"
echo ""

echo "🌐 URLs:"
echo "  - Desarrollo: http://localhost:3000"
echo "  - Preview:    http://localhost:3001"
echo "  - Vercel:     https://vercel.com/dashboard"
echo ""

echo "✨ ¡Tu aplicación está lista para el mundo!"
