# 📊 Informe del Estado de Ánimo del Equipo - RetroRocket

## Descripción

Se ha implementado una nueva funcionalidad para analizar el estado de ánimo del equipo basada en el análisis de sentimientos de las tarjetas individuales. Esta funcionalidad está disponible únicamente para los facilitadores y proporciona insights valiosos sobre el bienestar emocional del equipo durante las retrospectivas.

## ✨ Características Principales

### 🎯 Análisis Integral
- **Puntuación de estado de ánimo**: Escala del 1-10 basada en la distribución de sentimientos
- **Métricas por sección**: Análisis detallado por columna (Qué Funcionó, Qué No Funcionó, etc.)
- **Insights automáticos**: Detección de patrones y recomendaciones accionables
- **Visualizaciones**: Gráficos de barras de progreso y métricas coloradas

### 🔍 Insights Inteligentes
- **Alertas críticas**: Cuando >40% de sentimientos son negativos
- **Advertencias**: Cuando >25% de sentimientos son negativos
- **Reconocimientos positivos**: Cuando el equipo muestra alto positivismo
- **Análisis de equilibrio**: Detecta perspectivas balanceadas

### 🎨 Interfaz Intuitiva  
- **Integración fluida**: Nuevo tab en el menú del facilitador
- **Diseño responsive**: Funciona en todos los dispositivos
- **Actualizaciones en tiempo real**: Se recalcula automáticamente
- **Acceso restringido**: Solo visible para facilitadores

## 🏗️ Arquitectura Técnica

### Nuevos Archivos Creados

#### Tipos y Configuración
- `src/types/teamMood.ts` - Interfaces y tipos para el análisis del equipo
- `src/hooks/useTeamMood.ts` - Hook principal para métricas y cálculos

#### Componentes UI
- `src/components/sentiment/TeamMoodDashboard.tsx` - Dashboard principal del informe
- `src/components/sentiment/SentimentProgressBar.tsx` - Componente de barras de progreso
- `src/components/facilitator/TeamMoodTab.tsx` - Tab para el menú del facilitador

### Archivos Modificados

#### Integración del Sistema
- `src/components/facilitator/FacilitatorMenuTabs.tsx` - Añadido nuevo tab
- `src/components/countdown/FacilitatorMenu.tsx` - Lógica del nuevo tab y badges
- `src/pages/RetrospectivePage.tsx` - Paso de props adicionales
- `src/components/retrospective/RetrospectiveBoard.tsx` - Inclusión de configuraciones de columna

#### Traducciones y Exports
- `src/locales/es.json` - Nueva etiqueta para el tab
- `src/components/facilitator/index.ts` - Export del nuevo componente
- `src/components/sentiment/index.ts` - Exports de componentes de sentimientos

## 🎮 Uso Para Facilitadores

### 1. Activación
1. Abrir el menú de facilitador (⚙️)
2. Activar el análisis de sentimientos en la pestaña "IA"
3. Cambiar a la pestaña "Estado del Equipo"

### 2. Interpretación del Informe

#### Puntuación General (1-10)
- **8.5-10**: Excelente - Equipo muy positivo
- **7.5-8.4**: Muy Bueno - Ambiente constructivo
- **6.5-7.4**: Bueno - Estado saludable
- **5.5-6.4**: Regular - Necesita atención
- **4.5-5.4**: Preocupante - Requiere acción
- **3.5-4.4**: Malo - Problemas significativos
- **1-3.4**: Crítico - Intervención inmediata necesaria

#### Badges Dinámicos
- **🚨**: Situación crítica (>40% negativos)
- **⚠️**: Advertencia (>25% negativos)
- **😊**: Equipo muy positivo (>60% positivos)
- **📈**: Estado normal/bueno
- **📊**: Datos insuficientes
- **⚪**: Sistema inactivo

### 3. Insights Accionables

El sistema detecta automáticamente:
- **Áreas críticas**: Secciones con alta concentración de sentimientos negativos
- **Fortalezas del equipo**: Aspectos donde el equipo se siente bien
- **Desequilibrios**: Falta de perspectivas positivas
- **Completitud del análisis**: Si hay suficientes datos para conclusiones válidas

## 🔧 Configuración Técnica

### Umbrales por Defecto
```typescript
alertThresholds: {
  criticalNegativePercentage: 40, // Alerta crítica
  warningNegativePercentage: 25,  // Advertencia
  lowPositivePercentage: 20,      // Mínimo esperado de positivos
}
```

### Cálculo de Puntuación
```typescript
// Fórmula: (positivos * 2 + neutrales - negativos * 1.5) normalizada a 1-10
const weightedScore = (
  positivePercentage * 2 + 
  neutralPercentage - 
  negativePercentage * 1.5
) / 100;
```

## 🚀 Beneficios

### Para Facilitadores
- **Visibilidad objetiva** del estado emocional del equipo
- **Detección temprana** de problemas de moral
- **Datos cuantificables** para reportes y seguimiento
- **Recomendaciones específicas** para mejorar dinámicas

### Para Equipos
- **Retrospectivas más efectivas** basadas en datos emocionales
- **Identificación de patrones** de satisfacción/frustración
- **Seguimiento de mejora** a lo largo del tiempo
- **Ambiente más empático** y consciente

## 🔒 Privacidad y Seguridad

- **Solo visible para facilitadores**: Acceso completamente restringido
- **Análisis local**: Todo el procesamiento ocurre en el navegador
- **Sin almacenamiento externo**: Los datos no salen del sistema
- **Transparente**: El equipo sabe que se está realizando análisis de sentimientos

## 📈 Métricas Disponibles

### Generales
- Tarjetas totales vs analizadas
- Distribución de sentimientos (positivo/neutral/negativo)
- Confianza promedio del análisis
- Sentimiento dominante del equipo

### Por Sección
- Porcentaje de cada sentimiento por columna
- Número de tarjetas por sección
- Identificación de áreas problemáticas
- Visualización de progreso por área

### Insights Automáticos
- Hasta 4 insights priorizados por severidad
- Recomendaciones accionables destacadas
- Detección de patrones positivos
- Alertas de problemas críticos

## 🎯 Casos de Uso

1. **Retrospectivas difíciles**: Identificar áreas de tensión antes de la discusión
2. **Seguimiento de mejora**: Comparar estado de ánimo entre sprints
3. **Detección temprana**: Identificar burnout o problemas de equipo
4. **Celebración de éxitos**: Reconocer cuando el equipo está floreciendo
5. **Reporting a management**: Datos objetivos sobre bienestar del equipo

---

*Esta funcionalidad complementa el análisis de sentimientos individual de las tarjetas, proporcionando una vista agregada y accionable del bienestar emocional del equipo durante las retrospectivas.*
