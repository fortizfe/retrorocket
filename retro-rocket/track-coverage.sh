#!/bin/bash

# Script para trackear el progreso de cobertura
# Uso: ./track-coverage.sh

echo "📊 Analizando cobertura de testing..."
echo "=================================="

# Ejecutar tests con cobertura
npm run test:coverage > coverage_report.txt 2>&1

# Extraer métricas principales
STATEMENTS=$(grep "All files" coverage_report.txt | awk '{print $3}' | head -1)
BRANCHES=$(grep "All files" coverage_report.txt | awk '{print $4}' | head -1)  
FUNCTIONS=$(grep "All files" coverage_report.txt | awk '{print $5}' | head -1)
LINES=$(grep "All files" coverage_report.txt | awk '{print $6}' | head -1)

echo "📈 Métricas de Cobertura Actual:"
echo "  • Statements: ${STATEMENTS:-'N/A'}"
echo "  • Branches: ${BRANCHES:-'N/A'}"
echo "  • Functions: ${FUNCTIONS:-'N/A'}"
echo "  • Lines: ${LINES:-'N/A'}"
echo ""

# Calcular progreso hacia 80%
if [ ! -z "$STATEMENTS" ] && [ "$STATEMENTS" != "N/A" ]; then
    CURRENT=$(echo $STATEMENTS | sed 's/%//')
    REMAINING=$(echo "80 - $CURRENT" | bc -l)
    echo "🎯 Progreso hacia 80%:"
    echo "  • Actual: ${CURRENT}%"
    echo "  • Falta: ${REMAINING}%"
    echo ""
fi

# Mostrar archivos con cobertura baja (0-20%)
echo "🔍 Archivos con cobertura crítica (0-20%):"
grep -E "^\s*\.\.\." coverage_report.txt | grep -E "\s+[0-9]\.?[0-9]?\s+|^.*\s+0\s+" | head -10

echo ""
echo "💡 Para ver el reporte completo: open coverage/index.html"
echo "📝 Reporte guardado en: coverage_report.txt"

# Limpiar archivo temporal
# rm coverage_report.txt
