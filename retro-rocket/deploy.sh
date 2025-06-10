#!/bin/bash

# 🚀 Script de Deploy para Vercel

echo "🚀 Preparando deploy de RetroRocket a Vercel..."
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json"
    echo "   Ejecuta este script desde el directorio retro-rocket/"
    exit 1
fi

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    echo "   Instala Node.js desde: https://nodejs.org/"
    exit 1
fi

# Verificar Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 Instalando Vercel CLI..."
    npm install -g vercel
fi

echo "🧹 Limpiando builds anteriores..."
rm -rf dist
rm -rf .vercel

echo "🔧 Instalando dependencias..."
npm install

echo "🏗️  Construyendo proyecto..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error en el build"
    exit 1
fi

echo "✅ Build completado exitosamente"
echo ""

echo "📋 Configuración de variables de entorno en Vercel:"
echo "   Ve a tu dashboard de Vercel y configura estas variables:"
echo "   - VITE_FIREBASE_API_KEY"
echo "   - VITE_FIREBASE_AUTH_DOMAIN"
echo "   - VITE_FIREBASE_PROJECT_ID" 
echo "   - VITE_FIREBASE_STORAGE_BUCKET"
echo "   - VITE_FIREBASE_MESSAGING_SENDER_ID"
echo "   - VITE_FIREBASE_APP_ID"
echo ""

echo "🚀 Iniciando deploy..."
vercel --prod

echo ""
echo "✨ ¡Deploy completado!"
echo "🌐 Tu aplicación estará disponible en la URL que aparece arriba"
