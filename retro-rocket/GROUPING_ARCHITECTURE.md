# 🧩 Sistema de Agrupación de Tarjetas - Diseño Arquitectónico

## 📊 ESTRUCTURA DE DATOS EN FIRESTORE

### Modelo de Datos Propuesto

```typescript
// Tarjeta Individual (actualizada)
interface Card {
  id: string;
  content: string;
  column: ColumnType;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  retrospectiveId: string;
  color?: CardColor;
  votes?: number;
  likes?: Like[];
  reactions?: Reaction[];
  order: number;
  
  // NUEVO: Campos para agrupación
  groupId?: string;        // ID del grupo al que pertenece (si está agrupada)
  isGroupHead?: boolean;   // Si es la tarjeta principal del grupo
  groupOrder?: number;     // Orden dentro del grupo (para subtarjetas)
}

// Grupo de Tarjetas (nueva entidad)
interface CardGroup {
  id: string;
  retrospectiveId: string;
  column: ColumnType;
  headCardId: string;      // ID de la tarjeta principal
  memberCardIds: string[]; // IDs de las tarjetas miembro
  title?: string;          // Título personalizado del grupo (opcional)
  isCollapsed: boolean;    // Estado de expansión/colapso
  createdAt: Date;
  createdBy: string;
  order: number;           // Orden del grupo en la columna
  
  // Agregaciones calculadas
  totalVotes?: number;     // Suma de votos de todas las tarjetas
  totalLikes?: number;     // Suma de likes de todas las tarjetas
  allReactions?: Reaction[]; // Todas las reacciones del grupo
}

// Sugerencia de Agrupación (temporal, no persistente)
interface GroupSuggestion {
  id: string;
  cardIds: string[];
  similarity: number;      // Puntuación de similitud (0-1)
  reason: string;          // Razón de la sugerencia
  algorithm: 'levenshtein' | 'jaccard' | 'keyword';
}
```

## 🏗️ ARQUITECTURA DE COMPONENTES

### Componentes Principales

```
GroupedRetrospectiveColumn/
├── CardGroup/
│   ├── GroupHeader (tarjeta principal + controles)
│   ├── GroupMembers (tarjetas anidadas)
│   └── GroupActions (expandir/contraer, desagrupar)
├── GroupableCard/ (Card con capacidades de agrupación)
├── GroupSuggestionModal/
├── GroupingControls/
└── SimilarityDetector/ (servicio)
```

## 🔧 ESTRATEGIA DE IMPLEMENTACIÓN

### Fase 1: Estructura Base
1. Actualizar tipos TypeScript
2. Crear servicios de agrupación
3. Implementar componentes básicos

### Fase 2: Agrupación Manual
1. Selección múltiple de tarjetas
2. Creación y gestión de grupos
3. Drag & drop mejorado

### Fase 3: Agrupación Automática
1. Algoritmos de similitud
2. Sistema de sugerencias
3. Interface de revisión

### Fase 4: Optimización
1. Animaciones fluidas
2. Performance optimizada
3. Accesibilidad completa

## 🎯 FLUJO DE TRABAJO

### Agrupación Manual
1. Usuario selecciona múltiples tarjetas (checkbox/multi-select)
2. Botón "Agrupar seleccionadas" aparece
3. Usuario elige tarjeta principal o se auto-asigna
4. Se crea CardGroup en Firestore
5. Tarjetas se actualizan con groupId

### Agrupación Automática
1. Análisis continuo/on-demand de similitud
2. Generación de sugerencias
3. Modal con sugerencias para revisar
4. Usuario acepta/rechaza sugerencias
5. Agrupación automática aplicada

## 🔄 OPERACIONES DE GRUPO

### Crear Grupo
```typescript
async function createGroup(
  headCardId: string, 
  memberCardIds: string[], 
  customTitle?: string
): Promise<string>
```

### Desagrupar
```typescript
async function disbandGroup(groupId: string): Promise<void>
```

### Mover Tarjeta Entre Grupos
```typescript
async function moveCardToGroup(
  cardId: string, 
  fromGroupId: string, 
  toGroupId: string
): Promise<void>
```

### Agregar/Quitar del Grupo
```typescript
async function addCardToGroup(cardId: string, groupId: string): Promise<void>
async function removeCardFromGroup(cardId: string, groupId: string): Promise<void>
```

## 🎨 DISEÑO UI/UX

### Visual del Grupo
```
┌─ [Grupo] Aspectos Positivos (3 tarjetas) ────── [↕] [×] ┐
│  👍 "Gran trabajo en equipo" - Ana (5 votos)            │
│  ├─ 💡 "Colaboración excelente" - Luis (2 votos)       │
│  └─ ✨ "Buena comunicación" - María (1 voto)           │
│                                          Total: 8 votos │
└────────────────────────────────────────────────────────┘
```

### Estados del Grupo
- **Expandido**: Muestra todas las tarjetas con detalles
- **Colapsado**: Muestra solo la tarjeta principal + resumen
- **Seleccionable**: Para mover/desagrupar/editar

## 📈 ALGORITMOS DE SIMILITUD

### Algoritmo Simple (Fase 1)
```typescript
function calculateSimilarity(text1: string, text2: string): number {
  // Combinación de:
  // 1. Levenshtein distance normalizada
  // 2. Jaccard similarity de palabras
  // 3. Detección de keywords comunes
}
```

### Heurísticas Básicas
- Tarjetas con >70% similitud textual
- Tarjetas que comparten 3+ palabras clave
- Tarjetas con mismos patrones (emojis, formatos)
- Tarjetas creadas por el mismo usuario consecutivamente

## 🚀 BENEFICIOS ESPERADOS

### Para Facilitadores
- ✅ Retrospectivas más organizadas
- ✅ Identificación rápida de temas recurrentes
- ✅ Mejor gestión de tarjetas duplicadas
- ✅ Votación y priorización por grupos

### Para Equipos
- ✅ Discusiones más enfocadas
- ✅ Eliminación de redundancia
- ✅ Mejor comprensión de patrones
- ✅ Retrospectivas más eficientes

## 🎛️ CONFIGURACIÓN Y EXTENSIBILIDAD

### Configuración del Sistema
```typescript
interface GroupingConfig {
  autoSuggest: boolean;
  similarityThreshold: number;  // 0.7 por defecto
  maxGroupSize: number;         // 10 por defecto
  allowNestedGroups: boolean;   // false inicialmente
  algorithms: SimilarityAlgorithm[];
}
```

### Futuras Extensiones
- 🔮 IA/NLP para mejor detección semántica
- 🔮 Grupos anidados (grupos de grupos)
- 🔮 Templates de agrupación por equipo
- 🔮 Análisis histórico de patrones
- 🔮 Export de insights de agrupación

**Status**: 📋 ARQUITECTURA DEFINIDA - READY FOR IMPLEMENTATION
