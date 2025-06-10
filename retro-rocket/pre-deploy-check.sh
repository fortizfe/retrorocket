#!/bin/bash

# 🔍 Script de verificación pre-deploy

echo "🔍 Verificando que el proyecto esté listo para deploy..."
echo ""

# Verificar archivos necesarios
FILES=(
    "package.json"
    "vite.config.ts"
    "vercel.json"
    "src/main.tsx"
    "index.html"
)

echo "📁 Verificando archivos necesarios..."
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file (faltante)"
        exit 1
    fi
done

# Verificar dependencias
echo ""
echo "📦 Verificando dependencias..."
if [ -d "node_modules" ]; then
    echo "   ✅ node_modules"
else
    echo "   ⚠️  node_modules no encontrado. Ejecutando npm install..."
    npm install
fi

# Verificar variables de entorno
echo ""
echo "🔧 Verificando variables de entorno..."
ENV_VARS=(
    "VITE_FIREBASE_API_KEY"
    "VITE_FIREBASE_AUTH_DOMAIN"
    "VITE_FIREBASE_PROJECT_ID"
    "VITE_FIREBASE_STORAGE_BUCKET"
    "VITE_FIREBASE_MESSAGING_SENDER_ID"
    "VITE_FIREBASE_APP_ID"
)

if [ -f ".env" ]; then
    source .env
    for var in "${ENV_VARS[@]}"; do
        if [ -n "${!var}" ]; then
            echo "   ✅ $var"
        else
            echo "   ⚠️  $var (no definida en .env)"
        fi
    done
else
    echo "   ⚠️  Archivo .env no encontrado"
    echo "   📝 Asegúrate de configurar las variables en Vercel"
fi

# Test build
echo ""
echo "🏗️  Probando build de producción..."
npm run build

if [ $? -eq 0 ]; then
    echo "   ✅ Build exitoso"
    
    # Verificar archivos de build
    echo ""
    echo "📋 Archivos generados en dist/:"
    ls -la dist/ | head -10
    
    # Tamaño del build
    echo ""
    echo "📊 Tamaño del build:"
    du -sh dist/
    
else
    echo "   ❌ Error en el build"
    exit 1
fi

# Verificar preview
echo ""
echo "🔍 Verificando preview..."
echo "   Puedes probar el build con: npm run preview"

echo ""
echo "✅ VERIFICACIÓN COMPLETA"
echo ""
echo "🚀 Tu proyecto está listo para deploy en Vercel!"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Ejecuta: ./deploy.sh"
echo "   2. O sube a GitHub y conecta con Vercel"
echo "   3. Configura las variables de entorno en Vercel"
echo ""
echo "🌐 URLs importantes:"
echo "   - Vercel Dashboard: https://vercel.com/dashboard"
echo "   - Firebase Console: https://console.firebase.google.com/project/retrorocket-3284d"
