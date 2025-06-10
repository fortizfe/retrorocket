#!/bin/bash

# 🔥 Script de verificación de Firebase para RetroRocket

echo "🔥 Verificando configuración de Firebase..."
echo ""

# Verificar archivo .env
if [ -f ".env" ]; then
    echo "✅ Archivo .env encontrado"
    
    # Verificar que las variables tienen valores reales
    if grep -q "AIzaSyBEW_QWejbAe9Hd0OQZwseeNmRBmtjaowI" .env; then
        echo "✅ API Key configurada correctamente"
    else
        echo "❌ API Key no configurada"
        exit 1
    fi
    
    if grep -q "retrorocket-3284d" .env; then
        echo "✅ Project ID configurado: retrorocket-3284d"
    else
        echo "❌ Project ID no configurado"
        exit 1
    fi
    
    echo "✅ Credenciales Firebase configuradas"
else
    echo "❌ Archivo .env no encontrado"
    exit 1
fi

echo ""
echo "🎯 PRÓXIMOS PASOS IMPORTANTES:"
echo ""
echo "1. 📊 CONFIGURAR FIRESTORE DATABASE:"
echo "   - Ve a: https://console.firebase.google.com/project/retrorocket-3284d/firestore"
echo "   - Si no está creado, haz clic en 'Crear base de datos'"
echo "   - Selecciona 'Empezar en modo de prueba'"
echo "   - Elige una ubicación (ej: us-central1)"
echo ""
echo "2. 🔒 CONFIGURAR REGLAS DE SEGURIDAD:"
echo "   - Ve a la pestaña 'Reglas' en Firestore"
echo "   - Reemplaza las reglas con las de FIREBASE_REAL_SETUP.md"
echo ""
echo "3. 🧪 PROBAR LA APLICACIÓN:"
echo "   - npm run dev"
echo "   - Crear una retrospectiva"
echo "   - Verificar que se guarda en Firestore"
echo ""
echo "📋 Estado actual:"
echo "✅ Proyecto Firebase: retrorocket-3284d"
echo "✅ Credenciales configuradas"
echo "⏳ Pendiente: Configurar Firestore Database"
echo ""
echo "🔗 Enlace directo a Firestore:"
echo "https://console.firebase.google.com/project/retrorocket-3284d/firestore"
