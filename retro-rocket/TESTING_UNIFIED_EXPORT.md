# 🧪 GUÍA DE TESTING: SISTEMA DE EXPORTACIÓN UNIFICADO

## 📋 PLAN DE PRUEBAS COMPLETO

### 🎯 OBJETIVO
Verificar que el sistema de exportación unificado funciona correctamente en todos los escenarios posibles.

### 🚀 PREPARACIÓN DEL ENTORNO

#### **1. Iniciar el Servidor de Desarrollo**
```bash
cd /Users/fortizfe/Repositories/retrorocket/retro-rocket
npm run dev
```

#### **2. Crear Retrospectiva de Prueba**
1. Navegar a la aplicación
2. Crear nueva retrospectiva
3. Agregar tarjetas diversas:
   - Tarjetas con caracteres especiales (español)
   - Tarjetas con emojis
   - Tarjetas en diferentes columnas
   - Tarjetas con votos y likes

### 📱 TESTING DE INTERFAZ

#### **✅ Test 1: Visualización de Botones**
**Objetivo**: Verificar que los botones de exportación se muestran correctamente

**Pasos**:
1. Abrir retrospectiva con tarjetas
2. Verificar en header superior derecho
3. Confirmar presencia de:
   - Botón PDF con ícono
   - Botón DOCX/Word con ícono  
   - Botón de configuración (engranaje)

**Resultado Esperado**:
- ✅ Botones visibles en pantallas medianas/grandes
- ✅ Responsive: ocultos en móvil, visibles en desktop
- ✅ Iconos correctos y textos legibles

#### **✅ Test 2: Exportación Rápida PDF**
**Objetivo**: Verificar exportación directa a PDF

**Pasos**:
1. Click en botón "PDF"
2. Observar indicador de carga
3. Esperar descarga automática

**Resultado Esperado**:
- ✅ Spinner aparece en botón PDF
- ✅ Archivo PDF se descarga automáticamente
- ✅ Contenido del PDF incluye tarjetas y información básica
- ✅ Caracteres españoles se muestran correctamente

#### **✅ Test 3: Exportación Rápida DOCX**
**Objetivo**: Verificar exportación directa a Word

**Pasos**:
1. Click en botón "Word"
2. Observar indicador de carga  
3. Esperar descarga automática

**Resultado Esperado**:
- ✅ Spinner aparece en botón DOCX
- ✅ Archivo .docx se descarga automáticamente
- ✅ Archivo se abre correctamente en Word
- ✅ Formato profesional con tablas y colores

### 🔧 TESTING DE CONFIGURACIÓN AVANZADA

#### **✅ Test 4: Apertura del Modal**
**Objetivo**: Verificar funcionamiento del modal de configuración

**Pasos**:
1. Click en botón de configuración (engranaje)
2. Verificar apertura del modal

**Resultado Esperado**:
- ✅ Modal se abre con animación suave
- ✅ Fondo oscurecido (overlay)
- ✅ Header con título e ícono
- ✅ Botón X para cerrar visible

#### **✅ Test 5: Selección de Formato**
**Objetivo**: Verificar cambio entre formatos

**Pasos**:
1. Abrir modal de configuración
2. Click en tarjeta "PDF"
3. Click en tarjeta "Word (.docx)"
4. Observar cambios visuales

**Resultado Esperado**:
- ✅ Tarjetas se resaltan al seleccionar
- ✅ Borde azul en formato activo
- ✅ Hover effects funcionan
- ✅ Estado se mantiene al cambiar opciones

#### **✅ Test 6: Configuración de Contenido**
**Objetivo**: Verificar toggles de inclusión de contenido

**Pasos**:
1. En modal, probar todos los checkboxes:
   - Incluir logo de RetroRocket
   - Lista de participantes
   - Estadísticas
   - Autores de tarjetas
   - Likes y reacciones
   - Detalles de agrupaciones

**Resultado Esperado**:
- ✅ Todos los checkboxes responden al click
- ✅ Estados se mantienen correctamente
- ✅ Labels descriptivos y claros

#### **✅ Test 7: Opciones de Ordenamiento**
**Objetivo**: Verificar radio buttons de ordenamiento

