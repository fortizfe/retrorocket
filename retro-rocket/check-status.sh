#!/bin/bash

# Script de verificación rápida para RetroRocket
echo "🔍 Verificando estado de RetroRocket..."

# Verificar estructura del proyecto
if [ -f "package.json" ] && [ -f "vite.config.ts" ] && [ -d "src" ]; then
    echo "✅ Estructura del proyecto OK"
else
    echo "❌ Estructura del proyecto incompleta"
    exit 1
fi

# Verificar node_modules
if [ -d "node_modules" ]; then
    echo "✅ Dependencias instaladas"
else
    echo "⚠️  Dependencias no instaladas - ejecuta 'npm install'"
fi

# Verificar archivos principales
if [ -f "src/main.tsx" ] && [ -f "src/App.tsx" ] && [ -f "index.html" ]; then
    echo "✅ Archivos principales OK"
else
    echo "❌ Archivos principales faltantes"
    exit 1
fi

# Verificar configuración de Firebase
if [ -f ".env" ]; then
    echo "✅ Archivo .env encontrado"
    echo "ℹ️  Proyecto configurado para modo demo de Firebase"
else
    echo "⚠️  Archivo .env no encontrado - usando configuración demo"
fi

echo ""
echo "🎉 ¡Proyecto listo para ejecutar!"
echo ""
echo "Para iniciar:"
echo "  npm run dev"
echo ""
echo "URL de la aplicación:"
echo "  http://localhost:3000"
