# Mejora de Bloqueo de Scroll para Emoji Pickers

## Problema Resuelto

Cuando se abría la lista de emoticonos (tanto en `EmojiReactions` como en `EmojiPicker`), la pantalla principal seguía respondiendo al scroll, lo que ocasionaba que el fondo se moviera mientras el usuario interactuaba con los emoticonos.

## Solución Implementada

Se ha creado un hook personalizado `useBodyScrollLock` que bloquea automáticamente el scroll del body cuando los pickers de emoticonos están abiertos.

### Archivos Modificados

1. **Nuevo Hook**: `src/hooks/useBodyScrollLock.ts`
   - Hook personalizado que bloquea/desbloquea el scroll del body
   - Maneja automáticamente la limpieza al desmontar el componente
   - Proporciona una función `restoreScroll()` para restaurar manualmente el scroll

2. **EmojiReactions**: `src/components/retrospective/EmojiReactions.tsx`
   - Integrado el hook `useBodyScrollLock`
   - Restaura el scroll automáticamente al cerrar el picker
   - Funciona con Escape, click fuera, y selección de emoji

3. **EmojiPicker**: `src/components/ui/EmojiPicker.tsx`
   - Integrado el hook `useBodyScrollLock`
   - Restaura el scroll automáticamente al cerrar el picker
   - Funciona con Escape, click fuera, y selección de emoji

### Características de la Implementación

- ✅ **Bloqueo automático**: Se bloquea el scroll cuando cualquier picker se abre
- ✅ **Restauración automática**: Se restaura el scroll cuando el picker se cierra
- ✅ **Múltiples métodos de cierre**: Funciona con Escape, click fuera, y selección
- ✅ **Limpieza automática**: Se asegura de restaurar el scroll al desmontar componentes
- ✅ **Código reutilizable**: El hook puede usarse en otros componentes similares

### Comportamiento Esperado

1. **Al abrir un picker de emoticonos**: La pantalla de fondo se bloquea automáticamente
2. **Al seleccionar un emoticono**: El picker se cierra y el scroll se restaura
3. **Al presionar Escape**: El picker se cierra y el scroll se restaura
4. **Al hacer click fuera**: El picker se cierra y el scroll se restaura
5. **Al cambiar de página**: El scroll se restaura automáticamente

### Beneficios

- **Mejor UX**: Los usuarios pueden interactuar con los emoticonos sin distracciones
- **Comportamiento consistente**: Funciona igual en todos los pickers de emoticonos
- **Código limpio**: Lógica centralizada en un hook reutilizable
- **Sin efectos secundarios**: Se asegura de limpiar correctamente el estado del scroll