**Pasos**:
1. Probar cada opción de ordenamiento:
   - Orden original
   - Alfabético
   - Por votos
   - Por likes

**Resultado Esperado**:
- ✅ Solo una opción seleccionada a la vez
- ✅ Descripciones claras para cada opción
- ✅ Selección visual clara

#### **✅ Test 8: Título Personalizado**
**Objetivo**: Verificar campo de texto personalizable

**Pasos**:
1. Modificar el título personalizado
2. Probar diferentes textos
3. Incluir caracteres especiales

**Resultado Esperado**:
- ✅ Campo de texto editable
- ✅ Acepta caracteres especiales y acentos
- ✅ Placeholder informativo

#### **✅ Test 9: Notas del Facilitador**
**Objetivo**: Verificar funcionalidad de notas adicionales

**Pasos**:
1. Activar checkbox "Agregar notas del facilitador"
2. Escribir texto en el textarea
3. Desactivar y reactivar

**Resultado Esperado**:
- ✅ Textarea aparece/desaparece según checkbox
- ✅ Texto se mantiene al alternar
- ✅ Placeholder descriptivo

### 📄 TESTING DE EXPORTACIÓN CONFIGURADA

#### **✅ Test 10: Exportación PDF Configurada**
**Objetivo**: Verificar exportación PDF con opciones personalizadas

**Pasos**:
1. Configurar opciones específicas:
   - Título personalizado: "Mi Retrospectiva Test"
   - Incluir participantes: ✅
   - Incluir estadísticas: ✅
   - Ordenamiento: Por votos
2. Click "Exportar"

**Resultado Esperado**:
- ✅ PDF con título personalizado
- ✅ Lista de participantes incluida
- ✅ Estadísticas visibles
- ✅ Tarjetas ordenadas por votos

#### **✅ Test 11: Exportación DOCX Configurada**
**Objetivo**: Verificar exportación Word con configuración completa

**Pasos**:
1. Seleccionar formato DOCX
2. Configurar:
   - Todos los contenidos activados
   - Notas del facilitador: "Excelente sesión de retrospectiva"
   - Ordenamiento: Alfabético
3. Exportar

**Resultado Esperado**:
- ✅ Documento Word profesional
- ✅ Todas las secciones incluidas
- ✅ Notas del facilitador al final
- ✅ Tarjetas en orden alfabético

### 🎨 TESTING DE EXPERIENCIA DE USUARIO

#### **✅ Test 12: Indicadores de Progreso**
**Objetivo**: Verificar feedback visual durante exportación

**Pasos**:
1. Iniciar exportación de archivo grande
2. Observar indicadores visuales

**Resultado Esperado**:
- ✅ Spinner en botón específico (PDF/DOCX)
- ✅ Modal se cierra automáticamente
- ✅ No múltiples exportaciones simultáneas

#### **✅ Test 13: Manejo de Errores**
**Objetivo**: Verificar comportamiento ante errores

**Pasos**:
1. Intentar exportar sin conexión
2. Verificar mensajes de error

**Resultado Esperado**:
- ✅ Mensaje de error claro
- ✅ Botones se reactivan tras error
- ✅ Estado se resetea correctamente

#### **✅ Test 14: Accesibilidad**
**Objetivo**: Verificar navegación por teclado

**Pasos**:
1. Usar solo teclado para navegar
2. Tab a través de todos los controles
3. Usar Enter/Space para activar

**Resultado Esperado**:
- ✅ Focus visible en todos los elementos
- ✅ Orden lógico de tabulación
- ✅ Atajos de teclado funcionan
- ✅ Screen readers pueden leer contenido

### 📱 TESTING RESPONSIVE

#### **✅ Test 15: Móvil**
**Objetivo**: Verificar funcionamiento en dispositivos móviles

**Pasos**:
1. Reducir ventana a tamaño móvil
2. Verificar botones de exportación

**Resultado Esperado**:
- ✅ Botones ocultos en pantallas pequeñas
- ✅ Funcionalidad disponible en menú móvil (si existe)

#### **✅ Test 16: Tablet**
**Objetivo**: Verificar funcionamiento en tablets

