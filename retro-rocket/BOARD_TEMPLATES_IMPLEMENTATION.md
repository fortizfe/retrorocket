# Implementación de Plantillas de Tableros - RetroRocket

## 📐 Resumen de la implementación

Esta implementación añade la funcionalidad de creación de tableros a partir de plantillas en RetroRocket, manteniendo el look & feel actual y siendo 100% responsive e internacionalizada.

## 🎯 Características implementadas

### ✅ Plantillas disponibles
1. **Default** → Columnas actuales del producto (Qué ayudó, Qué retrasó, Qué mejorar)
2. **Mad‑Sad‑Glad** → Mad, Sad, Glad  
3. **Start‑Stop‑Continue** → Start, Stop, Continue

**Importante**: Todas las plantillas incluyen automáticamente la columna "Elementos de acción" al final (derecha) con su comportamiento actual.

### ✅ UI y UX
- **Flujo de creación en 2 pasos**: selección de plantilla → nombre del tablero
- **Fichas de plantilla** con título, descripción y preview esquemática
- **Selección por radio buttons** accesible y navegable por teclado
- **100% responsive** con diseño adaptativo móvil/escritorio
- **Soporte para modo claro/oscuro** con buenos contrastes

### ✅ Internacionalización (i18n)
Todas las cadenas están en `es.json` y `en.json`:

```javascript
// Claves de plantillas
"boardTemplates": {
  "default": { "name": "...", "description": "..." },
  "madSadGlad": { "name": "...", "description": "..." },
  "startStopContinue": { "name": "...", "description": "..." }
}

// Claves de columnas
"columns": {
  "helped": "Qué me ayudó",
  "hindered": "Qué me retrasó", 
  "improve": "Qué podemos hacer mejor",
  "mad": "Mad",
  "sad": "Sad",
  "glad": "Glad",
  "start": "Start",
  "stop": "Stop", 
  "continue": "Continue",
  "actionItems": "Elementos de Acción"
}

// Claves del flujo de creación
"createBoard": {
  "selectTemplate": { "title": "...", "choose": "..." },
  "next": "Siguiente",
  "create": "Crear",
  "back": "Atrás"
}
```

## 🧱 Arquitectura implementada

### 1. Sistema de plantillas (`src/templates/boardTemplates.ts`)
```typescript
export type TemplateId = 'default' | 'madSadGlad' | 'startStopContinue';

export interface BoardTemplate {
  id: TemplateId;
  i18nNameKey: string;
  i18nDescriptionKey: string;
  columns: ColumnDef[];  // NO incluye la columna de acción
}

export const ACTION_COLUMN: ColumnDef = {
  id: 'actionItems',
  i18nKey: 'columns.actionItems',
  type: 'action'
};

// La columna de acción se añade automáticamente por composición
export const getTemplateColumns = (templateId: TemplateId): ColumnDef[]
```

### 2. Componente selector (`src/components/create-board/BoardTemplateSelector.tsx`)
- Grid responsive de fichas seleccionables
- Radio buttons reales para accesibilidad
- Preview visual de las columnas con la de acción fantasma
- Navegación por teclado (Enter/Espacio)

### 3. Función de creación (`src/features/boards/createBoardFromTemplate.ts`)
```typescript
export async function createBoardFromTemplate(params: CreateBoardParams): Promise<{ boardId: string }>
```
- Función pura y testeable
- Resuelve columnas desde plantillas y concatena ACTION_COLUMN
- Persiste en Firestore con estructura:
  - `/retrospectives/{boardId}`: metadatos incluyendo `templateId`
  - `/retrospectives/{boardId}/columns/{columnId}`: configuración de columnas

### 4. Flujo de creación (`src/components/create-board/CreateBoardFlow.tsx`)
- Modal de 2 pasos con navegación fluida
- Integración con sistema de participantes existente
- Manejo de errores y feedback al usuario

## 🔒 Compatibilidad con sistema existente

- **Mantiene todas las reglas de permisos**: solo facilitador gestiona elementos de acción
- **Preserva estructura de datos**: compatible con exportaciones y funcionalidades existentes
- **No rompe tableros existentes**: migración gradual sin afectar retrospectivas activas

## 🧪 Testing

### Tests implementados
- ✅ **Unit tests de plantillas**: verificación de estructura y funciones auxiliares
- ✅ **Unit tests de BoardTemplateSelector**: rendering, selección, accesibilidad
- ⚠️ **Tests de creación**: mocks de Firebase necesitan ajustes

### Pruebas manuales
1. Crear tablero con cada plantilla
2. Verificar que aparece columna de acción al final
3. Probar en modo claro/oscuro
4. Verificar responsive en móvil/tablet/escritorio
5. Comprobar traducciones ES/EN

## 🔁 Extensibilidad

### Para añadir nuevas plantillas:
1. **Añadir entrada** en `BOARD_TEMPLATES`:
```typescript
newTemplate: {
  id: 'newTemplate',
  i18nNameKey: 'boardTemplates.newTemplate.name',
  i18nDescriptionKey: 'boardTemplates.newTemplate.description',
  columns: [/* definir columnas */]
}
```

2. **Añadir traducciones** en `es.json` y `en.json`:
```json
{
  "boardTemplates": {
    "newTemplate": {
      "name": "Nueva Plantilla",
      "description": "Descripción de la nueva plantilla"
    }
  },
  "columns": {
    "newColumn": "Nueva Columna"
  }
}
```

3. **El preview se genera automáticamente** basado en `columns.length`

## 📁 Archivos creados/modificados

### Nuevos archivos:
- `src/templates/boardTemplates.ts` - Sistema de plantillas
- `src/components/create-board/BoardTemplateSelector.tsx` - Selector de plantillas
- `src/components/create-board/CreateBoardFlow.tsx` - Flujo de creación modal
- `src/features/boards/createBoardFromTemplate.ts` - Lógica de creación
- `src/test/templates/boardTemplates.test.ts` - Tests de plantillas
- `src/test/components/BoardTemplateSelector.test.tsx` - Tests del selector

### Archivos modificados:
- `src/pages/Dashboard.tsx` - Integración del nuevo flujo
- `src/locales/es.json` - Traducciones en español
- `src/locales/en.json` - Traducciones en inglés

## ✅ Criterios de aceptación cumplidos

- ✅ Puedo crear un tablero eligiendo cualquiera de las 3 plantillas
- ✅ La columna "Elementos de acción" aparece siempre a la derecha con su color por defecto
- ✅ Todos los textos provienen de i18n ES/EN
- ✅ UI coherente con el estilo actual, 100% responsive y accesible
- ✅ Código simple, componetizado, testeable y fácil de extender

## 🚀 Próximos pasos

1. **Ajustar mocks de Firebase** para completar tests de integración
2. **Migrar tableros existentes** para usar el nuevo sistema de columnas (opcional)
3. **Añadir más plantillas** según necesidades del equipo
4. **Implementar plantillas personalizadas** para usuarios avanzados
