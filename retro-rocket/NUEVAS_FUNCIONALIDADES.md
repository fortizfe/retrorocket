# Nuevas Funcionalidades de Tarjetas - RetroRocket 🚀

## 📋 Funcionalidades Implementadas

### 1. Sistema de "Me gusta" (Likes) ❤️

- **Un like por usuario**: Cada usuario puede dar solo un "me gusta" por tarjeta
- **Contador dinámico**: Se muestra el número total de likes en tiempo real
- **Persistencia en Firestore**: Se registra quién dio like (userId y username)
- **Toggle functionality**: Hacer click nuevamente quita el like

**Estructura de datos:**
```typescript
interface Like {
  userId: string;
  username: string;
  timestamp: Date;
}
```

### 2. Reacciones con Emojis 😄

- **8 emojis disponibles**: 👍, ❤️, 😂, 😮, 😢, 😡, 🎉, 🤔
- **Una reacción por usuario**: Cada usuario puede tener solo una reacción activa por tarjeta
- **Cambio de reacción**: Seleccionar otro emoji cambia la reacción actual
- **Agrupadas y contadas**: Las reacciones se muestran agrupadas con contador
- **Tooltip informativo**: Muestra quién reaccionó con cada emoji

**Estructura de datos:**
```typescript
interface Reaction {
  userId: string;
  username: string;
  emoji: EmojiReaction;
  timestamp: Date;
}

interface GroupedReaction {
  emoji: EmojiReaction;
  count: number;
  users: string[];
}
```

### 3. Drag & Drop para Reordenamiento 🖱️

- **Reordenamiento fluido**: Arrastra y suelta tarjetas dentro de columnas
- **Persistencia automática**: El orden se guarda en Firestore
- **Sincronización en tiempo real**: Cambios se reflejan inmediatamente en todas las sesiones
- **Indicadores visuales**: Feedback visual durante el arrastre
- **Campo `order`**: Cada tarjeta tiene un número de orden para mantener posición

**Tecnología utilizada:**
- `@dnd-kit/core` - Motor principal de drag and drop
- `@dnd-kit/sortable` - Funcionalidad de ordenamiento
- `@dnd-kit/utilities` - Utilidades CSS para transformaciones

## 🏗️ Arquitectura de Componentes

### Componentes Nuevos

1. **`LikeButton.tsx`** - Botón de me gusta con animaciones
2. **`EmojiReactions.tsx`** - Selector y visualizador de reacciones
3. **`DragDropColumn.tsx`** - Contenedor con funcionalidad drag & drop
4. **`SortableCard.tsx`** - Wrapper para tarjetas con capacidad de ordenamiento
5. **`DraggableCard.tsx`** - Versión mejorada de RetrospectiveCard

### Servicios Nuevos

1. **`cardInteractionService.ts`** - Manejo de likes, reacciones y reordenamiento

### Utilidades

1. **`cardHelpers.ts`** - Funciones auxiliares para manejo de reacciones y ordenamiento

## 🗄️ Estructura de Datos en Firestore

### Tarjeta Actualizada
```typescript
interface Card {
  id: string;
  content: string;
  column: ColumnType;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  retrospectiveId: string;
  votes?: number; // Mantenido para compatibilidad
  likes?: Like[]; // ✨ NUEVO
  reactions?: Reaction[]; // ✨ NUEVO
  order?: number; // ✨ NUEVO
}
```

## 🎯 Flujo de Datos

### Likes
1. Usuario hace click en botón de like
2. `toggleLike()` verifica si el usuario ya dio like
3. Si ya existe, lo elimina; si no, lo añade
4. Firestore se actualiza con `arrayUnion`/`arrayRemove`
5. Subscription en tiempo real actualiza la UI

### Reacciones
1. Usuario selecciona emoji del picker
2. `addOrUpdateReaction()` elimina reacción previa del usuario (si existe)
3. Añade la nueva reacción
4. UI se actualiza mostrando reacciones agrupadas

### Drag & Drop
1. Usuario arrastra tarjeta
2. `onDragEnd` calcula nueva posición
3. `batchUpdateCardOrder()` actualiza múltiples tarjetas si es necesario
4. Firestore se actualiza con nuevos valores de `order`
5. Subscription sincroniza cambios en tiempo real

## 🚀 Uso y Configuración

### Instalación de Dependencias
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Uso del Hook `useCards`
```typescript
const {
  cards,
  cardsByColumn,
  toggleLike,
  addReaction,
  removeReaction,
  reorderCards,
  getGroupedReactions,
  getUserLiked,
  getUserReaction
} = useCards(retrospectiveId);
```

### Implementación en Componentes
```typescript
// Likes
<LikeButton
  cardId={card.id}
  likesCount={card.likes?.length || 0}
  isLiked={getUserLiked(card.id, currentUser)}
  onToggleLike={() => toggleLike(card.id, currentUser, currentUser)}
/>

// Reacciones
<EmojiReactions
  cardId={card.id}
  groupedReactions={getGroupedReactions(card.id)}
  userReaction={getUserReaction(card.id, currentUser)}
  onAddReaction={(emoji) => addReaction(card.id, currentUser, currentUser, emoji)}
  onRemoveReaction={() => removeReaction(card.id, currentUser)}
/>

// Drag & Drop
<DragDropColumn
  cards={cards}
  column={column.id}
  onCardsReorder={reorderCards}
  // ... otras props
/>
```

## 🔒 Restricciones y Validaciones

1. **Un like por usuario por tarjeta** - Validado tanto en frontend como backend
2. **Una reacción por usuario por tarjeta** - Reemplaza reacción anterior automáticamente
3. **Orden secuencial** - Las tarjetas mantienen orden numérico secuencial
4. **Permisos de edición** - Solo el creador puede editar/eliminar tarjetas
5. **Validación de emojis** - Solo emojis predefinidos son aceptados

## 🎨 Características UX/UI

- **Animaciones fluidas** con Framer Motion
- **Feedback visual** durante interacciones
- **Estados de loading** para operaciones asíncronas
- **Tooltips informativos** para mostrar usuarios que reaccionaron
- **Diseño responsive** compatible con móviles
- **Indicadores de drag** para mejorar usabilidad

## 🔄 Sincronización en Tiempo Real

Todas las funcionalidades utilizan `onSnapshot` de Firestore para mantener sincronización automática entre:
- Múltiples usuarios en la misma retrospectiva
- Diferentes dispositivos del mismo usuario
- Cambios realizados por otros participantes

## 📈 Escalabilidad

El código está diseñado para escalar:
- **Componentes modulares** y reutilizables
- **Hooks personalizados** para lógica de negocio
- **Servicios separados** para diferentes responsabilidades
- **Tipos TypeScript** bien definidos
- **Manejo de errores** robusto
- **Optimizaciones de rendimiento** con `useMemo` y `useCallback`
