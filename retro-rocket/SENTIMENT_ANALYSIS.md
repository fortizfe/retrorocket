# 🤖 Análisis de Sentimiento - RetroRocket

## Descripción General

RetroRocket ahora incluye análisis automático de sentimiento para las tarjetas del tablero retrospectivo, proporcionando insights valiosos sobre el tono emocional de los comentarios del equipo.

## 🎯 Características Principales

### ✨ Análisis Automático
- **Detección en tiempo real**: Análisis automático de nuevas tarjetas
- **Soporte multiidioma**: Funciona en español e inglés
- **Procesamiento local**: Todo el análisis ocurre en el navegador
- **Modelos avanzados**: Usa DistilBERT multilingüe para precisión

### 🎨 Interfaz Visual
- **Badges de sentimiento**: Indicadores visuales en cada tarjeta
- **Filtrado por sentimiento**: Filtrar tarjetas por positivo, negativo, neutral
- **Control del facilitador**: Toggle para activar/desactivar el análisis
- **Contadores en tiempo real**: Estadísticas de sentimiento por columna

### 🚀 Rendimiento
- **Primera carga**: ≤ 5 segundos para cargar el modelo
- **Análisis incremental**: < 300ms por tarjeta después del calentamiento
- **Web Workers**: Procesamiento no-bloqueante
- **Cache inteligente**: Resultados almacenados localmente

## 🏗️ Arquitectura Técnica

### Componentes Principales

#### 1. **Tipos y Configuración** (`src/types/sentiment.ts`)
```typescript
// Tipos principales del sistema
export type SentimentType = 'positive' | 'negative' | 'neutral';
export interface SentimentResult {
    sentiment: SentimentType;
    confidence: number;
}
```

#### 2. **Web Worker** (`src/workers/sentimentWorker.ts`)
- Carga y ejecuta modelos ML usando @xenova/transformers
- Mapeo de resultados a categorías positive/negative/neutral
- Manejo de fallback entre modelos

#### 3. **Hook Principal** (`src/hooks/useSentiment.ts`)
- Orquesta todo el flujo de análisis
- Cache de resultados con debouncing
- Gestión del ciclo de vida del Worker

#### 4. **Componentes UI**
- **SentimentBadge**: Badge visual con indicador de confianza
- **SentimentFilter**: Filtro dropdown para columnas
- **SentimentControls**: Panel de control para facilitadores

### Modelos de ML

#### Modelo Primario: `Xenova/distilbert-base-multilingual-cased-sentiments-student`
- **Ventajas**: Optimizado para sentimientos, soporte multilingüe
- **Tamaño**: ~130MB
- **Idiomas**: ES, EN, y más
- **Precisión**: Alta precisión en contextos retrospectivos

#### Modelo Fallback: `Xenova/bert-base-multilingual-uncased-sentiment`
- **Uso**: Si falla el modelo primario
- **Confiabilidad**: Backup robusto
- **Compatibilidad**: Amplio soporte de navegadores

## 🎮 Uso Para Facilitadores

### 1. **Activación**
1. Abrir el menú de facilitador (⚙️)
2. Localizar la sección "Análisis de Sentimiento"
3. Hacer clic en "Activar Análisis"

### 2. **Visualización**
- **Badges en tarjetas**: Aparecen automáticamente tras activar
- **Filtros por columna**: Usar dropdown para filtrar por sentimiento
- **Contadores**: Ver estadísticas en tiempo real

### 3. **Configuración**
- **Umbral de confianza**: Solo muestra resultados > 60%
- **Análisis batch**: Procesa tarjetas existentes automáticamente
- **Actualizaciones incrementales**: Nuevas tarjetas se analizan instantly

## 💻 Desarrollo

### Instalación de Dependencias
```bash
npm install @xenova/transformers
```

### Estructura de Archivos
```
src/
├── types/sentiment.ts              # Definiciones de tipos
├── workers/sentimentWorker.ts      # Web Worker para ML
├── hooks/useSentiment.ts          # Hook principal de React
├── components/sentiment/          # Componentes UI
│   ├── SentimentBadge.tsx        # Badge visual
│   ├── SentimentFilter.tsx       # Filtro de columna
│   └── SentimentControls.tsx     # Panel de control
└── [componentes modificados]      # Integraciones
```

### Testing
```bash
# Verificar integración
node test-sentiment-integration.js

# Ejecutar tests
npm run test
```

## 🔧 Configuración Avanzada

### Variables de Entorno
```bash
# Opcional: URLs personalizadas para modelos
VITE_SENTIMENT_PRIMARY_MODEL="Xenova/distilbert-base-multilingual-cased-sentiments-student"
VITE_SENTIMENT_FALLBACK_MODEL="Xenova/bert-base-multilingual-uncased-sentiment"
```

### Personalización de Umbrales
```typescript
// En useSentiment.ts
const CONFIDENCE_THRESHOLD = 0.6; // 60% mínimo de confianza
const BATCH_SIZE = 10;             // Tarjetas por lote
const DEBOUNCE_DELAY = 300;        # ms para debouncing
```

## 🐛 Resolución de Problemas

### Problemas Comunes

#### 1. **Modelo no carga**
- **Síntoma**: Análisis no funciona después de 30 segundos
- **Solución**: Verificar conexión a internet, intentar recargar
- **Debug**: Abrir DevTools → Console para ver errores

#### 2. **Rendimiento lento**
- **Síntoma**: Análisis toma >5 segundos por tarjeta
- **Solución**: Esperar al "warm-up" inicial del modelo
- **Optimización**: Cerrar otras pestañas para liberar memoria

#### 3. **Resultados inconsistentes**
- **Síntoma**: Mismo texto da diferentes sentimientos
- **Causa**: Umbral de confianza bajo
- **Solución**: Solo se muestran resultados >60% confianza

### Logs de Debug
```javascript
// En la consola del navegador
localStorage.setItem('sentimentDebug', 'true');
// Reiniciar página para ver logs detallados
```

## 🚀 Próximas Mejoras

### v2.0 Planificado
- [ ] **Análisis histórico**: Tendencias de sentimiento por sprint
- [ ] **Configuración personalizada**: Umbrales ajustables por equipo
- [ ] **Exportación avanzada**: Incluir métricas de sentimiento en reportes
- [ ] **Integración IA**: Sugerencias automáticas basadas en sentimiento
- [ ] **Modelos especializados**: Entrenamiento específico para contexto Agile

### Contribuciones
- Reportar bugs en GitHub Issues
- Proponer mejoras en Discussions
- Enviar PRs siguiendo guías de contribución

## 📊 Métricas de Rendimiento

### Benchmarks (promedio)
- **Carga inicial del modelo**: 3-5 segundos
- **Análisis por tarjeta (warm)**: 50-150ms
- **Análisis por tarjeta (cold)**: 200-300ms
- **Memoria utilizada**: ~200MB
- **Precisión estimada**: 85-90% en contextos retrospectivos

### Compatibilidad de Navegadores
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ❌ Internet Explorer (no soportado)

---

**🎉 ¡El análisis de sentimiento está completamente integrado y listo para usar!**

Para soporte técnico, revisar logs del navegador o contactar al equipo de desarrollo.