**Pasos**:
1. Probar en resolución de tablet
2. Verificar modal y controles

**Resultado Esperado**:
- ✅ Modal se adapta correctamente
- ✅ Botones mantienen usabilidad
- ✅ Touch interactions funcionan

### 🔍 TESTING DE CONTENIDO

#### **✅ Test 17: Caracteres Especiales**
**Objetivo**: Verificar manejo de caracteres especiales

**Pasos**:
1. Crear tarjetas con:
   - Acentos: "ñáéíóú"
   - Símbolos: "€$@#%"
   - Emojis: "🎯🚀✅"
2. Exportar en ambos formatos

**Resultado Esperado**:
- ✅ PDF: Caracteres se convierten correctamente
- ✅ DOCX: Caracteres se preservan
- ✅ No símbolos extraños o corrupción

#### **✅ Test 18: Contenido Extenso**
**Objetivo**: Verificar manejo de retrospectivas grandes

**Pasos**:
1. Crear retrospectiva con 50+ tarjetas
2. Múltiples grupos y participantes
3. Exportar

**Resultado Esperado**:
- ✅ Exportación completa sin errores
- ✅ Todas las tarjetas incluidas
- ✅ Formato mantenido correctamente

### 📊 CHECKLIST DE VALIDACIÓN

#### **✅ Funcionalidad Core**
- [ ] Botones de exportación rápida funcionan
- [ ] Modal de configuración se abre/cierra
- [ ] Opciones se guardan correctamente
- [ ] Archivos se descargan automáticamente

#### **✅ Configuración**
- [ ] Selección de formato funciona
- [ ] Checkboxes responden correctamente
- [ ] Radio buttons de ordenamiento funcionan
- [ ] Campos de texto editable

#### **✅ Exportación**
- [ ] PDF con configuración predeterminada
- [ ] DOCX con configuración predeterminada
- [ ] PDF con configuración personalizada
- [ ] DOCX con configuración personalizada

#### **✅ Experiencia de Usuario**
- [ ] Indicadores de progreso
- [ ] Manejo de errores
- [ ] Accesibilidad completa
- [ ] Responsive design

#### **✅ Contenido**
- [ ] Caracteres especiales
- [ ] Contenido extenso
- [ ] Múltiples idiomas
- [ ] Emojis y símbolos

### 🎯 CRITERIOS DE ÉXITO

**✅ PASA** si todos los tests básicos funcionan:
- Exportación rápida PDF/DOCX
- Modal de configuración
- Opciones básicas funcionan
- Archivos se descargan correctamente

**⚠️ CONDICIONAL** si hay issues menores:
- Problemas de estilo visual
- Errores de caracteres específicos
- Issues de responsive menor

**❌ FALLA** si hay problemas críticos:
- No se pueden descargar archivos
- Modal no se abre
- Errores de JavaScript/TypeScript
- Exportación corrupta

### 📝 REPORTE DE TESTING

Usar este template para documentar resultados:

```markdown
## REPORTE DE TESTING - [FECHA]

### ✅ TESTS EXITOSOS
- Test 1: ✅ Descripción del éxito
- Test 2: ✅ Descripción del éxito

### ⚠️ ISSUES ENCONTRADOS
- Test X: ⚠️ Descripción del problema
- Severidad: Baja/Media/Alta
- Workaround: [Si existe]

### ❌ TESTS FALLIDOS
- Test Y: ❌ Descripción del fallo
- Error: [Mensaje de error]
- Pasos para reproducir: [Lista]

### 🎯 RESUMEN
- Tests Pasados: X/18
- Issues Menores: X
- Fallos Críticos: X
- Estado General: ✅ Listo / ⚠️ Requiere Fixes / ❌ No Listo
```

### 🚀 TESTING AUTOMATIZADO (FUTURO)

```bash
# Comandos para testing automatizado
npm run test:unit          # Tests unitarios
npm run test:integration   # Tests de integración  
npm run test:e2e          # Tests end-to-end
npm run test:accessibility # Tests de accesibilidad
```

**🎉 SISTEMA LISTO PARA TESTING COMPLETO**
