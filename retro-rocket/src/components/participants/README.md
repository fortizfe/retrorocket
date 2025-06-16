# Componentes de Participantes

Este directorio contiene los componentes reutilizables para mostrar y gestionar participantes en RetroRocket.

## Componentes

### `UserAvatar`
Renderiza el avatar de un usuario individual.

**Props:**
- `user`: Objeto con `name` y `photoURL` (opcional)
- `size`: 'sm' | 'md' | 'lg' (por defecto: 'md')
- `showName`: boolean para mostrar el nombre junto al avatar
- `className`: clases CSS adicionales

**Uso:**
```tsx
<UserAvatar 
  user={{ name: "Juan Pérez", photoURL: "..." }} 
  size="md" 
  showName={true} 
/>
```

### `CompactAvatarGroup`
Muestra un grupo compacto de avatares con contador.

**Props:**
- `participants`: Array de participantes
- `maxVisible`: Número máximo de avatares visibles (por defecto: 5)
- `size`: 'sm' | 'md' | 'lg'
- `showCount`: boolean para mostrar contador con icono
- `onShowAll`: Callback cuando se hace clic para ver todos
- `className`: clases CSS adicionales

**Uso:**
```tsx
<CompactAvatarGroup 
  participants={participants} 
  maxVisible={3} 
  onShowAll={() => setShowModal(true)} 
/>
```

### `ParticipantList`
Lista completa de participantes con información detallada.

**Props:**
- `participants`: Array de participantes
- `className`: clases CSS adicionales
- `maxHeight`: altura máxima del contenedor (por defecto: 'max-h-64')

**Uso:**
```tsx
<ParticipantList 
  participants={participants} 
  maxHeight="max-h-80" 
/>
```

### `ParticipantPopover`
Popover que contiene la lista de participantes.

**Props:**
- `participants`: Array de participantes
- `isOpen`: boolean para controlar visibilidad
- `onClose`: Callback para cerrar
- `children`: Elemento trigger
- `position`: 'top' | 'bottom' | 'left' | 'right'
- `className`: clases CSS adicionales

**Uso:**
```tsx
<ParticipantPopover 
  participants={participants}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
>
  <button>Ver participantes</button>
</ParticipantPopover>
```

### `ResponsiveParticipantDisplay`
Componente responsivo que combina `CompactAvatarGroup` y `ParticipantPopover`.
Ajusta automáticamente el número de avatares visibles según el tamaño de pantalla.

**Props:**
- `participants`: Array de participantes
- `className`: clases CSS adicionales

**Breakpoints:**
- < 640px (sm): 2 avatares visibles
- < 768px (md): 3 avatares visibles
- < 1024px (lg): 4 avatares visibles
- >= 1024px: 5 avatares visibles

**Uso:**
```tsx
<ResponsiveParticipantDisplay participants={participants} />
```

## Características

- **Responsive**: Se adapta automáticamente a diferentes tamaños de pantalla
- **Accesible**: Incluye atributos ARIA y soporte para teclado
- **Mobile-first**: Optimizado para dispositivos móviles
- **Dark mode**: Compatible con modo oscuro
- **Modular**: Componentes reutilizables e independientes

## Integración

Los componentes están integrados en `RetrospectiveBoard` y reemplazan la visualización anterior de participantes, proporcionando una experiencia más rica y escalable.
