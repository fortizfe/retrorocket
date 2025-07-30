# Modo Facilitador - Countdown Timer

Esta implementación agrega un **Modo de Facilitador** con controles avanzados de temporizador para RetroRocket.

## 🚀 Funcionalidades Implementadas

### 1. **Componentes Modulares**

- **`CountdownTimer`**: Componente visual que muestra el temporizador a todos los usuarios
- **`FacilitatorControls`**: Panel de control exclusivo para el facilitador (propietario del tablero)
- **`useCountdown`**: Hook personalizado que maneja toda la lógica del temporizador
- **`CountdownService`**: Servicio para las operaciones CRUD del temporizador en Firestore

### 2. **Características del Temporizador**

- ⏱️ **Configuración flexible**: Minutos y segundos
- ▶️ **Controles completos**: Iniciar, pausar, reiniciar, eliminar
- 🎨 **Estados visuales**: En curso (verde), pausado (amarillo), terminado (rojo)
- 📊 **Barra de progreso**: Indicador visual del tiempo transcurrido
- 🔄 **Sincronización en tiempo real**: Todos los usuarios ven el mismo estado
- 🔊 **Notificación de finalización**: Sonido opcional cuando termina el tiempo

### 3. **Seguridad y Permisos**

- 🔒 **Solo el facilitador** (creador del tablero) puede controlar el temporizador
- 👁️ **Todos los usuarios** pueden ver el temporizador en tiempo real
- 🛡️ **Reglas de Firestore** que previenen acceso no autorizado

### 4. **Experiencia de Usuario**

- 📱 **Responsive**: Funciona perfectamente en móvil y escritorio
- 🌙 **Modo oscuro**: Soporte completo para temas claro y oscuro
- ♿ **Accesibilidad**: Navegación por teclado y ARIA labels
- 🎭 **Animaciones suaves**: Transiciones elegantes con Framer Motion

## 📍 Ubicación en la Interfaz

- **Temporizador**: Visible en la cabecera para todos los usuarios
- **Controles de Facilitador**: Panel desplegable debajo de la cabecera (solo para el propietario)

## 🏗️ Arquitectura Técnica

### Estructura de Archivos
```
src/
├── components/countdown/
│   ├── CountdownTimer.tsx       # Visualización del temporizador
│   ├── FacilitatorControls.tsx  # Panel de controles
│   └── index.ts                 # Barrel export
├── hooks/
│   └── useCountdown.ts          # Hook personalizado
├── services/
│   └── countdownService.ts      # Operaciones Firestore
└── types/
    └── countdown.ts             # Tipos TypeScript
```

### Estado en Firestore
```typescript
interface CountdownTimer {
  id: string;                    // ID del retrospective
  retrospectiveId: string;       
  startTime: Date | null;        // Momento de inicio
  duration: number;              // Duración actual en segundos (cambia con pausa)
  originalDuration: number;      // Duración inicial configurada (nunca cambia)
  isRunning: boolean;            // Estado activo
  isPaused: boolean;             // Estado pausado
  endTime: Date | null;          // Momento de finalización
  createdBy: string;             // UID del facilitador
  createdAt: Date;
  updatedAt: Date;
}
```

### Reglas de Seguridad Firestore
```javascript
match /countdown_timers/{retrospectiveId} {
  // Todos pueden leer
  allow read: if request.auth != null;
  
  // Solo el creador puede escribir
  allow create, update, delete: if request.auth.uid == resource.data.createdBy;
}
```

## 🎯 Casos de Uso

1. **Configuración inicial**: El facilitador establece el tiempo deseado
2. **Control de sesiones**: Inicio/pausa durante discusiones
3. **Gestión de timeboxing**: Mantener sesiones dentro de tiempo límite
4. **Eliminación completa**: Remover temporizador cuando no se necesite más
5. **Visibilidad del grupo**: Todos ven el mismo countdown
6. **Flexibilidad**: Pausar para discusiones extendidas
7. **Reinicio correcto**: Volver siempre al tiempo configurado inicialmente (no al último punto de pausa)

## 🔮 Extensibilidad Futura

La arquitectura modular permite fácilmente agregar:
- 🚨 Alertas personalizadas (ej: aviso a los 2 minutos)
- 🎵 Diferentes sonidos de notificación
- 📊 Historial de tiempos de sesión
- ⚡ Temporizadores predefinidos (5min, 10min, etc.)
- 🎯 Múltiples temporizadores simultáneos por etapa
- 📱 Notificaciones push
- 📈 Analytics de tiempo por retrospectiva

## 🧪 Testing

La implementación incluye:
- ✅ Validación de tipos TypeScript
- ✅ Manejo de errores robusto
- ✅ Logging para debugging
- ✅ Fallbacks para casos edge

## 🚀 Deployment

- Las reglas de Firestore deben actualizarse en la consola de Firebase
- No requiere variables de entorno adicionales
- Compatible con el pipeline de CI/CD existente
