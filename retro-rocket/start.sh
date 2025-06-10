#!/bin/bash

# 🚀 Script de Inicio Rápido para RetroRocket

echo "🚀 Iniciando RetroRocket..."
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

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está instalado"
    exit 1
fi

echo "✅ Node.js $(node --version) detectado"
echo "✅ npm $(npm --version) detectado"
echo ""

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
    echo ""
fi

# Verificar archivo .env
if [ ! -f ".env" ]; then
    echo "⚠️  Archivo .env no encontrado"
    echo "   Copiando .env.example..."
    cp .env.example .env
    echo "   ✅ Archivo .env creado"
    echo ""
    echo "🔥 IMPORTANTE: Configura Firebase en .env antes de continuar"
    echo "   Sigue las instrucciones en FIREBASE_SETUP.md"
    echo ""
    read -p "¿Has configurado Firebase? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "👋 Configura Firebase y vuelve a ejecutar este script"
        exit 1
    fi
fi

# Verificar tipos de TypeScript
echo "🔍 Verificando tipos de TypeScript..."
npm run type-check
if [ $? -eq 0 ]; then
    echo "✅ Verificación de tipos exitosa"
else
    echo "❌ Errores de TypeScript encontrados"
    echo "   Revisa los errores arriba antes de continuar"
    exit 1
fi

echo ""
echo "🎉 ¡Todo listo!"
echo ""
echo "Para iniciar la aplicación:"
echo "  npm run dev"
echo ""
echo "La aplicación estará disponible en:"
echo "  http://localhost:3000"
echo ""
echo "📚 Documentación adicional:"
echo "  README.md - Información general"
echo "  FIREBASE_SETUP.md - Configuración de Firebase"
echo ""
echo "🚀 ¡Disfruta usando RetroRocket!"
