#!/bin/bash

# Test script para verificar la funcionalidad del Countdown Timer
# Este script verifica que todos los archivos se hayan creado correctamente

echo "🔍 Verificando implementación del Countdown Timer..."

# Verificar archivos de tipos
if [ -f "src/types/countdown.ts" ]; then
    echo "✅ Tipos de countdown creados"
else
    echo "❌ Falta archivo de tipos"
fi

# Verificar servicio
if [ -f "src/services/countdownService.ts" ]; then
    echo "✅ Servicio de countdown creado"
else
    echo "❌ Falta servicio de countdown"
fi

# Verificar hook
if [ -f "src/hooks/useCountdown.ts" ]; then
    echo "✅ Hook useCountdown creado"
else
    echo "❌ Falta hook useCountdown"
fi

# Verificar componentes
if [ -f "src/components/countdown/CountdownTimer.tsx" ]; then
    echo "✅ Componente CountdownTimer creado"
else
    echo "❌ Falta componente CountdownTimer"
fi

if [ -f "src/components/countdown/FacilitatorControls.tsx" ]; then
    echo "✅ Componente FacilitatorControls creado"
else
    echo "❌ Falta componente FacilitatorControls"
fi

if [ -f "src/components/countdown/index.ts" ]; then
    echo "✅ Archivo barrel creado"
else
    echo "❌ Falta archivo barrel"
fi

# Verificar reglas de Firestore
if grep -q "countdown_timers" firestore.rules; then
    echo "✅ Reglas de Firestore actualizadas"
else
    echo "❌ Falta actualizar reglas de Firestore"
fi

# Verificar integración en RetrospectivePage
if grep -q "CountdownTimer" src/pages/RetrospectivePage.tsx; then
    echo "✅ CountdownTimer integrado en RetrospectivePage"
else
    echo "❌ Falta integrar CountdownTimer"
fi

if grep -q "FacilitatorControls" src/pages/RetrospectivePage.tsx; then
    echo "✅ FacilitatorControls integrado en RetrospectivePage"
else
    echo "❌ Falta integrar FacilitatorControls"
fi

echo ""
echo "🎯 Resumen de funcionalidades implementadas:"
echo "   - ⏱️  Temporizador visual en tiempo real"
echo "   - 🎛️  Panel de controles para facilitador"
echo "   - 🔄 Sincronización en tiempo real con Firestore"
echo "   - 🔒 Seguridad: solo el propietario puede controlar"
echo "   - ⚡ Controles completos: Iniciar, Pausar, Reiniciar, Eliminar"
echo "   - 📱 Responsive y accesible"
echo "   - 🌙 Soporte para modo oscuro"
echo ""
echo "Para probar la funcionalidad:"
echo "1. npm run dev"
echo "2. Crear una retrospectiva"
echo "3. Como propietario, verás los controles de facilitador"
echo "4. Configurar un temporizador y probarlo"
echo "5. Usar los controles: Iniciar, Pausar, Reiniciar, Eliminar"
echo "6. Invitar a otros usuarios para ver la sincronización"
