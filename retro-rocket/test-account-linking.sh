#!/bin/bash

# Test script for Account Linking functionality
# This script guides manual testing of the account linking system

echo "🔐 Guía de Pruebas del Sistema de Vinculación de Cuentas"
echo "========================================================="
echo ""

echo "📋 Requisitos Previos:"
echo "- Tener cuentas de Google y GitHub con el mismo email"
echo "- Firebase Auth configurado correctamente"
echo "- Aplicación ejecutándose (npm run dev)"
echo ""

echo "🧪 Escenarios de Prueba:"
echo ""

echo "1️⃣ PRUEBA: Usuario nuevo - Vinculación automática"
echo "   a) Inicia sesión con Google por primera vez"
echo "   b) Cierra sesión"
echo "   c) Intenta iniciar sesión con GitHub (mismo email)"
echo "   d) ✅ Debería mostrar popup de Google para autenticar"
echo "   e) ✅ Debería vincular automáticamente y mostrar mensaje de éxito"
echo "   f) ✅ Mismo UID y datos preservados"
echo ""

echo "2️⃣ PRUEBA: Usuario existente - Vinculación manual"
echo "   a) Usuario ya logueado va a su perfil"
echo "   b) En la sección 'Métodos de Inicio de Sesión'"
echo "   c) Hace clic en 'Vincular' para otro proveedor"
echo "   d) ✅ Debería vincular exitosamente"
echo "   e) ✅ Debería mostrar ambos proveedores como 'Vinculados'"
echo ""

echo "3️⃣ PRUEBA: Manejo de errores"
echo "   a) Cerrar popup durante autenticación"
echo "   b) ✅ Debería mostrar 'El inicio de sesión fue cancelado'"
echo "   c) Probar sin conexión a internet"
echo "   d) ✅ Debería mostrar error de conexión apropiado"
echo ""

echo "4️⃣ PRUEBA: Persistencia de datos"
echo "   a) Crear retrospectivas con primer proveedor"
echo "   b) Vincular segundo proveedor"
echo "   c) Cerrar sesión e iniciar con segundo proveedor"
echo "   d) ✅ Todas las retrospectivas deben estar disponibles"
echo ""

echo "5️⃣ PRUEBA: Interfaz de usuario"
echo "   a) Ir a la página de perfil"
echo "   b) ✅ Verificar sección 'Métodos de Inicio de Sesión'"
echo "   c) ✅ Proveedores vinculados deben mostrarse en verde"
echo "   d) ✅ Proveedores no vinculados deben tener botón 'Vincular'"
echo ""

echo "🔍 Verificaciones en Firebase Console:"
echo "   - Un solo documento por usuario en collection 'users'"
echo "   - UID consistente en todas las operaciones"
echo "   - Múltiples providerData en Firebase Auth"
echo ""

echo "🚨 Reportar cualquier comportamiento inesperado"
echo ""

# Check if Firebase emulator is running
if ! command -v firebase &> /dev/null; then
    echo "⚠️  Firebase CLI no encontrado. Instalar con: npm install -g firebase-tools"
fi

# Check if development server is running
if ! lsof -ti:5173 > /dev/null 2>&1; then
    echo "⚠️  Servidor de desarrollo no está ejecutándose."
    echo "    Ejecutar: npm run dev"
else
    echo "✅ Servidor de desarrollo activo en http://localhost:5173"
fi

echo ""
echo "Para ejecutar las pruebas:"
echo "1. npm run dev (si no está ejecutándose)"
echo "2. Abrir http://localhost:5173"
echo "3. Seguir los escenarios de prueba anteriores"
echo ""
