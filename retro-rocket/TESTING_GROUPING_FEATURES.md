# 🚀 Guía de Pruebas - Sistema de Agrupación de Tarjetas

## 📋 Lista de Verificación para Pruebas

### 1. **Preparación del Entorno**
- ✅ Aplicación corriendo en http://localhost:3000
- ✅ Firebase configurado y conectado
- ✅ Al menos una retrospectiva creada

### 2. **Pruebas de Agrupación Manual**

#### Crear Grupo Manualmente
1. **Ir a una retrospectiva** con varias tarjetas en una columna
2. **Hacer clic en el ícono de "Users"** en el header de la columna
3. **Seleccionar 2 o más tarjetas** haciendo clic en ellas
4. **Verificar indicadores visuales**:
   - ✅ Tarjetas seleccionadas tienen borde azul
   - ✅ Contador muestra "X tarjetas seleccionadas"
   - ✅ Botón "Crear Grupo" se habilita
5. **Hacer clic en "Crear Grupo"**
6. **Verificar resultado**:
   - ✅ Grupo creado con tarjeta principal marcada
   - ✅ Líneas de conexión visibles
   - ✅ Modo selección se desactiva

#### Interacciones con Grupos
1. **Expandir/Colapsar grupo**:
   - ✅ Clic en chevron funciona
   - ✅ Animación suave
   - ✅ Estado persiste al recargar
2. **Estadísticas agregadas**:
   - ✅ Suma de votos mostrada
   - ✅ Suma de likes mostrada
   - ✅ Contador de tarjetas correcto

### 3. **Pruebas de Agrupación Automática**

#### Generar Sugerencias
1. **Crear 4-6 tarjetas similares** en una columna:
   ```
   "Mejorar la comunicación en el equipo"
   "Falta comunicación entre desarrolladores"
   "Problemas de comunicación con cliente"
   "Comunicación interna deficiente"
   ```
2. **Hacer clic en ícono "Sparkles"** (sugerencias automáticas)
3. **Verificar modal de sugerencias**:
   - ✅ Modal se abre correctamente
   - ✅ Sugerencias aparecen listadas
   - ✅ Puntuación de similitud visible
   - ✅ Razón de agrupación explicada

#### Aceptar/Rechazar Sugerencias
1. **Hacer clic en "Mostrar tarjetas"** (ícono ojo)
2. **Verificar vista previa**:
   - ✅ Tarjetas se muestran
   - ✅ Tarjeta principal marcada
   - ✅ Animación de expand/collapse
3. **Probar acciones**:
   - ✅ "Descartar" remueve sugerencia
   - ✅ "Crear Grupo" acepta y crea grupo
   - ✅ Modal se cierra apropiadamente

### 4. **Pruebas de Gestión de Grupos**

#### Modificar Grupos Existentes
1. **Hover sobre grupo creado**
2. **Verificar aparición del botón X** (disolver grupo)
3. **Hacer clic en X y confirmar**:
   - ✅ Confirmación aparece
   - ✅ Grupo se disuelve correctamente
   - ✅ Tarjetas vuelven a estado individual

#### Interacciones dentro del Grupo
1. **Con grupo expandido**:
   - ✅ Tarjetas individuales siguen siendo interactivas
   - ✅ Votos y likes funcionan normalmente
   - ✅ Edición de contenido disponible
   - ✅ Eliminación de tarjetas funciona

### 5. **Pruebas de Rendimiento y UX**

#### Responsividad y Animaciones
1. **Crear y disolver múltiples grupos**:
   - ✅ Sin lag perceptible
   - ✅ Animaciones suaves
   - ✅ Estado consistente
2. **Probar en diferentes tamaños de pantalla**:
   - ✅ Responsive design funciona
   - ✅ Modal se adapta correctamente

#### Persistencia de Datos
1. **Recargar página** después de crear grupos:
   - ✅ Grupos persisten correctamente
   - ✅ Estado expandido/colapsado se mantiene
   - ✅ Estadísticas siguen siendo correctas

### 6. **Pruebas de Colaboración**

#### Tiempo Real
1. **Abrir retrospectiva en 2 pestañas**
2. **Crear grupo en una pestaña**:
   - ✅ Cambio aparece en tiempo real en otra pestaña
   - ✅ Sin conflictos de estado
   - ✅ Animaciones sincronizadas

## 🐛 Problemas Conocidos a Verificar

### Casos Edge
- [ ] **Grupo con 1 sola tarjeta**: No debería permitirse
- [ ] **Tarjetas en columnas diferentes**: No deberían agruparse
- [ ] **Eliminar tarjeta principal**: ¿Se promueve otra o se disuelve?
- [ ] **Conexión perdida**: ¿Estado offline manejado?

### Validaciones de UI
- [ ] **Botones deshabilitados apropiadamente**
- [ ] **Mensajes de error claros**
- [ ] **Loading states visibles**
- [ ] **Feedback de acciones exitosas**

## 📊 Métricas de Éxito

### Funcionalidad
- ✅ **0 errores de consola** durante uso normal
- ✅ **< 2 segundos** para crear/disolver grupos
- ✅ **< 1 segundo** para expandir/colapsar
- ✅ **100% persistencia** de estado

### Experiencia de Usuario
- ✅ **Intuitivo** sin documentación
- ✅ **Feedback visual claro** en cada acción
- ✅ **Recuperación de errores** elegante
- ✅ **Responsive** en todos los dispositivos

## 🎯 Escenarios de Uso Real

### Retrospectiva Típica
1. **15-20 tarjetas por columna**
2. **3-4 temas principales** identificables
3. **Facilitador agrupa manualmente** primero
4. **Sugerencias automáticas** para tarjetas restantes
5. **Discusión enfocada** por grupos

### Retrospectiva Grande
1. **30+ tarjetas por columna**
2. **Sugerencias automáticas primero** para reducir volumen
3. **Refinamiento manual** de grupos sugeridos
4. **Múltiples niveles** de organización

---

## ✅ CHECKLIST DE COMPLETITUD

- [x] **Agrupación manual funcional**
- [x] **Sugerencias automáticas implementadas**
- [x] **UI/UX pulida y responsiva**
- [x] **Persistencia en Firestore**
- [x] **Tiempo real funcionando**
- [x] **Sin errores de compilación**
- [x] **Documentación completa**

**Estado: LISTO PARA PRUEBAS DE USUARIO** 🚀
