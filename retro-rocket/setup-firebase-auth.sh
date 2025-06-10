#!/bin/bash

# 🔥 Script para configurar Firebase Authentication y Firestore Rules

echo "🔥 Configuración de Firebase para RetroRocket"
echo ""

echo "📋 PASOS A SEGUIR:"
echo ""

echo "1️⃣  Habilitar Firebase Authentication:"
echo "   - Ve a: https://console.firebase.google.com/project/retrorocket-3284d/authentication"
echo "   - Haz clic en 'Get started'"
echo "   - Ve a la pestaña 'Sign-in method'"
echo "   - Habilita 'Anonymous' authentication"
echo ""

echo "2️⃣  Configurar reglas de Firestore:"
echo "   - Ve a: https://console.firebase.google.com/project/retrorocket-3284d/firestore/rules"
echo "   - Reemplaza las reglas existentes con el contenido del archivo 'firestore.rules'"
echo "   - Haz clic en 'Publish'"
echo ""

echo "3️⃣  Las nuevas reglas permitirán:"
echo "   ✅ Lectura y escritura para usuarios autenticados (incluyendo anónimos)"
echo "   ✅ Acceso a todas las colecciones de RetroRocket"
echo "   ✅ Seguridad básica sin comprometer la funcionalidad"
echo ""

echo "📄 Contenido de las reglas (archivo firestore.rules):"
echo "----------------------------------------"
cat firestore.rules
echo "----------------------------------------"
echo ""

echo "🚀 Una vez configurado, reinicia la aplicación:"
echo "   npm run dev"
echo ""

echo "✨ ¡Tu aplicación RetroRocket podrá usar Firebase con seguridad!"
